/**
 * 🛡️ Adaptive Authentication Engine
 * 
 * المحرك الرئيسي للمصادقة التكيفية
 * يجمع بين تقييم المخاطر والتحقق الإضافي
 */

import { RiskScoreCalculator, getRiskScoreCalculator } from './risk-score-calculator';
import { StepUpAuthManager, getStepUpAuthManager } from './step-up-auth-manager';
import {
    RiskAssessment,
    RiskAction,
    StepUpMethod,
    StepUpResponse,
    LoginContext,
    LoginHistory,
    AdaptiveAuthConfig,
    DEFAULT_ADAPTIVE_AUTH_CONFIG,
} from './types';

export interface AdaptiveAuthResult {
    allowed: boolean;
    riskAssessment: RiskAssessment;
    action: RiskAction;
    stepUpRequired: boolean;
    stepUpMethods?: StepUpMethod[];
    message?: string;
    messageAr?: string;
}

export interface StepUpVerifyResult {
    success: boolean;
    message: string;
    messageAr: string;
    canRetry: boolean;
    remainingAttempts?: number;
}

export class AdaptiveAuthEngine {
    private riskCalculator: RiskScoreCalculator;
    private stepUpManager: StepUpAuthManager;
    private config: AdaptiveAuthConfig;

    constructor(config?: Partial<AdaptiveAuthConfig>) {
        this.config = { ...DEFAULT_ADAPTIVE_AUTH_CONFIG, ...config };
        this.riskCalculator = getRiskScoreCalculator(this.config);
        this.stepUpManager = getStepUpAuthManager(this.config);
    }

    /**
     * Evaluate login attempt and decide on action
     */
    async evaluateLogin(
        context: LoginContext,
        loginHistory: LoginHistory[]
    ): Promise<AdaptiveAuthResult> {
        if (!this.config.enabled) {
            return {
                allowed: true,
                riskAssessment: this.createDefaultAssessment(context),
                action: 'allow',
                stepUpRequired: false,
            };
        }

        // Calculate risk
        const riskAssessment = await this.riskCalculator.calculateRisk(
            context,
            loginHistory
        );

        const result: AdaptiveAuthResult = {
            allowed: riskAssessment.action === 'allow',
            riskAssessment,
            action: riskAssessment.action,
            stepUpRequired: riskAssessment.action === 'step_up',
            stepUpMethods: riskAssessment.stepUpMethods,
        };

        // Add appropriate messages
        switch (riskAssessment.action) {
            case 'allow':
                result.message = 'Login allowed';
                result.messageAr = 'تم السماح بتسجيل الدخول';
                break;

            case 'step_up':
                result.message = 'Additional verification required';
                result.messageAr = 'مطلوب تحقق إضافي';
                break;

            case 'block':
                result.allowed = false;
                result.message = 'Login blocked due to security concerns';
                result.messageAr = 'تم حظر تسجيل الدخول لأسباب أمنية';
                break;

            case 'review':
                result.allowed = false;
                result.message = 'Login requires manual review';
                result.messageAr = 'تسجيل الدخول يتطلب مراجعة يدوية';
                break;
        }

        return result;
    }

    /**
     * Initiate step-up authentication
     */
    async initiateStepUp(
        riskAssessment: RiskAssessment,
        method: StepUpMethod,
        userInfo: {
            userId: string;
            email?: string;
            phone?: string;
        }
    ): Promise<StepUpResponse> {
        return this.stepUpManager.initiateStepUp(
            userInfo.userId,
            method,
            riskAssessment,
            { email: userInfo.email, phone: userInfo.phone }
        );
    }

    /**
     * Verify step-up authentication
     */
    async verifyStepUp(
        sessionId: string,
        code: string,
        method: StepUpMethod
    ): Promise<StepUpVerifyResult> {
        const result = await this.stepUpManager.verifyStepUp(sessionId, code, method);

        return {
            success: result.success,
            message: result.success ? 'Verification successful' : 'Verification failed',
            messageAr: result.success ? 'تم التحقق بنجاح' : 'فشل التحقق',
            canRetry: (result.remainingAttempts ?? 0) > 0,
            remainingAttempts: result.remainingAttempts,
        };
    }

    /**
     * Check if device should be trusted after successful step-up
     */
    shouldTrustDevice(riskAssessment: RiskAssessment): boolean {
        // Trust device if:
        // 1. Risk was medium (not high or critical)
        // 2. Step-up was successful
        // 3. Not from VPN/Tor

        return (
            riskAssessment.level === 'medium' &&
            !riskAssessment.signals.network.isTorOrVPN &&
            !riskAssessment.signals.device.isEmulator
        );
    }

    /**
     * Get human-readable risk summary
     */
    getRiskSummary(assessment: RiskAssessment): {
        title: string;
        titleAr: string;
        reasons: Array<{ message: string; messageAr: string }>;
        recommendation: string;
        recommendationAr: string;
    } {
        const reasons = assessment.reasons.map(r => ({
            message: r.message,
            messageAr: r.messageAr,
        }));

        let title: string;
        let titleAr: string;
        let recommendation: string;
        let recommendationAr: string;

        switch (assessment.level) {
            case 'critical':
                title = 'Critical Risk Detected';
                titleAr = 'تم اكتشاف مخاطر حرجة';
                recommendation = 'Access blocked for security. Contact support.';
                recommendationAr = 'تم حظر الوصول للأمان. تواصل مع الدعم.';
                break;

            case 'high':
                title = 'High Risk Detected';
                titleAr = 'تم اكتشاف مخاطر عالية';
                recommendation = 'Please verify your identity to continue.';
                recommendationAr = 'يرجى التحقق من هويتك للمتابعة.';
                break;

            case 'medium':
                title = 'Unusual Activity Detected';
                titleAr = 'تم اكتشاف نشاط غير معتاد';
                recommendation = 'A quick verification is needed.';
                recommendationAr = 'مطلوب تحقق سريع.';
                break;

            default:
                title = 'Normal Activity';
                titleAr = 'نشاط عادي';
                recommendation = 'Continue with login.';
                recommendationAr = 'تابع تسجيل الدخول.';
        }

        return { title, titleAr, reasons, recommendation, recommendationAr };
    }

    /**
     * Create default (low risk) assessment
     */
    private createDefaultAssessment(context: LoginContext): RiskAssessment {
        return {
            score: 0,
            level: 'low',
            signals: {
                geo: { isNewCountry: false, isNewCity: false, isImpossibleTravel: false },
                device: {
                    isNewDevice: false,
                    fingerprintChanged: false,
                    isEmulator: false,
                    isRooted: false,
                    browserChanged: false,
                    osChanged: false,
                    isTrustedDevice: true,
                },
                timing: {
                    isUnusualTime: false,
                    rapidAttempts: false,
                    attemptCount: 0,
                    isOutsideNormalHours: false,
                },
                network: {
                    isTorOrVPN: false,
                    isDataCenter: false,
                    isKnownBot: false,
                    isKnownMaliciousIP: false,
                    isProxy: false,
                    asnRisk: 'low',
                },
                behavioral: {
                    typingPatternAnomaly: false,
                    mousePatternAnomaly: false,
                    navigationAnomaly: false,
                    sessionAnomaly: false,
                },
            },
            reasons: [],
            action: 'allow',
            sessionId: `default_${Date.now()}`,
            timestamp: new Date(),
        };
    }
}

// Singleton instance
let engineInstance: AdaptiveAuthEngine | null = null;

export function getAdaptiveAuthEngine(
    config?: Partial<AdaptiveAuthConfig>
): AdaptiveAuthEngine {
    if (!engineInstance || config) {
        engineInstance = new AdaptiveAuthEngine(config);
    }
    return engineInstance;
}

export default AdaptiveAuthEngine;

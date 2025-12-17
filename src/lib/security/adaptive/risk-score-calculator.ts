/**
 * 🧮 Risk Score Calculator - حساب نقاط المخاطر
 * 
 * يحسب درجة المخاطر بناءً على إشارات متعددة
 */

import {
    RiskSignals,
    RiskLevel,
    RiskReason,
    RiskAssessment,
    RiskAction,
    LoginContext,
    LoginHistory,
    AdaptiveAuthConfig,
    DEFAULT_ADAPTIVE_AUTH_CONFIG,
    StepUpMethod,
} from './types';

export class RiskScoreCalculator {
    private config: AdaptiveAuthConfig;

    constructor(config?: Partial<AdaptiveAuthConfig>) {
        this.config = { ...DEFAULT_ADAPTIVE_AUTH_CONFIG, ...config };
    }

    /**
     * Calculate risk score from login context and history
     */
    async calculateRisk(
        context: LoginContext,
        history: LoginHistory[]
    ): Promise<RiskAssessment> {
        const signals = await this.collectSignals(context, history);
        const reasons = this.evaluateRiskReasons(signals);
        const score = this.calculateScore(reasons);
        const level = this.determineLevel(score);
        const action = this.determineAction(level);
        const stepUpMethods = action === 'step_up'
            ? this.selectStepUpMethods(level, context)
            : undefined;

        return {
            score,
            level,
            signals,
            reasons,
            action,
            stepUpMethods,
            sessionId: context.sessionId || this.generateSessionId(),
            timestamp: new Date(),
        };
    }

    /**
     * Collect all risk signals
     */
    private async collectSignals(
        context: LoginContext,
        history: LoginHistory[]
    ): Promise<RiskSignals> {
        const lastLogin = history[0];

        return {
            geo: this.analyzeGeoSignals(context, lastLogin),
            device: this.analyzeDeviceSignals(context, history),
            timing: this.analyzeTimingSignals(context, history),
            network: await this.analyzeNetworkSignals(context),
            behavioral: this.analyzeBehavioralSignals(context),
        };
    }

    /**
     * Analyze geographic risk signals
     */
    private analyzeGeoSignals(
        context: LoginContext,
        lastLogin?: LoginHistory
    ): RiskSignals['geo'] {
        const result: RiskSignals['geo'] = {
            isNewCountry: false,
            isNewCity: false,
            isImpossibleTravel: false,
        };

        if (!lastLogin?.geo || !context.geo) {
            return result;
        }

        // Check new country
        result.isNewCountry =
            context.geo.countryCode !== lastLogin.geo.countryCode;

        // Check new city
        result.isNewCity =
            context.geo.city !== lastLogin.geo.city;

        // Check impossible travel
        if (context.geo.lat && context.geo.lng &&
            lastLogin.geo.lat && lastLogin.geo.lng) {
            const distance = this.haversineDistance(
                context.geo.lat, context.geo.lng,
                lastLogin.geo.lat, lastLogin.geo.lng
            );

            const timeDiffHours =
                (context.timestamp.getTime() - lastLogin.timestamp.getTime())
                / (1000 * 60 * 60);

            // Max possible travel speed: 1000 km/h (commercial aircraft)
            const maxPossibleDistance = timeDiffHours * 1000;

            result.distanceFromLastLogin = distance;
            result.travelTimeRequired = distance / 1000; // hours at max speed
            result.actualTimeDiff = timeDiffHours;
            result.isImpossibleTravel = distance > maxPossibleDistance;
        }

        return result;
    }

    /**
     * Analyze device risk signals
     */
    private analyzeDeviceSignals(
        context: LoginContext,
        history: LoginHistory[]
    ): RiskSignals['device'] {
        const knownDevices = new Set(
            history
                .filter(h => h.device?.browser && h.device?.os)
                .map(h => `${h.device?.browser}-${h.device?.os}`)
        );

        const currentDeviceKey = context.device?.browser && context.device?.os
            ? `${context.device.browser}-${context.device.os}`
            : null;

        const isNewDevice = currentDeviceKey
            ? !knownDevices.has(currentDeviceKey)
            : false;

        return {
            isNewDevice,
            fingerprintChanged: false, // Would need fingerprint tracking
            isEmulator: this.detectEmulator(context.userAgent),
            isRooted: false, // Would need client-side detection
            browserChanged: isNewDevice,
            osChanged: isNewDevice,
            isTrustedDevice: !isNewDevice && history.length > 5,
        };
    }

    /**
     * Analyze timing risk signals
     */
    private analyzeTimingSignals(
        context: LoginContext,
        history: LoginHistory[]
    ): RiskSignals['timing'] {
        const now = context.timestamp;
        const hour = now.getHours();

        // Unusual hours: 2 AM - 5 AM
        const isUnusualTime = hour >= 2 && hour <= 5;

        // Check rapid attempts
        const recentAttempts = history.filter(h => {
            const diff = now.getTime() - h.timestamp.getTime();
            return diff < 5 * 60 * 1000; // Last 5 minutes
        });

        const lastAttempt = history[0];
        const timeSinceLastAttempt = lastAttempt
            ? (now.getTime() - lastAttempt.timestamp.getTime()) / 1000
            : undefined;

        // Check normal hours based on history
        const historicalHours = history.map(h => h.timestamp.getHours());
        const avgHour = historicalHours.length > 0
            ? historicalHours.reduce((a, b) => a + b, 0) / historicalHours.length
            : 12;
        const isOutsideNormalHours = Math.abs(hour - avgHour) > 6;

        return {
            isUnusualTime,
            rapidAttempts: recentAttempts.length >= 3,
            attemptCount: recentAttempts.length,
            timeSinceLastAttempt,
            isOutsideNormalHours,
        };
    }

    /**
     * Analyze network risk signals
     */
    private async analyzeNetworkSignals(
        context: LoginContext
    ): Promise<RiskSignals['network']> {
        // Basic analysis based on IP patterns
        // In production, use services like IPinfo, MaxMind, or IP2Location

        const ip = context.ip;

        // Check for known patterns (simplified)
        const isTorOrVPN = this.checkTorVPN(ip);
        const isDataCenter = this.checkDataCenter(ip);
        const isKnownBot = this.checkBotPattern(context.userAgent);

        return {
            isTorOrVPN,
            isDataCenter,
            isKnownBot,
            isKnownMaliciousIP: false, // Would need IP reputation service
            isProxy: isTorOrVPN,
            asnRisk: 'low',
        };
    }

    /**
     * Analyze behavioral risk signals
     */
    private analyzeBehavioralSignals(
        context: LoginContext
    ): RiskSignals['behavioral'] {
        // Would need client-side behavioral data
        // For now, return defaults
        return {
            typingPatternAnomaly: false,
            mousePatternAnomaly: false,
            navigationAnomaly: false,
            sessionAnomaly: false,
        };
    }

    /**
     * Evaluate risk reasons from signals
     */
    private evaluateRiskReasons(signals: RiskSignals): RiskReason[] {
        const reasons: RiskReason[] = [];
        const weights = this.config.weights;

        // Geo signals
        if (signals.geo.isImpossibleTravel) {
            reasons.push({
                code: 'IMPOSSIBLE_TRAVEL',
                message: 'Impossible travel detected',
                messageAr: 'تم اكتشاف سفر مستحيل',
                weight: weights.impossibleTravel,
                category: 'geo',
            });
        } else if (signals.geo.isNewCountry) {
            reasons.push({
                code: 'NEW_COUNTRY',
                message: 'Login from new country',
                messageAr: 'تسجيل دخول من بلد جديد',
                weight: weights.newCountry,
                category: 'geo',
            });
        }

        // Device signals
        if (signals.device.isNewDevice) {
            reasons.push({
                code: 'NEW_DEVICE',
                message: 'New device detected',
                messageAr: 'تم اكتشاف جهاز جديد',
                weight: weights.newDevice,
                category: 'device',
            });
        }

        if (signals.device.isEmulator) {
            reasons.push({
                code: 'EMULATOR_DETECTED',
                message: 'Emulator or virtual machine detected',
                messageAr: 'تم اكتشاف محاكي أو جهاز افتراضي',
                weight: weights.emulator,
                category: 'device',
            });
        }

        // Timing signals
        if (signals.timing.rapidAttempts) {
            reasons.push({
                code: 'RAPID_ATTEMPTS',
                message: 'Multiple rapid login attempts',
                messageAr: 'محاولات تسجيل دخول متعددة وسريعة',
                weight: weights.rapidAttempts,
                category: 'timing',
            });
        }

        if (signals.timing.isUnusualTime) {
            reasons.push({
                code: 'UNUSUAL_TIME',
                message: 'Login at unusual time',
                messageAr: 'تسجيل دخول في وقت غير معتاد',
                weight: weights.unusualTime,
                category: 'timing',
            });
        }

        // Network signals
        if (signals.network.isTorOrVPN) {
            reasons.push({
                code: 'TOR_VPN_DETECTED',
                message: 'VPN or Tor network detected',
                messageAr: 'تم اكتشاف شبكة VPN أو Tor',
                weight: weights.torVPN,
                category: 'network',
            });
        }

        if (signals.network.isDataCenter) {
            reasons.push({
                code: 'DATACENTER_IP',
                message: 'Login from data center IP',
                messageAr: 'تسجيل دخول من عنوان IP مركز بيانات',
                weight: weights.dataCenter,
                category: 'network',
            });
        }

        if (signals.network.isKnownBot) {
            reasons.push({
                code: 'BOT_DETECTED',
                message: 'Bot pattern detected',
                messageAr: 'تم اكتشاف نمط بوت',
                weight: weights.knownBot,
                category: 'network',
            });
        }

        return reasons;
    }

    /**
     * Calculate total risk score
     */
    private calculateScore(reasons: RiskReason[]): number {
        if (reasons.length === 0) return 0;

        // Sum weights with diminishing returns
        const totalWeight = reasons.reduce((sum, r) => sum + r.weight, 0);

        // Cap at 100
        return Math.min(100, totalWeight);
    }

    /**
     * Determine risk level from score
     */
    private determineLevel(score: number): RiskLevel {
        const { thresholds } = this.config;

        if (score >= thresholds.critical) return 'critical';
        if (score >= thresholds.high) return 'high';
        if (score >= thresholds.medium) return 'medium';
        return 'low';
    }

    /**
     * Determine action based on risk level
     */
    private determineAction(level: RiskLevel): RiskAction {
        switch (level) {
            case 'critical':
                return 'block';
            case 'high':
                return 'step_up';
            case 'medium':
                return 'step_up';
            case 'low':
            default:
                return 'allow';
        }
    }

    /**
     * Select appropriate step-up methods
     */
    private selectStepUpMethods(
        level: RiskLevel,
        context: LoginContext
    ): StepUpMethod[] {
        const available = this.config.availableMethods;

        // For critical risk, require strongest methods
        if (level === 'critical') {
            return available.filter(m =>
                m === 'passkey_reauth' || m === 'totp'
            );
        }

        // For high risk, prefer email/SMS
        if (level === 'high') {
            return available.filter(m =>
                m === 'email_otp' || m === 'sms_otp' || m === 'totp'
            );
        }

        // For medium risk, any method works
        return available.slice(0, 2);
    }

    // ============================================
    // Helper Methods
    // ============================================

    private haversineDistance(
        lat1: number, lon1: number,
        lat2: number, lon2: number
    ): number {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    private detectEmulator(userAgent: string): boolean {
        const emulatorPatterns = [
            /android.*sdk/i,
            /emulator/i,
            /simulator/i,
            /sdk_gphone/i,
            /generic.*device/i,
        ];
        return emulatorPatterns.some(p => p.test(userAgent));
    }

    private checkTorVPN(ip: string): boolean {
        // Simplified check - in production, use IP reputation services
        // Known Tor exit node ranges (example)
        return false;
    }

    private checkDataCenter(ip: string): boolean {
        // Simplified check - in production, use IP reputation services
        return false;
    }

    private checkBotPattern(userAgent: string): boolean {
        const botPatterns = [
            /bot/i,
            /crawler/i,
            /spider/i,
            /scraper/i,
            /headless/i,
            /phantom/i,
            /selenium/i,
            /puppeteer/i,
            /playwright/i,
        ];
        return botPatterns.some(p => p.test(userAgent));
    }

    private generateSessionId(): string {
        return `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Singleton instance
let calculatorInstance: RiskScoreCalculator | null = null;

export function getRiskScoreCalculator(
    config?: Partial<AdaptiveAuthConfig>
): RiskScoreCalculator {
    if (!calculatorInstance || config) {
        calculatorInstance = new RiskScoreCalculator(config);
    }
    return calculatorInstance;
}

export default RiskScoreCalculator;

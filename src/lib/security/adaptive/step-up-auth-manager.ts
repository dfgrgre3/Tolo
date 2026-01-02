/**
 * 🚀 Step-Up Authentication Manager
 * 
 * يدير عملية التحقق الإضافي عند اكتشاف مخاطر
 */

import crypto from 'crypto';
import {
    StepUpMethod,
    StepUpRequest,
    StepUpResponse,
    StepUpStatus,
    RiskAssessment,
    AdaptiveAuthConfig,
    DEFAULT_ADAPTIVE_AUTH_CONFIG,
} from './types';
import { logger } from '@/lib/logger';
import { emailService } from '@/lib/services/email-service';
import { smsService } from '@/lib/services/sms-service';
import { prisma } from '@/lib/db';
import { authenticator } from 'otplib';

interface OTPStore {
    code: string;
    expiresAt: Date;
    attempts: number;
    method: StepUpMethod;
    verified: boolean;
}

export class StepUpAuthManager {
    private config: AdaptiveAuthConfig;
    // In production, use Redis or database
    private otpStore = new Map<string, OTPStore>();
    private requestStore = new Map<string, StepUpRequest>();

    constructor(config?: Partial<AdaptiveAuthConfig>) {
        this.config = { ...DEFAULT_ADAPTIVE_AUTH_CONFIG, ...config };
    }

    /**
     * Initiate step-up authentication
     */
    async initiateStepUp(
        userId: string,
        method: StepUpMethod,
        riskAssessment: RiskAssessment,
        contactInfo?: { email?: string; phone?: string }
    ): Promise<StepUpResponse> {
        const sessionId = riskAssessment.sessionId;

        // Check for existing pending request
        const existingRequest = this.requestStore.get(sessionId);
        if (existingRequest && existingRequest.attempts >= existingRequest.maxAttempts) {
            return {
                success: false,
                status: 'failed',
                method,
                message: 'تم تجاوز الحد الأقصى للمحاولات',
                remainingAttempts: 0,
            };
        }

        // Create request
        const request: StepUpRequest = {
            sessionId,
            userId,
            method,
            reason: this.getReasonMessage(riskAssessment),
            riskAssessment,
            expiresAt: new Date(Date.now() + this.config.settings.stepUpTimeout * 1000),
            attempts: existingRequest?.attempts || 0,
            maxAttempts: this.config.settings.maxStepUpAttempts,
        };

        this.requestStore.set(sessionId, request);

        // Handle based on method
        switch (method) {
            case 'email_otp':
                return this.sendEmailOTP(sessionId, userId, contactInfo?.email);

            case 'sms_otp':
                return this.sendSmsOTP(sessionId, userId, contactInfo?.phone);

            case 'totp':
                return this.setupTOTPVerification(sessionId);

            case 'passkey_reauth':
                return this.setupPasskeyReauth(sessionId);

            default:
                return {
                    success: false,
                    status: 'failed',
                    method,
                    message: 'طريقة التحقق غير مدعومة',
                };
        }
    }

    /**
     * Verify step-up authentication
     */
    async verifyStepUp(
        sessionId: string,
        code: string,
        method: StepUpMethod
    ): Promise<StepUpResponse> {
        const request = this.requestStore.get(sessionId);
        if (!request) {
            return {
                success: false,
                status: 'expired',
                method,
                message: 'انتهت صلاحية الجلسة',
            };
        }

        // Check expiration
        if (new Date() > request.expiresAt) {
            this.requestStore.delete(sessionId);
            this.otpStore.delete(sessionId);
            return {
                success: false,
                status: 'expired',
                method,
                message: 'انتهت صلاحية رمز التحقق',
            };
        }

        // Increment attempts
        request.attempts++;
        this.requestStore.set(sessionId, request);

        // Check max attempts
        if (request.attempts > request.maxAttempts) {
            this.requestStore.delete(sessionId);
            this.otpStore.delete(sessionId);
            return {
                success: false,
                status: 'failed',
                method,
                message: 'تم تجاوز الحد الأقصى للمحاولات',
                remainingAttempts: 0,
            };
        }

        // Verify based on method
        let isValid = false;

        if (method === 'email_otp' || method === 'sms_otp') {
            isValid = this.verifyOTP(sessionId, code);
        } else if (method === 'totp') {
            isValid = await this.verifyTOTP(request.userId, code);
        }

        if (isValid) {
            this.requestStore.delete(sessionId);
            this.otpStore.delete(sessionId);
            return {
                success: true,
                status: 'verified',
                method,
                message: 'تم التحقق بنجاح',
            };
        }

        return {
            success: false,
            status: 'failed',
            method,
            message: 'رمز التحقق غير صحيح',
            remainingAttempts: request.maxAttempts - request.attempts,
        };
    }

    /**
     * Check step-up status
     */
    getStepUpStatus(sessionId: string): StepUpStatus | null {
        const request = this.requestStore.get(sessionId);
        if (!request) return null;

        if (new Date() > request.expiresAt) return 'expired';
        if (request.attempts >= request.maxAttempts) return 'failed';

        const otp = this.otpStore.get(sessionId);
        if (otp?.verified) return 'verified';

        return 'pending';
    }

    /**
     * Send email OTP
     */
    private async sendEmailOTP(
        sessionId: string,
        userId: string,
        email?: string
    ): Promise<StepUpResponse> {
        if (!email) {
            return {
                success: false,
                status: 'failed',
                method: 'email_otp',
                message: 'البريد الإلكتروني غير متوفر',
            };
        }

        const code = this.generateOTP();

        this.otpStore.set(sessionId, {
            code,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            attempts: 0,
            method: 'email_otp',
            verified: false,
        });

        logger.info(`Sending Email OTP to ${this.maskEmail(email)}`);

        try {
            await emailService.sendVerificationCode(email, code);
        } catch (error) {
            logger.error('Failed to send email OTP', error);
            return {
                success: false,
                status: 'failed',
                method: 'email_otp',
                message: 'فشل إرسال رمز التحقق',
            };
        }

        return {
            success: true,
            status: 'sent',
            method: 'email_otp',
            message: `تم إرسال رمز التحقق إلى ${this.maskEmail(email)}`,
        };
    }

    /**
     * Send SMS OTP
     */
    private async sendSmsOTP(
        sessionId: string,
        userId: string,
        phone?: string
    ): Promise<StepUpResponse> {
        if (!phone) {
            return {
                success: false,
                status: 'failed',
                method: 'sms_otp',
                message: 'رقم الهاتف غير متوفر',
            };
        }

        const code = this.generateOTP();

        this.otpStore.set(sessionId, {
            code,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            attempts: 0,
            method: 'sms_otp',
            verified: false,
        });

        try {
            const result = await smsService.sendVerificationCode(phone, code);

            if (result.success) {
                logger.info(`SMS OTP sent to ${this.maskPhone(phone)}`);
                return {
                    success: true,
                    status: 'sent',
                    method: 'sms_otp',
                    message: `تم إرسال رمز التحقق إلى ${this.maskPhone(phone)}`,
                };
            }

            logger.error('SMS service failed:', result.error);
            // Fallback to console in dev if configured, but here we report failure
            return {
                success: false,
                status: 'failed',
                method: 'sms_otp',
                message: 'فشل إرسال رسالة التحقق',
            };
        } catch (error) {
            logger.error('Failed to send SMS OTP', error);
            return {
                success: false,
                status: 'failed',
                method: 'sms_otp',
                message: 'حدث خطأ أثناء إرسال رسالة التحقق',
            };
        }
    }

    /**
     * Setup TOTP verification
     */
    private async setupTOTPVerification(
        sessionId: string
    ): Promise<StepUpResponse> {
        // TOTP doesn't need to send anything, user has the app
        return {
            success: true,
            status: 'pending',
            method: 'totp',
            message: 'أدخل الرمز من تطبيق المصادقة',
        };
    }

    /**
     * Setup passkey re-authentication
     */
    private async setupPasskeyReauth(
        sessionId: string
    ): Promise<StepUpResponse> {
        // Passkey will be handled client-side
        return {
            success: true,
            status: 'pending',
            method: 'passkey_reauth',
            message: 'استخدم بصمة الوجه أو الإصبع للتحقق',
        };
    }

    /**
     * Verify OTP code
     */
    private verifyOTP(sessionId: string, code: string): boolean {
        const stored = this.otpStore.get(sessionId);
        if (!stored) return false;
        if (new Date() > stored.expiresAt) return false;

        // Constant-time comparison to prevent timing attacks
        const storedBuffer = Buffer.from(stored.code);
        const inputBuffer = Buffer.from(code);

        if (storedBuffer.length !== inputBuffer.length) return false;

        const isValid = crypto.timingSafeEqual(storedBuffer, inputBuffer);

        if (isValid) {
            stored.verified = true;
            this.otpStore.set(sessionId, stored);
        }

        return isValid;
    }

    /**
     * Verify TOTP code
     */
    private async verifyTOTP(userId: string, code: string): Promise<boolean> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { twoFactorEnabled: true, twoFactorSecret: true }
            });

            if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
                logger.warn(`TOTP verification failed: User ${userId} has no 2FA setup`);
                return false;
            }

            return authenticator.check(code, user.twoFactorSecret);
        } catch (error) {
            logger.error(`TOTP verification error for user ${userId}`, error);
            return false;
        }
    }

    // ============================================
    // Helper Methods
    // ============================================

    private generateOTP(length = 6): string {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * digits.length)];
        }
        return otp;
    }

    private getReasonMessage(assessment: RiskAssessment): string {
        const reasons = assessment.reasons;
        if (reasons.length === 0) return 'تحقق أمني إضافي مطلوب';

        // Get the highest weight reason
        const topReason = reasons.reduce((a, b) =>
            a.weight > b.weight ? a : b
        );

        return topReason.messageAr;
    }

    private maskEmail(email: string): string {
        const [local, domain] = email.split('@');
        const maskedLocal = local.length > 2
            ? local[0] + '***' + local[local.length - 1]
            : '***';
        return `${maskedLocal}@${domain}`;
    }

    private maskPhone(phone: string): string {
        if (phone.length <= 4) return '****';
        return phone.slice(0, 3) + '****' + phone.slice(-2);
    }
}

// Singleton instance
let managerInstance: StepUpAuthManager | null = null;

export function getStepUpAuthManager(
    config?: Partial<AdaptiveAuthConfig>
): StepUpAuthManager {
    if (!managerInstance || config) {
        managerInstance = new StepUpAuthManager(config);
    }
    return managerInstance;
}

export default StepUpAuthManager;

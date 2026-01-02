/**
 * Two-factor authentication API operations (2FA, TOTP)
 */

import { apiFetch } from './core';
import type {
    TwoFactorVerifyRequest,
    TwoFactorVerifyResponse,
} from '@/types/api/auth';
import { authValidator } from '@/lib/auth/validation-interface';

/**
 * Verify Two-Factor Authentication
 * Improved with better validation and error handling using centralized validation
 */
export async function verifyTwoFactor(
    request: TwoFactorVerifyRequest
): Promise<TwoFactorVerifyResponse> {
    try {
        // Validate request using centralized validation
        const validation = authValidator.validateTwoFactorRequest({
            loginAttemptId: request.loginAttemptId,
            challengeId: request.challengeId,
            code: request.code,
        });

        if (!validation.isValid) {
            throw {
                error: validation.error || 'بيانات التحقق غير صحيحة',
                code: validation.error?.includes('معرف') ? 'MISSING_LOGIN_ATTEMPT_ID' : 'INVALID_CODE_FORMAT',
            };
        }

        const response = await apiFetch<TwoFactorVerifyResponse>('/two-factor', {
            method: 'POST',
            body: JSON.stringify({
                loginAttemptId: request.loginAttemptId || request.challengeId,
                code: request.code.trim(),
                trustDevice: request.trustDevice ?? false,
            }),
        });

        // Validate response
        if (!response || !response.token || !response.user) {
            throw {
                error: 'استجابة التحقق غير صحيحة',
                code: 'INVALID_VERIFICATION_RESPONSE',
            };
        }

        return response;
    } catch (error: unknown) {
        // Re-throw if it's already a properly formatted error
        if (error && ((error as { error?: string }).error || (error as { code?: string }).code)) {
            throw error;
        }

        // Wrap unexpected errors
        throw {
            error: (error as { message?: string }).message || 'حدث خطأ أثناء التحقق من رمز المصادقة',
            code: 'TWO_FACTOR_ERROR',
        };
    }
}

/**
 * Resend Two-Factor Authentication Code
 */
export async function resendTwoFactorCode(data: {
    loginAttemptId: string;
    method?: 'email' | 'sms';
}): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/resend-two-factor', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Setup TOTP two-factor authentication
 */
export async function setupTOTP(): Promise<{
    secret: string;
    qrCodeURL: string;
    manualEntryKey: string;
    recoveryCodes: string[];
    message: string;
}> {
    return apiFetch<{
        secret: string;
        qrCodeURL: string;
        manualEntryKey: string;
        recoveryCodes: string[];
        message: string;
    }>('/two-factor/totp/setup', {
        method: 'POST',
    });
}

/**
 * Verify TOTP code
 */
export async function verifyTOTPCode(code: string): Promise<{
    message: string;
}> {
    return apiFetch<{ message: string }>('/two-factor/totp/verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
    });
}

/**
 * Verify TOTP code for login
 */
export async function verifyTOTPForLogin(data: {
    loginAttemptId: string;
    code: string;
}): Promise<TwoFactorVerifyResponse> {
    return apiFetch<TwoFactorVerifyResponse>('/two-factor/totp/verify-login', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Get recovery codes
 */
export async function getRecoveryCodes(): Promise<{
    codes: string[];
    remaining: number;
}> {
    return apiFetch<{ codes: string[]; remaining: number }>('/two-factor/recovery-codes', {
        method: 'GET',
    });
}

/**
 * Generate new recovery codes
 */
export async function generateRecoveryCodes(): Promise<{
    codes: string[];
    message: string;
}> {
    return apiFetch<{ codes: string[]; message: string }>('/two-factor/recovery-codes', {
        method: 'POST',
    });
}

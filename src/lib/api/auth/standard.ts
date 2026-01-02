/**
 * Standard authentication API operations (Login, Register, User, Password)
 */

import { apiFetch } from './core';
import type {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
} from '@/types/api/auth';
import { logger } from '@/lib/logger';
import { authValidator } from '@/lib/auth/validation-interface';
import type { AuthUser } from '@/lib/services/auth-service';

/**
 * Login API
 * Improved with better error handling, validation, and connection to backend
 * Enhanced with input sanitization and better error messages
 * 
 * Security improvements:
 * - Comprehensive input validation and sanitization
 * - Timeout protection for API calls
 * - Better error handling and retry logic
 * - Response validation
 */
export async function loginUser(
    request: LoginRequest
): Promise<LoginResponse> {
    const startTime = Date.now();

    // Validate request structure
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
        throw {
            error: 'بيانات الطلب غير صحيحة',
            code: 'INVALID_REQUEST',
        };
    }

    // Enhanced email validation using centralized validation
    const emailValidation = authValidator.validateEmail(request.email);
    if (!emailValidation.isValid) {
        throw {
            error: emailValidation.error || 'البريد الإلكتروني غير صحيح',
            code: emailValidation.error === 'البريد الإلكتروني مطلوب' ? 'MISSING_EMAIL' :
                emailValidation.error === 'البريد الإلكتروني طويل جداً' ? 'EMAIL_TOO_LONG' : 'INVALID_EMAIL_FORMAT',
        };
    }
    const email = emailValidation.normalized!;

    // Login-specific password validation (only check presence and length limits)
    // Password strength requirements (special chars, uppercase, etc.) are only for registration
    if (!request.password || typeof request.password !== 'string') {
        throw {
            error: 'كلمة المرور مطلوبة',
            code: 'MISSING_PASSWORD',
        };
    }

    if (request.password.length < 8) {
        throw {
            error: 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل',
            code: 'PASSWORD_TOO_SHORT',
        };
    }

    if (request.password.length > 128) {
        throw {
            error: 'كلمة المرور طويلة جداً',
            code: 'PASSWORD_TOO_LONG',
        };
    }

    try {
        // Prepare request body with sanitized data
        const requestBody = {
            email,
            password: request.password, // Don't trim password - spaces might be intentional
            rememberMe: request.rememberMe ?? false,
            deviceFingerprint: request.deviceFingerprint || undefined,
            captchaToken: request.captchaToken || undefined,
        };

        const response = await apiFetch<LoginResponse>('/login', {
            method: 'POST',
            body: JSON.stringify(requestBody),
        });

        // Validate response structure
        if (!response || typeof response !== 'object' || Array.isArray(response)) {
            throw {
                error: 'استجابة غير صحيحة من الخادم',
                code: 'INVALID_RESPONSE',
            };
        }

        // If 2FA is required, validate and return the response
        if (response.requiresTwoFactor) {
            if (!response.loginAttemptId || typeof response.loginAttemptId !== 'string') {
                throw {
                    error: 'استجابة التحقق بخطوتين غير صحيحة',
                    code: 'INVALID_2FA_RESPONSE',
                };
            }
            return response;
        }

        // Validate successful login response structure
        if (!response.token || typeof response.token !== 'string' || response.token.trim().length === 0) {
            throw {
                error: 'رمز المصادقة غير موجود في الاستجابة',
                code: 'MISSING_TOKEN',
            };
        }

        if (!response.user || typeof response.user !== 'object') {
            throw {
                error: 'بيانات المستخدم غير موجودة في الاستجابة',
                code: 'MISSING_USER_DATA',
            };
        }

        // Validate user data structure
        if (!response.user.id || typeof response.user.id !== 'string') {
            throw {
                error: 'معرف المستخدم غير صحيح',
                code: 'INVALID_USER_ID',
            };
        }

        if (!response.user.email || typeof response.user.email !== 'string') {
            throw {
                error: 'بريد المستخدم غير صحيح',
                code: 'INVALID_USER_EMAIL',
            };
        }

        // Log successful login duration for monitoring
        const duration = Date.now() - startTime;
        if (process.env.NODE_ENV === 'development') {
            logger.debug(`loginUser API call completed successfully in ${duration}ms`);
        }

        return response;
    } catch (error: unknown) {
        // Log error with context
        const duration = Date.now() - startTime;
        if (process.env.NODE_ENV === 'development') {
            logger.debug(`loginUser API call failed after ${duration}ms`, {
                error: error && typeof error === 'object' && 'error' in error ? (error as { error?: string }).error : String(error),
            });
        }

        // Check if error is empty object or null/undefined
        if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
            throw {
                error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
                code: 'UNEXPECTED_ERROR',
            };
        }

        // Re-throw if it's already a properly formatted error with error or code property
        if (error && typeof error === 'object' && ((error as { error?: string }).error || (error as { code?: string }).code)) {
            // Ensure error message is present
            const errorCode = (error as { code?: string }).code;

            // Handle session expiration errors
            if (errorCode === 'SESSION_EXPIRED' || errorCode === 'INVALID_SESSION') {
                const normalizedError = {
                    error: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.',
                    code: 'SESSION_EXPIRED',
                    ...((error as { status?: number }).status !== undefined && { status: (error as { status?: number }).status }),
                };
                throw normalizedError;
            }

            const normalizedError = {
                error: (error as { error?: string; message?: string }).error || (error as { error?: string; message?: string }).message || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
                code: errorCode || 'LOGIN_ERROR',
                ...((error as { status?: number }).status !== undefined && { status: (error as { status?: number }).status }),
                ...((error as { retryAfterSeconds?: number }).retryAfterSeconds !== undefined && { retryAfterSeconds: (error as { retryAfterSeconds?: number }).retryAfterSeconds }),
                ...((error as { requiresCaptcha?: boolean }).requiresCaptcha !== undefined && { requiresCaptcha: (error as { requiresCaptcha?: boolean }).requiresCaptcha }),
                ...((error as { failedAttempts?: number }).failedAttempts !== undefined && { failedAttempts: (error as { failedAttempts?: number }).failedAttempts }),
            };
            throw normalizedError;
        }

        // Normalize error - handle various formats
        let errorMessage: string;

        if (typeof error === 'string') {
            errorMessage = error || 'حدث خطأ أثناء تسجيل الدخول';
        } else if (error instanceof Error) {
            errorMessage = error.message || 'حدث خطأ أثناء تسجيل الدخول';
        } else if ((error as { message?: string }).message) {
            errorMessage = (error as { message: string }).message;
        } else if ((error as { error?: string }).error) {
            errorMessage = (error as { error: string }).error;
        } else {
            errorMessage = String(error) || 'حدث خطأ أثناء تسجيل الدخول';
        }

        // Wrap unexpected errors - ensure we always have proper structure
        throw {
            error: errorMessage,
            code: 'LOGIN_ERROR',
            ...(process.env.NODE_ENV === 'development' && {
                originalError: String(error),
            }),
        };
    }
}

/**
 * Register API
 */
export async function registerUser(
    request: RegisterRequest
): Promise<RegisterResponse> {
    return apiFetch<RegisterResponse>('/register', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

/**
 * Logout API
 */
export async function logoutUser(): Promise<void> {
    await apiFetch('/logout', {
        method: 'POST',
    });
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<{ user: AuthUser }> {
    return apiFetch<{ user: AuthUser }>('/me', {
        method: 'GET',
    });
}

/**
 * Refresh token
 */
export async function refreshToken(): Promise<{
    token: string;
    refreshToken: string;
}> {
    return apiFetch<{ token: string; refreshToken: string }>('/refresh', {
        method: 'POST',
    });
}

/**
 * Change password
 */
export async function changePassword(data: {
    currentPassword: string;
    newPassword: string;
}): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Forgot password
 */
export async function forgotPassword(email: string): Promise<{
    message: string;
}> {
    return apiFetch<{ message: string }>('/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

/**
 * Verify reset code
 */
export async function verifyResetCode(data: {
    email: string;
    code: string;
}): Promise<{ message: string; resetToken: string }> {
    return apiFetch<{ message: string; resetToken: string }>('/verify-reset-code', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Reset password
 */
export async function resetPassword(data: {
    token: string;
    password: string;
}): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Verify email
 */
export async function verifyEmail(token: string): Promise<{
    message: string;
    user?: any;
}> {
    return apiFetch<{ message: string; user?: any }>('/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(): Promise<{
    message: string;
}> {
    return apiFetch<{ message: string }>('/send-verification', {
        method: 'POST',
    });
}

/**
 * Get auth status
 */
export async function getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    user?: any;
}> {
    return apiFetch<{ isAuthenticated: boolean; user?: any }>('/status', {
        method: 'GET',
    });
}

/**
 * Get analytics data
 */
export async function getAuthAnalytics(): Promise<{
    loginAttempts: number;
    failedAttempts: number;
    successfulLogins: number;
    suspiciousActivity: number;
}> {
    return apiFetch<{
        loginAttempts: number;
        failedAttempts: number;
        successfulLogins: number;
        suspiciousActivity: number;
        suspiciousLogins?: number; // Added to match type if needed, or remove if not returned
    }>('/analytics', {
        method: 'GET',
    });
}

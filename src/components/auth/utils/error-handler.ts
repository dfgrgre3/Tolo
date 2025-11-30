/**
 * معالج الأخطاء الموحد للمصادقة
 * 
 * @module error-handler
 * @description يوفر معالجة موحدة وآمنة للأخطاء مع تسجيل محسّن
 */

import { toast } from 'sonner';
import { logger } from '@/lib/logger';

/**
 * أنواع الأخطاء المعروفة
 */
export enum ErrorType {
    VALIDATION = 'VALIDATION_ERROR',
    AUTHENTICATION = 'AUTHENTICATION_ERROR',
    AUTHORIZATION = 'AUTHORIZATION_ERROR',
    NETWORK = 'NETWORK_ERROR',
    SERVER = 'SERVER_ERROR',
    RATE_LIMIT = 'RATE_LIMITED',
    TWO_FACTOR = 'TWO_FACTOR_ERROR',
    CAPTCHA = 'CAPTCHA_ERROR',
    TIMEOUT = 'REQUEST_TIMEOUT',
    UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * خطأ API موحد
 */
export interface ApiError {
    /** رسالة الخطأ */
    message: string;
    /** كود الخطأ */
    code: ErrorType | string;
    /** حالة HTTP */
    status?: number;
    /** تفاصيل إضافية */
    details?: Record<string, unknown>;
    /** وقت إعادة المحاولة (بالثواني) */
    retryAfterSeconds?: number;
    /** يتطلب CAPTCHA */
    requiresCaptcha?: boolean;
    /** عدد المحاولات الفاشلة */
    failedAttempts?: number;
}

/**
 * خيارات معالجة الأخطاء
 */
export interface ErrorHandlerOptions {
    /** عرض رسالة Toast */
    showToast?: boolean;
    /** مدة عرض Toast (بالميلي ثانية) */
    toastDuration?: number;
    /** تسجيل الخطأ */
    logError?: boolean;
    /** رسالة مخصصة */
    customMessage?: string;
    /** السياق (لتسجيل أفضل) */
    context?: string;
}

/**
 * رسائل الأخطاء الافتراضية
 */
const DEFAULT_ERROR_MESSAGES: Record<string, string> = {
    // أخطاء التحقق
    [ErrorType.VALIDATION]: 'يرجى التحقق من البيانات المدخلة',
    INVALID_EMAIL: 'البريد الإلكتروني غير صحيح',
    INVALID_PASSWORD: 'كلمة المرور غير صحيحة',
    PASSWORD_TOO_SHORT: 'كلمة المرور قصيرة جداً',
    PASSWORD_TOO_LONG: 'كلمة المرور طويلة جداً',
    EMAIL_TOO_LONG: 'البريد الإلكتروني طويل جداً',
    MISSING_EMAIL: 'البريد الإلكتروني مطلوب',
    MISSING_PASSWORD: 'كلمة المرور مطلوبة',
    PASSWORDS_DONT_MATCH: 'كلمات المرور غير متطابقة',

    // أخطاء المصادقة
    [ErrorType.AUTHENTICATION]: 'فشل تسجيل الدخول',
    INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    USER_NOT_FOUND: 'المستخدم غير موجود',
    ACCOUNT_LOCKED: 'تم قفل الحساب مؤقتاً بسبب محاولات فاشلة متعددة',
    ACCOUNT_DISABLED: 'تم تعطيل هذا الحساب',
    EMAIL_NOT_VERIFIED: 'يرجى التحقق من بريدك الإلكتروني أولاً',

    // أخطاء التفويض
    [ErrorType.AUTHORIZATION]: 'ليس لديك صلاحية للوصول',
    INSUFFICIENT_PERMISSIONS: 'ليس لديك الصلاحيات الكافية',

    // أخطاء الشبكة
    [ErrorType.NETWORK]: 'خطأ في الاتصال بالشبكة',
    FETCH_ERROR: 'فشل الاتصال بالخادم',
    CONNECTION_ERROR: 'فشل الاتصال. يرجى التحقق من اتصالك بالإنترنت',
    NOT_FOUND: 'الصفحة أو المورد غير موجود',

    // أخطاء الخادم
    [ErrorType.SERVER]: 'خطأ في الخادم',
    INTERNAL_SERVER_ERROR: 'حدث خطأ داخلي في الخادم',
    SERVICE_UNAVAILABLE: 'الخدمة غير متاحة حالياً',
    DATABASE_ERROR: 'خطأ في قاعدة البيانات',

    // أخطاء تحديد المعدل
    [ErrorType.RATE_LIMIT]: 'تم تجاوز عدد المحاولات المسموح بها',
    TOO_MANY_REQUESTS: 'عدد كبير جداً من الطلبات. يرجى المحاولة لاحقاً',

    // أخطاء التحقق بخطوتين
    [ErrorType.TWO_FACTOR]: 'خطأ في التحقق بخطوتين',
    INVALID_TWO_FACTOR_CODE: 'رمز التحقق غير صحيح',
    TWO_FACTOR_EXPIRED: 'انتهت صلاحية رمز التحقق',
    TWO_FACTOR_REQUIRED: 'يتطلب التحقق بخطوتين',

    // أخطاء CAPTCHA
    [ErrorType.CAPTCHA]: 'فشل التحقق من CAPTCHA',
    INVALID_CAPTCHA: 'رمز CAPTCHA غير صحيح',
    CAPTCHA_REQUIRED: 'يرجى إكمال التحقق من CAPTCHA',

    // أخطاء المهلة
    [ErrorType.TIMEOUT]: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى',

    // أخطاء غير معروفة
    [ErrorType.UNKNOWN]: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى',
};

/**
 * تحويل الخطأ إلى ApiError موحد
 * 
 * @param error - الخطأ الأصلي
 * @returns خطأ API موحد
 * 
 * @example
 * ```typescript
 * try {
 *   await loginUser(credentials);
 * } catch (error) {
 *   const apiError = normalizeError(error);
 *   console.error(apiError.message);
 * }
 * ```
 */
export function normalizeError(error: unknown): ApiError {
    // التحقق من القيمة الفارغة
    if (!error) {
        return {
            message: DEFAULT_ERROR_MESSAGES[ErrorType.UNKNOWN],
            code: ErrorType.UNKNOWN,
        };
    }

    // إذا كان الخطأ بالفعل ApiError
    if (isApiError(error)) {
        return {
            message: error.message || DEFAULT_ERROR_MESSAGES[error.code] || DEFAULT_ERROR_MESSAGES[ErrorType.UNKNOWN],
            code: error.code || ErrorType.UNKNOWN,
            status: error.status,
            details: error.details,
            retryAfterSeconds: error.retryAfterSeconds,
            requiresCaptcha: error.requiresCaptcha,
            failedAttempts: error.failedAttempts,
        };
    }

    // إذا كان Error عادي
    if (error instanceof Error) {
        return {
            message: error.message || DEFAULT_ERROR_MESSAGES[ErrorType.UNKNOWN],
            code: ErrorType.UNKNOWN,
        };
    }

    // إذا كان string
    if (typeof error === 'string') {
        return {
            message: error || DEFAULT_ERROR_MESSAGES[ErrorType.UNKNOWN],
            code: ErrorType.UNKNOWN,
        };
    }

    // إذا كان object
    if (typeof error === 'object') {
        const err = error as Record<string, unknown>;
        const message = (err.error || err.message || DEFAULT_ERROR_MESSAGES[ErrorType.UNKNOWN]) as string;
        const code = (err.code || ErrorType.UNKNOWN) as string;

        return {
            message,
            code,
            status: err.status as number | undefined,
            details: err.details as Record<string, unknown> | undefined,
            retryAfterSeconds: err.retryAfterSeconds as number | undefined,
            requiresCaptcha: err.requiresCaptcha as boolean | undefined,
            failedAttempts: err.failedAttempts as number | undefined,
        };
    }

    // افتراضي
    return {
        message: DEFAULT_ERROR_MESSAGES[ErrorType.UNKNOWN],
        code: ErrorType.UNKNOWN,
    };
}

/**
 * التحقق من أن الكائن هو ApiError
 * 
 * @param error - الكائن المراد التحقق منه
 * @returns true إذا كان ApiError
 */
function isApiError(error: unknown): error is ApiError {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const err = error as Record<string, unknown>;
    return (
        (typeof err.message === 'string' || typeof err.error === 'string') &&
        typeof err.code === 'string'
    );
}

/**
 * معالجة الخطأ وعرضه للمستخدم
 * 
 * @param error - الخطأ المراد معالجته
 * @param options - خيارات المعالجة
 * @returns خطأ API موحد
 * 
 * @example
 * ```typescript
 * try {
 *   await loginUser(credentials);
 * } catch (error) {
 *   const apiError = handleError(error, {
 *     showToast: true,
 *     context: 'Login Form',
 *   });
 * }
 * ```
 */
export function handleError(
    error: unknown,
    options: ErrorHandlerOptions = {}
): ApiError {
    const {
        showToast = true,
        toastDuration = 4000,
        logError = true,
        customMessage,
        context = 'Unknown',
    } = options;

    // تطبيع الخطأ
    const apiError = normalizeError(error);

    // استخدام الرسالة المخصصة إذا كانت موجودة
    if (customMessage) {
        apiError.message = customMessage;
    }

    // تسجيل الخطأ
    if (logError) {
        logger.error(`[${context}] Error:`, {
            code: apiError.code,
            message: apiError.message,
            status: apiError.status,
            details: apiError.details,
        });
    }

    // عرض Toast
    if (showToast) {
        const toastOptions = {
            duration: toastDuration,
        };

        switch (apiError.code) {
            case ErrorType.RATE_LIMIT:
                if (apiError.retryAfterSeconds) {
                    const minutes = Math.ceil(apiError.retryAfterSeconds / 60);
                    toast.error(
                        `${apiError.message}. يرجى المحاولة بعد ${minutes} دقيقة`,
                        toastOptions
                    );
                } else {
                    toast.error(apiError.message, toastOptions);
                }
                break;

            case ErrorType.NETWORK:
            case ErrorType.TIMEOUT:
                toast.error(apiError.message, {
                    ...toastOptions,
                    action: {
                        label: 'إعادة المحاولة',
                        onClick: () => {
                            // يمكن تمرير callback لإعادة المحاولة
                        },
                    },
                });
                break;

            case ErrorType.CAPTCHA:
                toast.warning(apiError.message, toastOptions);
                break;

            case ErrorType.VALIDATION:
                toast.warning(apiError.message, { duration: 3000 });
                break;

            default:
                toast.error(apiError.message, toastOptions);
        }
    }

    return apiError;
}

/**
 * معالجة أخطاء تسجيل الدخول
 * 
 * @param error - الخطأ
 * @returns خطأ API موحد
 * 
 * @example
 * ```typescript
 * try {
 *   await loginUser(credentials);
 * } catch (error) {
 *   const apiError = handleLoginError(error);
 *   setFormError(apiError.message);
 * }
 * ```
 */
export function handleLoginError(error: unknown): ApiError {
    return handleError(error, {
        showToast: true,
        context: 'Login',
        toastDuration: 5000,
    });
}

/**
 * معالجة أخطاء التسجيل
 * 
 * @param error - الخطأ
 * @returns خطأ API موحد
 * 
 * @example
 * ```typescript
 * try {
 *   await registerUser(data);
 * } catch (error) {
 *   const apiError = handleRegisterError(error);
 *   setFormError(apiError.message);
 * }
 * ```
 */
export function handleRegisterError(error: unknown): ApiError {
    return handleError(error, {
        showToast: true,
        context: 'Register',
        toastDuration: 5000,
    });
}

/**
 * معالجة أخطاء التحقق بخطوتين
 * 
 * @param error - الخطأ
 * @returns خطأ API موحد
 * 
 * @example
 * ```typescript
 * try {
 *   await verifyTwoFactor(code);
 * } catch (error) {
 *   const apiError = handleTwoFactorError(error);
 *   setCodeError(apiError.message);
 * }
 * ```
 */
export function handleTwoFactorError(error: unknown): ApiError {
    return handleError(error, {
        showToast: true,
        context: 'Two-Factor Authentication',
        toastDuration: 4000,
    });
}

/**
 * الحصول على رسالة خطأ مناسبة للمستخدم
 * 
 * @param code - كود الخطأ
 * @param defaultMessage - الرسالة الافتراضية
 * @returns رسالة الخطأ
 * 
 * @example
 * ```typescript
 * const message = getErrorMessage('INVALID_EMAIL');
 * // Returns: 'البريد الإلكتروني غير صحيح'
 * ```
 */
export function getErrorMessage(
    code: string,
    defaultMessage?: string
): string {
    return (
        DEFAULT_ERROR_MESSAGES[code] ||
        defaultMessage ||
        DEFAULT_ERROR_MESSAGES[ErrorType.UNKNOWN]
    );
}

/**
 * التحقق من أن الخطأ هو خطأ شبكة
 * 
 * @param error - الخطأ
 * @returns true إذا كان خطأ شبكة
 * 
 * @example
 * ```typescript
 * if (isNetworkError(error)) {
 *   toast.error('يرجى التحقق من اتصالك بالإنترنت');
 * }
 * ```
 */
export function isNetworkError(error: unknown): boolean {
    const apiError = normalizeError(error);
    return (
        apiError.code === ErrorType.NETWORK ||
        apiError.code === 'FETCH_ERROR' ||
        apiError.code === 'CONNECTION_ERROR' ||
        apiError.code === 'NOT_FOUND' ||
        !navigator.onLine
    );
}

/**
 * التحقق من أن الخطأ هو خطأ تحديد معدل
 * 
 * @param error - الخطأ
 * @returns true إذا كان خطأ تحديد معدل
 * 
 * @example
 * ```typescript
 * if (isRateLimitError(error)) {
 *   setLockoutSeconds(error.retryAfterSeconds);
 * }
 * ```
 */
export function isRateLimitError(error: unknown): boolean {
    const apiError = normalizeError(error);
    return (
        apiError.code === ErrorType.RATE_LIMIT ||
        apiError.code === 'TOO_MANY_REQUESTS'
    );
}

/**
 * التحقق من أن الخطأ يتطلب CAPTCHA
 * 
 * @param error - الخطأ
 * @returns true إذا كان يتطلب CAPTCHA
 * 
 * @example
 * ```typescript
 * if (requiresCaptcha(error)) {
 *   setShowCaptcha(true);
 * }
 * ```
 */
export function requiresCaptcha(error: unknown): boolean {
    const apiError = normalizeError(error);
    return apiError.requiresCaptcha === true;
}

/**
 * تنسيق وقت إعادة المحاولة
 * 
 * @param seconds - عدد الثواني
 * @returns نص منسق
 * 
 * @example
 * ```typescript
 * const formatted = formatRetryTime(125);
 * // Returns: 'دقيقتان و5 ثوانٍ'
 * ```
 */
export function formatRetryTime(seconds: number): string {
    if (seconds < 60) {
        return `${seconds} ${seconds === 1 ? 'ثانية' : 'ثوانٍ'}`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    let result = '';

    if (minutes === 1) {
        result = 'دقيقة';
    } else if (minutes === 2) {
        result = 'دقيقتان';
    } else if (minutes >= 3 && minutes <= 10) {
        result = `${minutes} دقائق`;
    } else {
        result = `${minutes} دقيقة`;
    }

    if (remainingSeconds > 0) {
        result += ` و${remainingSeconds} ${remainingSeconds === 1 ? 'ثانية' : 'ثوانٍ'}`;
    }

    return result;
}

/**
 * إنشاء خطأ API
 * 
 * @param code - كود الخطأ
 * @param message - رسالة مخصصة (اختياري)
 * @param details - تفاصيل إضافية (اختياري)
 * @returns خطأ API
 * 
 * @example
 * ```typescript
 * throw createApiError(ErrorType.VALIDATION, 'البريد الإلكتروني غير صحيح');
 * ```
 */
export function createApiError(
    code: ErrorType | string,
    message?: string,
    details?: Record<string, unknown>
): ApiError {
    return {
        message: message || getErrorMessage(code),
        code,
        details,
    };
}

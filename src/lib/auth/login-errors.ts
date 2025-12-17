export const LOGIN_ERRORS = {
    VALIDATION_ERROR: 'يرجى التحقق من البيانات المدخلة.',
    INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    ACCOUNT_LOCKED: 'تم قفل الحساب مؤقتاً. يرجى المحاولة لاحقاً.',
    RATE_LIMITED: 'تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار قليلاً.',
    NETWORK_ERROR: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.',
    UNKNOWN_ERROR: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
    MISSING_EMAIL: 'البريد الإلكتروني مطلوب.',
    INVALID_EMAIL_FORMAT: 'صيغة البريد الإلكتروني غير صحيحة.',
    PASSWORD_TOO_SHORT: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
    PASSWORD_TOO_LONG: 'كلمة المرور طويلة جداً.',
    REQUEST_TIMEOUT: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
    CAPTCHA_REQUIRED: 'يرجى إكمال التحقق الأمني.',
    CAPTCHA_INVALID: 'فشل التحقق الأمني. يرجى المحاولة مرة أخرى.',
    TWO_FACTOR_REQUIRED: 'مطلوب التحقق بخطوتين.',
    INVALID_TWO_FACTOR_CODE: 'رمز التحقق غير صحيح.',
    TOKEN_GENERATION_FAILED: 'فشل في إنشاء رمز المصادقة. يرجى المحاولة مرة أخرى.',
    SESSION_CREATION_FAILED: 'فشل في إنشاء الجلسة. يرجى المحاولة مرة أخرى.',
    CONFIGURATION_ERROR: 'خطأ في إعدادات الخادم. يرجى التواصل مع الدعم الفني.',
    IP_BLOCKED: 'تم حظر عنوان IP هذا بسبب محاولات غير مصرح بها.',
    INVALID_REQUEST_BODY: 'بيانات الطلب غير صحيحة.',
    HIGH_RISK: 'تم رفض تسجيل الدخول لأسباب أمنية. يرجى التواصل مع الدعم الفني.',
    EMAIL_NOT_VERIFIED: 'البريد الإلكتروني غير مفعل. يرجى تفعيل حسابك.',
    INTERNAL_SERVER_ERROR: 'حدث خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.',
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERRORS;

export const getLoginErrorMessage = (code: string | undefined | null): string => {
    if (!code || !(code in LOGIN_ERRORS)) {
        return LOGIN_ERRORS.UNKNOWN_ERROR;
    }
    return LOGIN_ERRORS[code as LoginErrorCode];
};

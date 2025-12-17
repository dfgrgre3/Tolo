/**
 * دوال التحقق المحسّنة للمصادقة
 * 
 * @module validation
 * @description يوفر دوال تحقق شاملة ومحسّنة للأداء
 */

/**
 * نتيجة التحقق من صحة البيانات
 */
export interface ValidationResult {
    isValid: boolean;
    error?: string;
    errors?: Record<string, string>;
}

/**
 * خيارات التحقق من البريد الإلكتروني
 */
export interface EmailValidationOptions {
    /** السماح بالنطاقات المحلية (localhost) */
    allowLocalDomains?: boolean;
    /** السماح بالنطاقات المؤقتة */
    allowDisposable?: boolean;
    /** الحد الأقصى للطول */
    maxLength?: number;
}

/**
 * خيارات التحقق من كلمة المرور
 */
export interface PasswordValidationOptions {
    /** الحد الأدنى للطول */
    minLength?: number;
    /** الحد الأقصى للطول */
    maxLength?: number;
    /** يتطلب حرف كبير */
    requireUppercase?: boolean;
    /** يتطلب حرف صغير */
    requireLowercase?: boolean;
    /** يتطلب رقم */
    requireNumber?: boolean;
    /** يتطلب رمز خاص */
    requireSpecialChar?: boolean;
}

/**
 * قائمة النطاقات المؤقتة الشائعة
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
    'tempmail.com',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'throwaway.email',
    'temp-mail.org',
    'getnada.com',
    'maildrop.cc',
]);

/**
 * التحقق من صحة البريد الإلكتروني
 * 
 * @param email - البريد الإلكتروني المراد التحقق منه
 * @param options - خيارات التحقق
 * @returns نتيجة التحقق
 * 
 * @example
 * ```typescript
 * const result = validateEmail('user@example.com');
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateEmail(
    email: string,
    options: EmailValidationOptions = {}
): ValidationResult {
    const {
        allowLocalDomains = false,
        allowDisposable = false,
        maxLength = 254, // RFC 5321 limit
    } = options;

    // التحقق من القيمة الفارغة
    if (!email || typeof email !== 'string') {
        return {
            isValid: false,
            error: 'البريد الإلكتروني مطلوب',
        };
    }

    // تنظيف البريد الإلكتروني
    const trimmedEmail = email.trim().toLowerCase();

    // التحقق من الطول
    if (trimmedEmail.length === 0) {
        return {
            isValid: false,
            error: 'البريد الإلكتروني لا يمكن أن يكون فارغاً',
        };
    }

    if (trimmedEmail.length > maxLength) {
        return {
            isValid: false,
            error: `البريد الإلكتروني طويل جداً (الحد الأقصى ${maxLength} حرف)`,
        };
    }

    // التحقق من الحد الأدنى للطول
    if (trimmedEmail.length < 5) {
        return {
            isValid: false,
            error: 'البريد الإلكتروني قصير جداً',
        };
    }

    // التحقق من الصيغة الأساسية
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(trimmedEmail)) {
        return {
            isValid: false,
            error: 'صيغة البريد الإلكتروني غير صحيحة',
        };
    }

    // التحقق من الصيغة المتقدمة (RFC 5322)
    const advancedEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!advancedEmailRegex.test(trimmedEmail)) {
        return {
            isValid: false,
            error: 'صيغة البريد الإلكتروني غير صحيحة',
        };
    }

    // التحقق من الأنماط الضارة
    if (
        trimmedEmail.includes('..') ||
        trimmedEmail.startsWith('.') ||
        trimmedEmail.endsWith('.')
    ) {
        return {
            isValid: false,
            error: 'صيغة البريد الإلكتروني غير صحيحة',
        };
    }

    // استخراج النطاق
    const domain = trimmedEmail.split('@')[1];

    // التحقق من النطاقات المحلية
    if (!allowLocalDomains && (domain === 'localhost' || domain.endsWith('.local'))) {
        return {
            isValid: false,
            error: 'النطاقات المحلية غير مسموح بها',
        };
    }

    // التحقق من النطاقات المؤقتة
    if (!allowDisposable && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
        return {
            isValid: false,
            error: 'البريد الإلكتروني المؤقت غير مسموح به',
        };
    }

    return {
        isValid: true,
    };
}

/**
 * التحقق من صحة كلمة المرور
 * 
 * @param password - كلمة المرور المراد التحقق منها
 * @param options - خيارات التحقق
 * @returns نتيجة التحقق
 * 
 * @example
 * ```typescript
 * const result = validatePassword('MyP@ssw0rd', {
 *   minLength: 8,
 *   requireUppercase: true,
 *   requireNumber: true,
 * });
 * ```
 */
export function validatePassword(
    password: string,
    options: PasswordValidationOptions = {}
): ValidationResult {
    const {
        minLength = 8,
        maxLength = 128,
        requireUppercase = true,
        requireLowercase = true,
        requireNumber = true,
        requireSpecialChar = true,
    } = options;

    // التحقق من القيمة الفارغة
    if (!password || typeof password !== 'string') {
        return {
            isValid: false,
            error: 'كلمة المرور مطلوبة',
        };
    }

    // التحقق من الطول
    if (password.length < minLength) {
        return {
            isValid: false,
            error: `كلمة المرور يجب أن تتكون من ${minLength} أحرف على الأقل`,
        };
    }

    if (password.length > maxLength) {
        return {
            isValid: false,
            error: `كلمة المرور طويلة جداً (الحد الأقصى ${maxLength} حرف)`,
        };
    }

    const errors: string[] = [];

    // التحقق من الحرف الكبير
    if (requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('حرف كبير واحد على الأقل');
    }

    // التحقق من الحرف الصغير
    if (requireLowercase && !/[a-z]/.test(password)) {
        errors.push('حرف صغير واحد على الأقل');
    }

    // التحقق من الرقم
    if (requireNumber && !/[0-9]/.test(password)) {
        errors.push('رقم واحد على الأقل');
    }

    // التحقق من الرمز الخاص
    if (requireSpecialChar && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
        errors.push('رمز خاص واحد على الأقل');
    }

    if (errors.length > 0) {
        return {
            isValid: false,
            error: `كلمة المرور يجب أن تحتوي على: ${errors.join('، ')}`,
        };
    }

    return {
        isValid: true,
    };
}

/**
 * التحقق من صحة رمز التحقق بخطوتين
 * 
 * @param code - رمز التحقق
 * @returns نتيجة التحقق
 * 
 * @example
 * ```typescript
 * const result = validateTwoFactorCode('123456');
 * ```
 */
export function validateTwoFactorCode(code: string): ValidationResult {
    if (!code || typeof code !== 'string') {
        return {
            isValid: false,
            error: 'رمز التحقق مطلوب',
        };
    }

    const trimmedCode = code.trim();

    // التحقق من الطول
    if (trimmedCode.length !== 6) {
        return {
            isValid: false,
            error: 'رمز التحقق يجب أن يتكون من 6 أرقام',
        };
    }

    // التحقق من أن الرمز يحتوي على أرقام فقط
    if (!/^\d{6}$/.test(trimmedCode)) {
        return {
            isValid: false,
            error: 'رمز التحقق يجب أن يحتوي على أرقام فقط',
        };
    }

    return {
        isValid: true,
    };
}

/**
 * التحقق من صحة رقم الهاتف
 * 
 * @param phone - رقم الهاتف
 * @returns نتيجة التحقق
 * 
 * @example
 * ```typescript
 * const result = validatePhoneNumber('+966501234567');
 * ```
 */
export function validatePhoneNumber(phone: string): ValidationResult {
    if (!phone || typeof phone !== 'string') {
        return {
            isValid: false,
            error: 'رقم الهاتف مطلوب',
        };
    }

    const trimmedPhone = phone.trim();

    // التحقق من الطول
    if (trimmedPhone.length < 10 || trimmedPhone.length > 15) {
        return {
            isValid: false,
            error: 'رقم الهاتف غير صحيح',
        };
    }

    // التحقق من الصيغة (يسمح بـ + و - و مسافات)
    const phoneRegex = /^[+]?[\d\s-()]+$/;
    if (!phoneRegex.test(trimmedPhone)) {
        return {
            isValid: false,
            error: 'صيغة رقم الهاتف غير صحيحة',
        };
    }

    // التحقق من عدد الأرقام (بعد إزالة الرموز)
    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return {
            isValid: false,
            error: 'رقم الهاتف يجب أن يحتوي على 10-15 رقماً',
        };
    }

    return {
        isValid: true,
    };
}

/**
 * التحقق من صحة الاسم
 * 
 * @param name - الاسم
 * @returns نتيجة التحقق
 * 
 * @example
 * ```typescript
 * const result = validateName('أحمد محمد');
 * ```
 */
export function validateName(name: string): ValidationResult {
    if (!name || typeof name !== 'string') {
        return {
            isValid: false,
            error: 'الاسم مطلوب',
        };
    }

    const trimmedName = name.trim();

    // التحقق من الطول
    if (trimmedName.length < 2) {
        return {
            isValid: false,
            error: 'الاسم قصير جداً (الحد الأدنى حرفان)',
        };
    }

    if (trimmedName.length > 100) {
        return {
            isValid: false,
            error: 'الاسم طويل جداً (الحد الأقصى 100 حرف)',
        };
    }

    // التحقق من الصيغة (حروف عربية وإنجليزية ومسافات فقط)
    const nameRegex = /^[\u0600-\u06FFa-zA-Z\s'-]+$/;
    if (!nameRegex.test(trimmedName)) {
        return {
            isValid: false,
            error: 'الاسم يجب أن يحتوي على حروف فقط',
        };
    }

    return {
        isValid: true,
    };
}

/**
 * التحقق من صحة نموذج تسجيل الدخول
 * 
 * @param data - بيانات النموذج
 * @returns نتيجة التحقق مع الأخطاء لكل حقل
 * 
 * @example
 * ```typescript
 * const result = validateLoginForm({
 *   email: 'user@example.com',
 *   password: 'MyP@ssw0rd',
 * });
 * ```
 */
export function validateLoginForm(data: {
    email: string;
    password: string;
}): ValidationResult {
    const errors: Record<string, string> = {};

    // التحقق من البريد الإلكتروني
    const emailResult = validateEmail(data.email);
    if (!emailResult.isValid && emailResult.error) {
        errors.email = emailResult.error;
    }

    // التحقق من كلمة المرور (تحقق أساسي فقط لتسجيل الدخول)
    if (!data.password || data.password.length === 0) {
        errors.password = 'كلمة المرور مطلوبة';
    } else if (data.password.length < 8) {
        errors.password = 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل';
    } else if (data.password.length > 128) {
        errors.password = 'كلمة المرور طويلة جداً';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * التحقق من صحة نموذج التسجيل
 * 
 * @param data - بيانات النموذج
 * @returns نتيجة التحقق مع الأخطاء لكل حقل
 * 
 * @example
 * ```typescript
 * const result = validateRegisterForm({
 *   name: 'أحمد محمد',
 *   email: 'user@example.com',
 *   password: 'MyP@ssw0rd',
 *   confirmPassword: 'MyP@ssw0rd',
 * });
 * ```
 */
export function validateRegisterForm(data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}): ValidationResult {
    const errors: Record<string, string> = {};

    // التحقق من الاسم
    const nameResult = validateName(data.name);
    if (!nameResult.isValid && nameResult.error) {
        errors.name = nameResult.error;
    }

    // التحقق من البريد الإلكتروني
    const emailResult = validateEmail(data.email);
    if (!emailResult.isValid && emailResult.error) {
        errors.email = emailResult.error;
    }

    // التحقق من كلمة المرور
    const passwordResult = validatePassword(data.password);
    if (!passwordResult.isValid && passwordResult.error) {
        errors.password = passwordResult.error;
    }

    // التحقق من تطابق كلمة المرور
    if (data.password !== data.confirmPassword) {
        errors.confirmPassword = 'كلمات المرور غير متطابقة';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * تنظيف البريد الإلكتروني
 * 
 * @param email - البريد الإلكتروني
 * @returns البريد الإلكتروني المنظف
 * 
 * @example
 * ```typescript
 * const cleaned = sanitizeEmail('  User@Example.COM  ');
 * // Returns: 'user@example.com'
 * ```
 */
export function sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
        return '';
    }
    return email.trim().toLowerCase();
}

/**
 * تنظيف رقم الهاتف
 * 
 * @param phone - رقم الهاتف
 * @returns رقم الهاتف المنظف (أرقام فقط مع +)
 * 
 * @example
 * ```typescript
 * const cleaned = sanitizePhoneNumber('+966 50 123 4567');
 * // Returns: '+966501234567'
 * ```
 */
export function sanitizePhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') {
        return '';
    }
    // الاحتفاظ بـ + في البداية فقط
    const hasPlus = phone.trim().startsWith('+');
    const digitsOnly = phone.replace(/\D/g, '');
    return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

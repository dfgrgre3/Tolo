/**
 * ============================================
 * ⭐ أداة التحقق الموحدة للمصادقة (Unified Validation)
 * ============================================
 * 
 * هذا هو المصدر الوحيد الموثوق لجميع عمليات التحقق من البيانات في نظام المصادقة
 * يتم استخدامه في جميع الطبقات (Client Hook, API Client, Auth Service)
 * 
 * ⚠️ IMPORTANT - الاستخدام الموحد:
 * 
 * 📁 CLIENT-SIDE:
 *   ✅ src/lib/auth-hook-enhanced.ts → يستخدم هذا الملف
 *   ✅ src/lib/api/auth-client.ts → يستخدم هذا الملف
 * 
 * 📁 SERVER-SIDE:
 *   ✅ src/lib/auth-service.ts → يستخدم هذا الملف
 * 
 * 📖 للاستخدام:
 *   import { authValidator } from '@/lib/auth/validation-interface'
 *   authValidator.validateEmail(email)
 *
 *   أو:
 *   import { validateEmail, validatePassword, validateTwoFactorCode } from '@/lib/auth/validation'
 * 
 * 📚 هذا يضمن:
 *   - التحقق المتسق عبر جميع الطبقات
 *   - عدم تكرار الكود
 *   - سهولة الصيانة والتحديث
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Email validation constants
 */
const EMAIL_MAX_LENGTH = 254; // RFC 5321 limit
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password validation constants
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

/**
 * Two-factor code validation constants
 */
const TWO_FACTOR_CODE_LENGTH = 6;
const TWO_FACTOR_CODE_REGEX = /^\d{6}$/;

/**
 * Login attempt ID validation constants
 */
const LOGIN_ATTEMPT_ID_MIN_LENGTH = 10;
const LOGIN_ATTEMPT_ID_MAX_LENGTH = 100;

/**
 * Validate and normalize email address
 * 
 * @param email - Email address to validate
 * @returns ValidationResult with isValid, error message, and normalized email
 * 
 * Validation rules:
 * - Must be a non-empty string
 * - Must not exceed 254 characters (RFC 5321)
 * - Must match email format regex
 * - Must not contain malicious patterns (.., leading/trailing dots)
 */
export function validateEmail(email: unknown): ValidationResult {
  // Check if email exists and is a string
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'البريد الإلكتروني مطلوب',
    };
  }

  // Trim and check if empty
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'البريد الإلكتروني مطلوب',
    };
  }

  // Check length (RFC 5321 limit)
  if (trimmed.length > EMAIL_MAX_LENGTH) {
    return {
      isValid: false,
      error: 'البريد الإلكتروني طويل جداً',
    };
  }

  // Normalize to lowercase
  const normalized = trimmed.toLowerCase();

  // Validate email format
  if (!EMAIL_REGEX.test(normalized)) {
    return {
      isValid: false,
      error: 'صيغة البريد الإلكتروني غير صحيحة',
    };
  }

  // Additional security: Check for potentially malicious email patterns
  if (normalized.includes('..') || normalized.startsWith('.') || normalized.endsWith('.')) {
    return {
      isValid: false,
      error: 'صيغة البريد الإلكتروني غير صحيحة',
    };
  }

  return {
    isValid: true,
    normalized,
  };
}

/**
 * Validate password
 * 
 * @param password - Password to validate
 * @returns ValidationResult with isValid and error message
 * 
 * Validation rules:
 * - Must be a non-empty string
 * - Must be at least 8 characters (security best practice)
 * - Must not exceed 128 characters (prevent DoS attacks)
 */
export function validatePassword(password: unknown): ValidationResult {
  // Check if password exists and is a string
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      error: 'كلمة المرور مطلوبة',
    };
  }

  // Check if empty
  if (password.length === 0) {
    return {
      isValid: false,
      error: 'كلمة المرور مطلوبة',
    };
  }

  // Check minimum length (security best practice)
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      isValid: false,
      error: 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل',
    };
  }

  // Check maximum length (prevent DoS attacks)
  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      isValid: false,
      error: 'كلمة المرور طويلة جداً',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Validate two-factor authentication code
 * 
 * @param code - Two-factor code to validate
 * @returns ValidationResult with isValid, error message, and normalized code
 * 
 * Validation rules:
 * - Must be a non-empty string
 * - Must be exactly 6 digits
 */
export function validateTwoFactorCode(code: unknown): ValidationResult {
  // Check if code exists and is a string
  if (!code || typeof code !== 'string') {
    return {
      isValid: false,
      error: 'رمز التحقق مطلوب',
    };
  }

  // Trim and check if empty
  const trimmed = code.trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'رمز التحقق مطلوب',
    };
  }

  // Validate format (must be 6 digits)
  if (trimmed.length !== TWO_FACTOR_CODE_LENGTH || !TWO_FACTOR_CODE_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'رمز التحقق يجب أن يكون مكون من 6 أرقام',
    };
  }

  return {
    isValid: true,
    normalized: trimmed,
  };
}

/**
 * Validate login attempt ID
 * 
 * @param loginAttemptId - Login attempt ID to validate
 * @returns ValidationResult with isValid, error message, and normalized ID
 * 
 * Validation rules:
 * - Must be a non-empty string
 * - Must be between 10 and 100 characters
 */
export function validateLoginAttemptId(loginAttemptId: unknown): ValidationResult {
  // Check if loginAttemptId exists and is a string
  if (!loginAttemptId || typeof loginAttemptId !== 'string') {
    return {
      isValid: false,
      error: 'معرف محاولة تسجيل الدخول مطلوب',
    };
  }

  // Trim and check if empty
  const trimmed = loginAttemptId.trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'معرف محاولة تسجيل الدخول مطلوب',
    };
  }

  // Validate length
  if (trimmed.length < LOGIN_ATTEMPT_ID_MIN_LENGTH || trimmed.length > LOGIN_ATTEMPT_ID_MAX_LENGTH) {
    return {
      isValid: false,
      error: 'معرف محاولة تسجيل الدخول غير صحيح',
    };
  }

  return {
    isValid: true,
    normalized: trimmed,
  };
}

/**
 * Validate login credentials (email + password)
 * 
 * @param credentials - Login credentials object
 * @returns ValidationResult with isValid and error message
 */
export function validateLoginCredentials(credentials: {
  email: unknown;
  password: unknown;
}): ValidationResult {
  // Validate email
  const emailResult = validateEmail(credentials.email);
  if (!emailResult.isValid) {
    return emailResult;
  }

  // Validate password
  const passwordResult = validatePassword(credentials.password);
  if (!passwordResult.isValid) {
    return passwordResult;
  }

  return {
    isValid: true,
  };
}

/**
 * Validate two-factor verification request
 * 
 * @param request - Two-factor verification request
 * @returns ValidationResult with isValid and error message
 */
export function validateTwoFactorRequest(request: {
  loginAttemptId?: unknown;
  challengeId?: unknown;
  code: unknown;
}): ValidationResult {
  // Check if loginAttemptId or challengeId is provided
  if (!request.loginAttemptId && !request.challengeId) {
    return {
      isValid: false,
      error: 'معرف محاولة تسجيل الدخول مطلوب',
    };
  }

  // Validate code
  const codeResult = validateTwoFactorCode(request.code);
  if (!codeResult.isValid) {
    return codeResult;
  }

  // Validate loginAttemptId if provided
  if (request.loginAttemptId) {
    const idResult = validateLoginAttemptId(request.loginAttemptId);
    if (!idResult.isValid) {
      return idResult;
    }
  }

  return {
    isValid: true,
  };
}

/**
 * Export constants for use in other files
 */
export const VALIDATION_CONSTANTS = {
  EMAIL_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  TWO_FACTOR_CODE_LENGTH,
  LOGIN_ATTEMPT_ID_MIN_LENGTH,
  LOGIN_ATTEMPT_ID_MAX_LENGTH,
} as const;


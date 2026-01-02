import { z } from 'zod';

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

 *   ✅ src/lib/api/auth-client.ts → يستخدم هذا الملف
 * 
 * 📁 SERVER-SIDE:
 *   ✅ src/lib/auth-service.ts → يستخدم هذا الملف
 * 
 * 📖 للاستخدام:
 *   import { emailSchema, passwordSchema } from '@/lib/auth/validation'
 *   const result = emailSchema.safeParse(email);
 * 
 * 📚 هذا يضمن:
 *   - التحقق المتسق عبر جميع الطبقات
 *   - عدم تكرار الكود
 *   - سهولة الصيانة والتحديث
 */

// ==================== SCHEMAS ====================

export const emailSchema = z
  .string()
  .min(1, 'البريد الإلكتروني مطلوب')
  .email('البريد الإلكتروني غير صالح')
  .max(255, 'البريد الإلكتروني طويل جداً')
  .transform((email) => email.trim().toLowerCase());

// Login password schema - only checks length, not strength
export const loginPasswordSchema = z
  .string()
  .min(8, 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل')
  .max(128, 'كلمة المرور طويلة جداً');

// Registration password schema - checks strength requirements
export const passwordSchema = z
  .string()
  .min(8, 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل')
  .max(128, 'كلمة المرور طويلة جداً')
  .regex(/[A-Z]/, 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل')
  .regex(/[a-z]/, 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل')
  .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل')
  .regex(/[^A-Za-z0-9]/, 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل');

export const nameSchema = z
  .string()
  .min(1, 'الاسم مطلوب')
  .max(100, 'الاسم طويل جداً')
  .regex(/^[\u0600-\u06FFa-zA-Z\s]+$/, 'الاسم يجب أن يحتوي على أحرف فقط')
  .optional();

export const twoFactorCodeSchema = z
  .string()
  .min(1, 'رمز التحقق مطلوب')
  .regex(/^\d{6}$/, 'رمز التحقق يجب أن يكون مكون من 6 أرقام');

export const loginAttemptIdSchema = z
  .string()
  .min(10, 'معرف محاولة تسجيل الدخول غير صحيح')
  .max(100, 'معرف محاولة تسجيل الدخول غير صحيح');


// ==================== DEPRECATED FUNCTIONS ====================

/**
 * @deprecated Use `emailSchema.safeParse` instead.
 */
export function validateEmail(email: unknown): ValidationResult {
  const result = emailSchema.safeParse(email);
  if (result.success) {
    return { isValid: true, normalized: result.data };
  }
  return { isValid: false, error: result.error.errors[0]?.message };
}

/**
 * @deprecated Use `passwordSchema.safeParse` instead.
 */
export function validatePassword(password: unknown): ValidationResult {
  const result = passwordSchema.safeParse(password);
  if (result.success) {
    return { isValid: true };
  }
  return { isValid: false, error: result.error.errors[0]?.message };
}

/**
 * @deprecated Use `twoFactorCodeSchema.safeParse` instead.
 */
export function validateTwoFactorCode(code: unknown): ValidationResult {
  const result = twoFactorCodeSchema.safeParse(code);
  if (result.success) {
    return { isValid: true, normalized: result.data };
  }
  return { isValid: false, error: result.error.errors[0]?.message };
}

/**
 * @deprecated Use `loginAttemptIdSchema.safeParse` instead.
 */
export function validateLoginAttemptId(loginAttemptId: unknown): ValidationResult {
  const result = loginAttemptIdSchema.safeParse(loginAttemptId);
  if (result.success) {
    return { isValid: true, normalized: result.data };
  }
  return { isValid: false, error: result.error.errors[0]?.message };
}

/**
 * Validation result interface
 * @deprecated This will be removed once all validation functions are replaced by Zod schemas.
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalized?: string;
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
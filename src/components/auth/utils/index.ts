/**
 * Auth Utils - Barrel Export
 * 
 * @module auth/utils
 * @description تصدير موحد لجميع الأدوات المساعدة للمصادقة
 */

// ============================================
// التحقق من الصحة (Validation)
// ============================================
export {
  validateEmail,
  validatePassword,
  validateTwoFactorCode,
  validatePhoneNumber,
  validateName,
  validateLoginForm,
  validateRegisterForm,
  sanitizeEmail,
  sanitizePhoneNumber,
} from './validation';

export type {
  ValidationResult,
  EmailValidationOptions,
  PasswordValidationOptions,
} from './validation';

// ============================================
// معالجة الأخطاء (Error Handling)
// ============================================
export {
  ErrorType,
  normalizeError,
  handleError,
  handleLoginError,
  handleRegisterError,
  handleTwoFactorError,
  getErrorMessage,
  isNetworkError,
  isRateLimitError,
  requiresCaptcha,
  formatRetryTime,
  createApiError,
} from './error-handler';

export type {
  ApiError,
  ErrorHandlerOptions,
} from './error-handler';

// ============================================
// قوة كلمة المرور (Password Strength)
// ============================================
export {
  getPasswordStrengthDisplay,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
} from './password-strength';

export type {
  PasswordStrengthDisplay,
} from './password-strength';

// ============================================
// معالجة الأخطاء القديمة (Legacy - للتوافق)
// ============================================
export {
  parseApiError,
  handleNetworkError,
  createFetchWithTimeout,
  fetchWithErrorHandling,
} from './error-handling';

export type {
  ApiError as LegacyApiError,
} from './error-handling';

// ============================================
// دوال مساعدة لنموذج تسجيل الدخول
// ============================================
export {
  validateForm,
  validateTwoFactorCode as validateTwoFactorCodeLegacy,
  formatLockoutTime,
  getRedirectPath,
  clearStoredRedirect,
} from './login-form.utils';

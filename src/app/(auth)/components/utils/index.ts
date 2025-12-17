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

// ============================================
// Type Guards (Runtime Type Checking)
// ============================================
export {
  isUser,
  isLoginResponse,
  isTwoFactorResponse,
  isApiError,
  isSession,
  isDeviceFingerprint,
  isJWTToken,
  isEmail,
  isPassword,
  isTwoFactorCode,
  assertIsUser,
  assertIsLoginResponse,
} from './type-guards';

// ============================================
// Error Boundary
// ============================================
export {
  AuthErrorBoundary,
  useErrorHandler,
} from './error-boundary';

// ============================================
// Performance Utilities
// ============================================
export {
  debounce,
  throttle,
  useDebouncedCallback,
  useThrottledCallback,
  useMemoizedValue,
  useStableCallback,
  useBatchedUpdates,
} from './performance';

// ============================================
// Security Utilities
// ============================================
export {
  generateCSRFToken,
  storeCSRFToken,
  getCSRFToken,
  validateCSRFToken,
  checkRateLimit,
  resetRateLimit,
  sanitizeInput,
  validateEmailSecurity,
  generateSecureRandomString,
  hashString,
  isSameOrigin,
  validateRequestHeaders,
} from './security';
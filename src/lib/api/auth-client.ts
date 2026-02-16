/**
 * Centralized API client for authentication endpoints
 * عميل API المركزي لمواقع المصادقة
 * 
 * هذا هو الملف الوحيد الموثوق لجميع استدعاءات API للمصادقة على العميل.
 * جميع المكونات على العميل يجب أن تستورد دوال API من هذا الملف.
 * 
 * للاستخدام:
 * - في Client Components: استورد دوال مثل loginUser, verifyTwoFactor, registerUser من هذا الملف
 * - لا تستورد من src/lib/auth-client.ts (ملف قديم للتخزين المحلي فقط)

 * 
 * الملفات المتعلقة:
 * - src/lib/auth-service.ts: الخدمة الأساسية على الخادم (server-side)
 * - src/auth.ts: نقطة التصدير الموحدة للمصادقة على الخادم (server-only)
 * - src/lib/auth-hook-enhanced.ts: Hook محسّن للمصادقة (useEnhancedAuth)
 * 
 * ملاحظة: Token يتم تخزينه في httpOnly cookie تلقائياً عند تسجيل الدخول الناجح
 */

import type {
  LoginRequest,
  LoginResponse,
  LoginErrorResponse,
  RegisterRequest,
  RegisterResponse,
  RegisterErrorResponse,
  TwoFactorVerifyRequest,
  TwoFactorVerifyResponse,
  TwoFactorErrorResponse,
  BiometricChallengeRequest,
  BiometricChallengeResponse,
  BiometricVerifyRequest,
  BiometricVerifyResponse,
  ApiErrorResponse,
} from '@/types/api/auth';
import { logger } from '@/lib/logger';
import { authValidator } from '@/lib/auth/validation-interface';
import type { AuthUser } from '@/lib/services/auth-service';

const API_TIMEOUT = 30000; // 30 seconds
const API_BASE_URL = '/api/auth';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
const CONNECTION_TIMEOUT = 30000; // 30 seconds for connection timeout

/**
 * Check if device is online
 */
function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Check if error is a network error
 */
function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = (error as Error).message || String(error);
  const errorName = (error as Error).name || '';

  return (
    errorName === 'TypeError' ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('Network request failed') ||
    errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
    errorMessage.includes('ERR_NETWORK_CHANGED') ||
    !isOnline()
  );
}

/**
 * Check if error is a timeout error
 */
function isTimeoutError(error: unknown): boolean {
  if (!error) return false;

  const errorName = (error as Error).name || '';
  const errorMessage = (error as Error).message || String(error);

  return (
    errorName === 'AbortError' ||
    errorMessage.includes('aborted') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('TIMED_OUT')
  );
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown, status?: number): boolean {
  if (status && RETRYABLE_STATUS_CODES.includes(status)) {
    return true;
  }

  if (isTimeoutError(error) || isNetworkError(error)) {
    return true;
  }

  return false;
}

/**
 * Generic fetch wrapper with timeout, retry logic, and comprehensive error handling
 * Improved with connection timeout and better error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<T> {
  // Check online status before making request
  if (!isOnline()) {
    throw {
      error: 'لا يوجد اتصال بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى.',
      code: 'NETWORK_ERROR',
    };
  }

  // Validate endpoint
  if (!endpoint || typeof endpoint !== 'string') {
    throw {
      error: 'مسار API غير صحيح',
      code: 'INVALID_ENDPOINT',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  // Add connection timeout for faster failure detection
  const connectionTimeoutId = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort(new Error('Connection timeout'));
    }
  }, CONNECTION_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    clearTimeout(connectionTimeoutId);

    // Handle empty response
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    const contentLength = response.headers.get('content-length');
    const hasContent = contentLength !== '0' && contentLength !== null;

    // Read response body once (can only be read once)
    let responseText = '';
    let responseData: unknown = null;

    try {
      responseText = await response.text();
      if (responseText && responseText.trim().length > 0) {
        // Check if it's HTML (error page) - this takes priority
        /* HTML check removed to enforce JSON handling */

        // Try to parse as JSON
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          // Not valid JSON and not HTML - this is unusual
          // Check if response should be JSON based on content-type
          if (!isJson) {
            const status = response.status;
            throw {
              error: 'استجابة غير صحيحة من الخادم - تنسيق غير متوقع',
              code: 'INVALID_RESPONSE_FORMAT',
              status,
            };
          }

          // Content-type says JSON but parsing failed
          const status = response.status;
          throw {
            error: 'فشل في معالجة استجابة الخادم',
            code: 'JSON_PARSE_ERROR',
            status,
          };
        }
      } else {
        // Empty response
        if (response.status === 204 || (response.status === 200 && !hasContent)) {
          // For login endpoint, empty response is an error
          if (endpoint === '/login') {
            throw {
              error: 'استجابة فارغة من الخادم. يرجى المحاولة مرة أخرى.',
              code: 'EMPTY_RESPONSE',
              status: response.status,
            };
          }
          return {} as T;
        }
      }
    } catch (readError: unknown) {
      // If error already has structure, re-throw it
      if (readError && (readError as { error?: string; code?: string }).error) {
        throw readError;
      }

      // Otherwise, create a generic error
      throw {
        error: 'فشل في قراءة استجابة الخادم',
        code: 'RESPONSE_READ_ERROR',
        status: response.status,
      };
    }

    // Handle non-OK responses
    if (!response.ok) {
      // Check if error is retryable and we haven't exceeded max retries
      const isRetryable = isRetryableError(null, response.status);

      if (isRetryable && retryCount < MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        await sleep(delay);

        // Retry the request
        return apiFetch<T>(endpoint, options, retryCount + 1);
      }

      // Handle error response
      if (responseData && typeof responseData === 'object') {
        // Check if responseData is empty object
        const responseDataKeys = Object.keys(responseData);
        if (responseDataKeys.length === 0) {
          // Empty object response - create proper error
          throw {
            error: `خطأ في الخادم: ${response.statusText || 'Unknown Error'} (${response.status})`,
            code: response.status === 429 ? 'RATE_LIMITED' :
              response.status === 404 ? 'NOT_FOUND' :
                response.status >= 500 ? 'SERVER_ERROR' :
                  'SERVER_RESPONSE_ERROR',
            status: response.status,
          };
        }

        // Valid JSON error response
        const error: Record<string, unknown> = {
          ...responseData,
          status: response.status,
        };

        // Ensure error has at least error message and code
        if (!error.error && !error.message) {
          error.error = `خطأ في الخادم: ${response.statusText || 'Unknown Error'} (${response.status})`;
        }

        // Add specific error codes based on status if not present
        if (!error.code) {
          if (response.status === 401) {
            error.code = 'UNAUTHORIZED';
          } else if (response.status === 403) {
            error.code = 'FORBIDDEN';
          } else if (response.status === 404) {
            error.code = 'NOT_FOUND';
          } else if (response.status === 429) {
            error.code = 'RATE_LIMITED';
          } else if (response.status >= 500) {
            error.code = 'SERVER_ERROR';
          } else {
            error.code = 'HTTP_ERROR';
          }
        }

        throw error;
      } else {
        // Non-JSON or empty error response
        const statusMessage = response.statusText || 'Unknown Error';
        let errorMessage = `خطأ في الخادم: ${statusMessage} (${response.status})`;

        if (responseText && responseText.trim().length > 0 && responseText.length < 200) {
          // Use text response if it's short enough
          errorMessage = responseText;
        }

        throw {
          error: errorMessage,
          code: response.status === 429 ? 'RATE_LIMITED' :
            response.status === 404 ? 'NOT_FOUND' :
              response.status >= 500 ? 'SERVER_ERROR' :
                'SERVER_RESPONSE_ERROR',
          status: response.status,
        };
      }
    }

    // Successful response - return parsed data
    if (responseData !== null) {
      return responseData as T;
    }

    // Empty successful response - for login endpoint, this is an error
    if (endpoint === '/login') {
      throw {
        error: 'استجابة فارغة من الخادم. يرجى المحاولة مرة أخرى.',
        code: 'EMPTY_RESPONSE',
        status: response.status,
      };
    }

    // For other endpoints, return empty object
    return {} as T;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    clearTimeout(connectionTimeoutId);

    // Check if error is retryable and we haven't exceeded max retries
    if (isRetryableError(error) && retryCount < MAX_RETRIES) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      await sleep(delay);

      // Retry the request
      return apiFetch<T>(endpoint, options, retryCount + 1);
    }

    // Handle timeout errors
    if (isTimeoutError(error)) {
      throw {
        error: 'انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
        code: 'REQUEST_TIMEOUT',
      };
    }

    // Handle network errors
    if (isNetworkError(error)) {
      throw {
        error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
        code: 'FETCH_ERROR',
      };
    }

    // Check if error is empty object first (but excluding standard Error objects)
    if (!error || (typeof error === 'object' && !(error instanceof Error) && Object.keys(error).length === 0)) {
      // Log this weird case
      if (process.env.NODE_ENV === 'development') {
        console.error('apiFetch caught empty error:', error);
      }

      throw {
        error: 'حدث خطأ غير متوقع أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.',
        code: 'UNEXPECTED_ERROR',
        originalError: String(error)
      };
    }

    // If error already has the expected structure, normalize it
    if (error && typeof error === 'object' && ((error as { error?: string }).error || (error as { code?: string }).code)) {
      // Ensure error message is present
      const normalizedError = {
        error: (error as { error?: string; message?: string }).error || (error as { error?: string; message?: string }).message || 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.',
        code: (error as { code?: string }).code || 'UNEXPECTED_ERROR',
        ...((error as { status?: number }).status !== undefined && { status: (error as { status?: number }).status }),
        ...((error as { retryAfterSeconds?: number }).retryAfterSeconds !== undefined && { retryAfterSeconds: (error as { retryAfterSeconds?: number }).retryAfterSeconds }),
        ...((error as { requiresCaptcha?: boolean }).requiresCaptcha !== undefined && { requiresCaptcha: (error as { requiresCaptcha?: boolean }).requiresCaptcha }),
      };
      throw normalizedError;
    }

    // Generic error - ensure we always have a proper error structure
    let errorMessage = 'حدث خطأ غير متوقع أثناء معالجة الطلب';
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    } else if (typeof error === 'string') {
      errorMessage = error || errorMessage;
    } else if ((error as { message?: string }).message) {
      errorMessage = (error as { message: string }).message;
    } else if ((error as { error?: string }).error) {
      errorMessage = (error as { error: string }).error;
    } else {
      errorMessage = String(error) || errorMessage;
    }

    throw {
      error: errorMessage,
      code: 'UNEXPECTED_ERROR',
      ...(process.env.NODE_ENV === 'development' && {
        originalError: String(error),
      }),
    };
  }
}

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
    // Note: Token might be missing if using HttpOnly cookies
    if ((!response.token || typeof response.token !== 'string' || response.token.trim().length === 0) && !response.user) {
      // Only throw if BOTH token and user are missing. If user is present, we assume cookie auth.
      throw {
        error: 'بيانات المصادقة غير موجودة في الاستجابة',
        code: 'MISSING_AUTH_DATA',
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

    const response = await apiFetch<TwoFactorVerifyResponse>('/2fa/verify-login', {
      method: 'POST',
      body: JSON.stringify({
        loginAttemptId: request.loginAttemptId || request.challengeId,
        code: request.code.trim(),
        trustDevice: request.trustDevice ?? false,
      }),
    });

    // Validate response
    if (!response || !response.user) {
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
 * Get Biometric Challenge
 */
export async function getBiometricChallenge(
  request: BiometricChallengeRequest | { type: 'authenticate' | 'register' | 'options'; userId?: string }
): Promise<BiometricChallengeResponse & { options?: unknown; challenge?: string }> {
  const body = typeof request === 'object' && 'type' in request
    ? { action: request.type === 'authenticate' ? 'authenticate' : request.type === 'register' ? 'register' : 'options', userId: (request as { userId?: string }).userId }
    : request;

  return apiFetch<BiometricChallengeResponse & { options?: any; challenge?: string }>('/biometric', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Verify Biometric Authentication
 */
export async function verifyBiometric(
  request: BiometricVerifyRequest
): Promise<BiometricVerifyResponse> {
  return apiFetch<BiometricVerifyResponse>('/biometric/authenticate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}


/**
 * Get Passkey Registration Options
 */
export async function getPasskeyRegistrationOptions(userId: string): Promise<unknown> {
  return apiFetch('/passkey/register-options', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

/**
 * Verify Passkey Registration
 */
export async function verifyPasskeyRegistration(data: unknown): Promise<unknown> {
  return apiFetch('/passkey/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get Passkey Authentication Options
 */
export async function getPasskeyAuthenticationOptions(userId?: string): Promise<unknown> {
  return apiFetch('/passkey/authenticate-options', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

/**
 * Verify Passkey Authentication
 */
export async function verifyPasskeyAuthentication(data: unknown): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/passkey/authenticate', {
    method: 'POST',
    body: JSON.stringify(data),
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
 * Get security logs
 */
export async function getSecurityLogs(params?: {
  page?: number;
  limit?: number;
}): Promise<{ logs: unknown[]; total: number }> {
  const queryParams = params
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : '';
  return apiFetch<{ logs: unknown[]; total: number }>(
    `/security-logs${queryParams}`,
    {
      method: 'GET',
    }
  );
}

/**
 * Get sessions
 */
export async function getSessions(): Promise<{
  sessions: unknown[];
  currentSessionId?: string;
}> {
  return apiFetch<{ sessions: unknown[]; currentSessionId?: string }>('/sessions', {
    method: 'GET',
  });
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<{
  message: string;
}> {
  return apiFetch<{ message: string }>(`/sessions/${sessionId}`, {
    method: 'DELETE',
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
  }>('/2fa/setup', {
    method: 'POST',
  });
}

/**
 * Verify TOTP code
 */
export async function verifyTOTPCode(code: string): Promise<{
  message: string;
}> {
  return apiFetch<{ message: string }>('/2fa/verify', {
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
  return apiFetch<TwoFactorVerifyResponse>('/2fa/verify-login', {
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
  return apiFetch<{ codes: string[]; remaining: number }>('/2fa/recovery-codes', {
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
  return apiFetch<{ codes: string[]; message: string }>('/2fa/recovery-codes', {
    method: 'POST',
  });
}

/**
 * Setup biometric authentication
 */
export async function setupBiometric(data: {
  credentialId: string;
  publicKey: string;
  deviceName?: string;
}): Promise<{
  message: string;
  credentialId: string;
  challenge: string;
}> {
  return apiFetch<{
    message: string;
    credentialId: string;
    challenge: string;
  }>('/biometric/setup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Register biometric credential
 */
export async function registerBiometric(data: {
  credential: any;
  deviceName?: string;
}): Promise<{
  message: string;
  credentialId: string;
}> {
  return apiFetch<{ message: string; credentialId: string }>('/biometric/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get biometric credentials
 */
export async function getBiometricCredentials(): Promise<{
  credentials: Array<{
    id: string;
    credentialId: string;
    deviceName: string;
    createdAt: string;
  }>;
}> {
  return apiFetch<{
    credentials: Array<{
      id: string;
      credentialId: string;
      deviceName: string;
      createdAt: string;
    }>;
  }>('/biometric', {
    method: 'GET',
  });
}

/**
 * Delete biometric credential
 */
export async function deleteBiometric(credentialId: string): Promise<{
  message: string;
}> {
  return apiFetch<{ message: string }>('/biometric/setup', {
    method: 'DELETE',
    body: JSON.stringify({ credentialId }),
  });
}

/**
 * Get OAuth status
 */
export async function getOAuthStatus(): Promise<{
  status: 'pending' | 'success' | 'error';
  user?: any;
  error?: string;
}> {
  return apiFetch<{
    status: 'pending' | 'success' | 'error';
    user?: any;
    error?: string;
  }>('/oauth/status', {
    method: 'GET',
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
  }>('/analytics', {
    method: 'GET',
  });
}

/**
 * Send magic link
 */
export async function sendMagicLink(email: string): Promise<{
  message: string;
}> {
  return apiFetch<{ message: string }>('/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Verify magic link
 */
export async function verifyMagicLink(token: string): Promise<{
  message: string;
  token?: string;
  user?: any;
}> {
  return apiFetch<{ message: string; token?: string; user?: any }>('/magic-link/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}



// Export types for use in components
export type {
  LoginRequest,
  LoginResponse,
  LoginErrorResponse,
  RegisterRequest,
  RegisterResponse,
  RegisterErrorResponse,
  TwoFactorVerifyRequest,
  TwoFactorVerifyResponse,
  TwoFactorErrorResponse,
};


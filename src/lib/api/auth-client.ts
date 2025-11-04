/**
 * Centralized API client for authentication endpoints
 * Provides type-safe methods for all auth operations
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

const API_TIMEOUT = 30000; // 30 seconds
const API_BASE_URL = '/api/auth';

/**
 * Generic fetch wrapper with timeout and error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

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

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const errorData: ApiErrorResponse = await response.json();
        const error: any = {
          ...errorData,
          status: response.status,
        };
        throw error;
      } else {
        throw {
          error: `خطأ في الخادم (${response.status})`,
          code: 'SERVER_RESPONSE_ERROR',
          status: response.status,
        };
      }
    }

    if (!isJson) {
      throw {
        error: 'استجابة غير صحيحة من الخادم',
        code: 'INVALID_RESPONSE_FORMAT',
        status: response.status,
      };
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Handle timeout
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      throw {
        error: 'انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
        code: 'REQUEST_TIMEOUT',
      };
    }

    // Handle network errors
    if (
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      !navigator.onLine
    ) {
      throw {
        error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
        code: 'FETCH_ERROR',
      };
    }

    // Return error if it already has the expected structure
    if (error.error || error.code) {
      throw error;
    }

    // Generic error
    throw {
      error: error.message || 'حدث خطأ غير متوقع',
      code: 'UNEXPECTED_ERROR',
    };
  }
}

/**
 * Login API
 */
export async function loginUser(
  request: LoginRequest
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/login', {
    method: 'POST',
    body: JSON.stringify(request),
  });
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
 */
export async function verifyTwoFactor(
  request: TwoFactorVerifyRequest
): Promise<TwoFactorVerifyResponse> {
  return apiFetch<TwoFactorVerifyResponse>('/two-factor', {
    method: 'POST',
    body: JSON.stringify({
      loginAttemptId: request.loginAttemptId || request.challengeId,
      code: request.code,
      trustDevice: request.trustDevice,
    }),
  });
}

/**
 * Get Biometric Challenge
 */
export async function getBiometricChallenge(
  request: BiometricChallengeRequest
): Promise<BiometricChallengeResponse> {
  return apiFetch<BiometricChallengeResponse>('/biometric', {
    method: 'POST',
    body: JSON.stringify(request),
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
export async function getCurrentUser(): Promise<{ user: any }> {
  return apiFetch<{ user: any }>('/me', {
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
 * Get security logs
 */
export async function getSecurityLogs(params?: {
  page?: number;
  limit?: number;
}): Promise<{ logs: any[]; total: number }> {
  const queryParams = params
    ? `?${new URLSearchParams(params as any).toString()}`
    : '';
  return apiFetch<{ logs: any[]; total: number }>(
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
  sessions: any[];
  currentSessionId?: string;
}> {
  return apiFetch<{ sessions: any[]; currentSessionId?: string }>('/sessions', {
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


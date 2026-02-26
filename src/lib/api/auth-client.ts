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
import apiClient from './api-client';
import type { AuthUser } from '@/lib/services/auth-service';

export async function loginUser(request: LoginRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', request);
}

export async function registerUser(request: RegisterRequest): Promise<RegisterResponse> {
  return apiClient.post<RegisterResponse>('/auth/register', request);
}

export async function verifyTwoFactor(request: TwoFactorVerifyRequest): Promise<TwoFactorVerifyResponse> {
  return apiClient.post<TwoFactorVerifyResponse>('/auth/2fa/verify-login', {
    loginAttemptId: request.loginAttemptId || request.challengeId,
    code: request.code.trim(),
    trustDevice: request.trustDevice ?? false,
  });
}

export async function getBiometricChallenge(
  request: BiometricChallengeRequest | { type: 'authenticate' | 'register' | 'options'; userId?: string }
): Promise<BiometricChallengeResponse & { options?: unknown; challenge?: string }> {
  const body = typeof request === 'object' && 'type' in request
    ? { action: request.type === 'authenticate' ? 'authenticate' : request.type === 'register' ? 'register' : 'options', userId: (request as any).userId }
    : request;
  return apiClient.post<any>('/auth/biometric', body);
}

export async function verifyBiometric(request: BiometricVerifyRequest): Promise<BiometricVerifyResponse> {
  return apiClient.post<BiometricVerifyResponse>('/auth/biometric/authenticate', request);
}

export async function getPasskeyRegistrationOptions(userId: string): Promise<unknown> {
  return apiClient.post('/auth/passkey/register-options', { userId });
}

export async function verifyPasskeyRegistration(data: unknown): Promise<unknown> {
  return apiClient.post('/auth/passkey/register', { data });
}

export async function getPasskeyAuthenticationOptions(userId?: string): Promise<unknown> {
  return apiClient.post('/auth/passkey/authenticate-options', { userId });
}

export async function verifyPasskeyAuthentication(data: unknown): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/passkey/authenticate', data);
}

export async function logoutUser(): Promise<void> {
  return apiClient.post('/auth/logout', {});
}

export async function getCurrentUser(): Promise<{ user: AuthUser }> {
  return apiClient.get<{ user: AuthUser }>('/auth/me');
}

export async function refreshToken(): Promise<{ token: string; refreshToken: string }> {
  return apiClient.post('/auth/refresh', {});
}

export async function changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/change-password', data);
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/forgot-password', { email });
}

export async function verifyResetCode(data: { email: string; code: string }): Promise<{ message: string; resetToken: string }> {
  return apiClient.post<{ message: string; resetToken: string }>('/auth/verify-reset-code', data);
}

export async function resetPassword(data: { token: string; password: string }): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/reset-password', data);
}

export async function verifyEmail(token: string): Promise<{ message: string; user?: any }> {
  return apiClient.post<{ message: string; user?: any }>('/auth/verify-email', { token });
}

export async function sendVerificationEmail(): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/send-verification', {});
}

export async function resendTwoFactorCode(data: { loginAttemptId: string; method?: 'email' | 'sms' }): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/resend-two-factor', data);
}

export async function getSecurityLogs(params?: { page?: number; limit?: number }): Promise<{ logs: unknown[]; total: number }> {
  const queryParams = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
  return apiClient.get<{ logs: unknown[]; total: number }>(`/auth/security-logs${queryParams}`);
}

export async function getSessions(): Promise<{ sessions: unknown[]; currentSessionId?: string }> {
  return apiClient.get<{ sessions: unknown[]; currentSessionId?: string }>('/auth/sessions');
}

export async function deleteSession(sessionId: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/auth/sessions/${sessionId}`);
}

export async function setupTOTP(): Promise<{ secret: string; qrCodeURL: string; manualEntryKey: string; recoveryCodes: string[]; message: string }> {
  return apiClient.post<any>('/auth/2fa/setup', {});
}

export async function verifyTOTPCode(code: string): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/2fa/verify', { code });
}

export async function verifyTOTPForLogin(data: { loginAttemptId: string; code: string }): Promise<TwoFactorVerifyResponse> {
  return apiClient.post<TwoFactorVerifyResponse>('/auth/2fa/verify-login', data);
}

export async function getRecoveryCodes(): Promise<{ codes: string[]; remaining: number }> {
  return apiClient.get<{ codes: string[]; remaining: number }>('/auth/2fa/recovery-codes');
}

export async function generateRecoveryCodes(): Promise<{ codes: string[]; message: string }> {
  return apiClient.post<{ codes: string[]; message: string }>('/auth/2fa/recovery-codes', {});
}

export async function setupBiometric(data: { credentialId: string; publicKey: string; deviceName?: string }): Promise<{ message: string; credentialId: string; challenge: string }> {
  return apiClient.post<{ message: string; credentialId: string; challenge: string }>('/auth/biometric/setup', data);
}

export async function registerBiometric(data: { credential: any; deviceName?: string }): Promise<{ message: string; credentialId: string }> {
  return apiClient.post<{ message: string; credentialId: string }>('/auth/biometric/register', data);
}

export async function getBiometricCredentials(): Promise<{ credentials: Array<{ id: string; credentialId: string; deviceName: string; createdAt: string }> }> {
  return apiClient.get<any>('/auth/biometric');
}

export async function deleteBiometric(credentialId: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>('/auth/biometric/setup', { body: JSON.stringify({ credentialId }) } as any);
}

export async function getOAuthStatus(): Promise<{ status: 'pending' | 'success' | 'error'; user?: any; error?: string }> {
  return apiClient.get<any>('/auth/oauth/status');
}

export async function getAuthStatus(): Promise<{ isAuthenticated: boolean; user?: any }> {
  return apiClient.get<any>('/auth/status');
}

export async function getAuthAnalytics(): Promise<{ loginAttempts: number; failedAttempts: number; successfulLogins: number; suspiciousActivity: number }> {
  return apiClient.get<any>('/auth/analytics');
}

export async function sendMagicLink(email: string): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/magic-link', { email });
}

export async function verifyMagicLink(token: string): Promise<{ message: string; token?: string; user?: any }> {
  return apiClient.post<{ message: string; token?: string; user?: any }>('/auth/magic-link/verify', { token });
}

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

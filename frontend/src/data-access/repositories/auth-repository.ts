/**
 * Auth Repository — all authentication API calls.
 * Uses apiClient for automatic cookie/token handling and retry logic.
 */
import { apiClient } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';
import type { User, UpdateProfilePayload } from '@/types/user';

// ────────────────────────────────────────────────────────────
// Request / Response types
// ────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  username?: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  accessToken?: string;
  requiresMFA?: boolean;
  mfaToken?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MFAVerifyPayload {
  code: string;
  mfaToken?: string;
}

// ────────────────────────────────────────────────────────────
// Repository
// ────────────────────────────────────────────────────────────

export const authRepository = {
  /** POST /api/auth/login */
  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>(apiRoutes.auth.login, payload),

  /** POST /api/auth/register */
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>(apiRoutes.auth.register, payload),

  /** POST /api/auth/logout */
  logout: () =>
    apiClient.post<void>(apiRoutes.auth.logout, {}),

  /** GET /api/auth/me */
  me: () =>
    apiClient.get<User>(apiRoutes.auth.me),

  /** POST /api/auth/refresh */
  refresh: () =>
    apiClient.post<AuthResponse>(apiRoutes.auth.refresh, {}),

  /** POST /api/auth/change-password */
  changePassword: (payload: ChangePasswordPayload) =>
    apiClient.post<void>(apiRoutes.auth.changePassword, payload),

  /** POST /api/auth/forgot-password */
  forgotPassword: (email: string) =>
    apiClient.post<void>(apiRoutes.auth.forgotPassword, { email }),

  /** POST /api/auth/reset-password */
  resetPassword: (token: string, password: string) =>
    apiClient.post<void>(apiRoutes.auth.resetPassword, { token, password }),

  /** POST /api/auth/verify-email */
  verifyEmail: (token: string) =>
    apiClient.post<void>(apiRoutes.auth.verifyEmail, { token }),

  /** POST /api/auth/resend-verification */
  resendVerification: () =>
    apiClient.post<void>(apiRoutes.auth.resendVerification, {}),

  /** PATCH /api/auth/profile */
  updateProfile: (payload: UpdateProfilePayload) =>
    apiClient.patch<User>(apiRoutes.auth.profile, payload),

  /** DELETE /api/auth/account */
  deleteAccount: (password: string) =>
    apiClient.delete<void>(`${apiRoutes.auth.deleteAccount}?password=${encodeURIComponent(password)}`),

  // ── Sessions ──
  /** GET /api/auth/sessions */
  getSessions: () =>
    apiClient.get<unknown[]>(apiRoutes.auth.sessions),

  /** DELETE /api/auth/sessions/:id */
  revokeSession: (id: string) =>
    apiClient.delete<void>(apiRoutes.auth.revokeSession(id)),

  // ── MFA ──
  /** POST /api/auth/mfa/setup */
  setupMFA: () =>
    apiClient.post<MFASetupResponse>(apiRoutes.auth.mfa.setup, {}),

  /** POST /api/auth/mfa/enable */
  enableMFA: (code: string) =>
    apiClient.post<void>(apiRoutes.auth.mfa.enable, { code }),

  /** POST /api/auth/mfa/disable */
  disableMFA: (code: string) =>
    apiClient.post<void>(apiRoutes.auth.mfa.disable, { code }),

  /** POST /api/auth/mfa/verify */
  verifyMFA: (payload: MFAVerifyPayload) =>
    apiClient.post<AuthResponse>(apiRoutes.auth.mfa.verify, payload),

  // ── Social ──
  /** GET /api/auth/social/:provider */
  socialLoginUrl: (provider: string) => apiRoutes.auth.social.login(provider),

  /** POST /api/auth/social/link */
  linkProvider: (provider: string, code: string) =>
    apiClient.post<void>(apiRoutes.auth.social.link, { provider, code }),

  /** POST /api/auth/social/unlink */
  unlinkProvider: (provider: string) =>
    apiClient.post<void>(apiRoutes.auth.social.unlink, { provider }),

  /** GET /api/auth/social/accounts */
  getLinkedAccounts: () =>
    apiClient.get<unknown[]>(apiRoutes.auth.social.accounts),
};

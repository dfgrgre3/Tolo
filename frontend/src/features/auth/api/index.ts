/**
 * Auth Feature API Gateway (P0-11)
 *
 * Centralizes all authentication HTTP services (login, mfa, passkeys, verification).
 */

export {
  forgotPassword,
  verifyForgotPasswordCode,
  resetPassword,
  verifyEmail,
  resendVerification,
  requestMagicLink,
  changePassword,
  type AuthActionResult,
} from "@/services/auth/auth-api-service";

export {
  login,
  verifyMfa,
  type LoginOutcome,
} from "@/services/auth/login-service";

export {
  registerPasskey,
  loginWithPasskey,
  type PasskeyResult,
} from "@/services/auth/passkey-service";

export {
  revokeSession,
  revokeOtherSessions,
  fetchSessions,
  stopImpersonationRaw,
  registerUserRaw,
  fetchUserProfile,
  updateUserProfile,
  setAvatar,
  clearAvatar,
  deleteUploadedFile,
  deleteAccount,
  markActivityRead,
  markAllActivitiesRead,
  fetchActivitiesRecent,
  resendVerificationEmail,
  startDataExport,
  fetchExportStatus,
  sendPhoneCode,
  verifyPhoneCode,
  requestEmailChange,
  verifyEmailChange,
  unlinkSocialProvider,
  fetchLinkedSocialAccounts,
  fetchMfaRecoveryStatus,
  setupMfaTotp,
  enableMfa,
  disableMfa,
  regenerateMfaRecoveryCodes,
  fetchSecurityEvents,
} from "./profile-gateway";

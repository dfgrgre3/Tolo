export {
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  requestMagicLink,
  verifyMagicLink,
} from "./auth-api-service";
export { verifyForgotPasswordCode } from "./auth-api-service";
export type { AuthActionResult } from "./auth-api-service";

export {
  sanitizeRedirectPath,
  isAuthPublicRoute,
  DEFAULT_AUTHENTICATED_ROUTE,
  DEFAULT_UNAUTHENTICATED_ROUTE,
} from "./navigation";
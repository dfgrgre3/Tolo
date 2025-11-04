'use client';

/**
 * @deprecated This file is deprecated. Please use '@/lib/api/auth-client' instead.
 * This file is kept for backward compatibility only.
 */

// Re-export everything from the new centralized API client
export {
  loginUser,
  verifyTwoFactor,
  type LoginRequest,
  type LoginResponse,
  type LoginErrorResponse,
  type TwoFactorVerifyRequest,
  type TwoFactorVerifyResponse,
  type TwoFactorErrorResponse,
} from '@/lib/api/auth-client';

// Legacy type alias for backward compatibility
export type ApiError = LoginErrorResponse;

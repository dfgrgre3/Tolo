"use client";

/**
 * Backward-Compatibility Facade (P0-11)
 *
 * All authentication context and state logic has moved to the canonical
 * Auth domain at `@/features/auth/state/auth-context`.
 */
export {
  AuthProvider,
  useAuthContext,
  type AuthUser,
  type AuthMeResponse,
  type AuthStatus,
  type AuthLoginResult,
  type AuthContextValue,
} from "@/features/auth/state/auth-context";

"use client";

/**
 * useAuth — public API for authentication state.
 *
 * Reads from the singleton AuthContext (see @/contexts/auth-context).
 * The actual GET /auth/me fetch is performed exactly once inside <AuthProvider>,
 * so calling this hook in 30+ components does NOT multiply network requests.
 *
 * Re-exports AuthUser for backward compatibility with all existing imports.
 */

export type { AuthUser } from "@/contexts/auth-context";
export { useAuthContext as useAuth } from "@/contexts/auth-context";

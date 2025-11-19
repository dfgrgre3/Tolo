"use client";

// Export unified auth system (new)
export { UnifiedAuthContext, useUnifiedAuth, UnifiedAuthProvider } from "@/components/auth/UnifiedAuthProvider";
export type { UnifiedAuthContextType } from "@/components/auth/UnifiedAuthProvider";
export type { User } from "@/components/auth/UnifiedAuthProvider";

// Legacy exports for backward compatibility
export { AuthContext, useAuth, AuthProvider } from "@/components/auth/UserProvider";
export type { AuthContextType } from "@/components/auth/UserProvider";

// Re-export User type from UnifiedAuthProvider as the primary source
export type { User as AuthUser } from "@/components/auth/UnifiedAuthProvider";
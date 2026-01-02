"use client";

/**
 * ============================================
 * ✅ Main Authentication Hook
 * ============================================
 * 
 * This is the primary hook for accessing authentication state and methods.
 * It re-exports useUnifiedAuth from the context, which is the single source of truth.
 * 
 * Usage:
 * import { useAuth } from '@/hooks/use-auth';
 * 
 * const { user, loginWithCredentials, logout } = useAuth();
 */

import { useUnifiedAuth } from '@/contexts/auth-context';
import type { User, UnifiedAuthContextType } from '@/components/auth/providers/UnifiedAuthProvider';

export { useUnifiedAuth as useAuth };
export type { User, UnifiedAuthContextType as AuthContextType };

export default useUnifiedAuth;

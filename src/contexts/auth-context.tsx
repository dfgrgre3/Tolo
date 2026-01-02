"use client";

/**
 * ✅ Central Export Point for Auth Context
 * 
 * This file serves as the public API for the Auth System.
 * It re-exports the implementation from @/components/auth/providers/UnifiedAuthProvider
 * to ensure a single source of truth.
 */

import { 
  UnifiedAuthProvider, 
  useUnifiedAuth, 
  UnifiedAuthContext, 
  type UnifiedAuthContextType 
} from '@/components/auth/providers/UnifiedAuthProvider';

// Re-export core components and types
export { 
  UnifiedAuthProvider, 
  useUnifiedAuth, 
  UnifiedAuthContext 
};

export type { UnifiedAuthContextType };

// Aliases for backward compatibility
export const AuthProvider = UnifiedAuthProvider;
export const useAuth = useUnifiedAuth;
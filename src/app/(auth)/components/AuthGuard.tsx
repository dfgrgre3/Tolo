'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnifiedAuth } from '@/contexts/auth-context';

export interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

/**
 * AuthGuard component - Advanced route protection
 * 
 * Protects routes by checking authentication status and redirects to login if needed.
 * Supports optional authentication requirement and custom fallback UI.
 * 
 * @example
 * ```tsx
 * <AuthGuard requireAuth={true} redirectTo="/login">
 *   <ProtectedContent />
 * </AuthGuard>
 * ```
 */
export const AuthGuard = React.memo(function AuthGuard({ 
  children, 
  redirectTo = '/login',
  fallback = null,
  requireAuth = true,
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useUnifiedAuth();

  useEffect(() => {
    // Only check authentication if required
    if (!requireAuth) {
      return;
    }

    // Wait for auth check to complete
    if (isLoading) {
      return;
    }

    // Redirect if not authenticated
    if (!isAuthenticated) {
      const currentPath = window.location.pathname;
      const encodedRedirect = encodeURIComponent(currentPath);
      router.push(`${redirectTo}?redirect=${encodedRedirect}`);
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, router]);

  // Show fallback while loading
  if (isLoading && requireAuth) {
    return <>{fallback || <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>}</>;
  }

  // Show children if auth is not required or user is authenticated
  if (!requireAuth || isAuthenticated) {
    return <>{children}</>;
  }

  // Show fallback if not authenticated
  return <>{fallback || null}</>;
});

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getTokenFromStorage } from '@/lib/auth-client';
import React from 'react';

export interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

/**
 * AuthGuard component
 * Protects routes by checking for authentication token
 * Redirects to login if not authenticated
 * 
 * @optimized - Uses memoization and efficient state management
 */
export const AuthGuard = React.memo(function AuthGuard({ 
  children, 
  redirectTo = '/login',
  fallback 
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(() => {
    // Early return for SSR
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const token = getTokenFromStorage();

    if (!token) {
      // Save current pathname for redirect after login
      const currentPath = pathname || window.location.pathname;
      
      // Validate path is safe (relative path only)
      const isValidPath = currentPath.startsWith('/') && 
                          !currentPath.startsWith('//') &&
                          !currentPath.includes('/login') && 
                          !currentPath.includes('/register');
      
      if (isValidPath) {
        // Include search params if they exist
        const searchParams = window.location.search;
        const fullPath = currentPath + searchParams;
        router.push(`${redirectTo}?redirect=${encodeURIComponent(fullPath)}`);
      } else {
        router.push(redirectTo);
      }
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
    }

    setIsLoading(false);
  }, [router, redirectTo, pathname]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const loadingFallback = useMemo(() => {
    return fallback || (
      <div 
        className="flex items-center justify-center min-h-screen" 
        role="status" 
        aria-label="جارٍ التحقق من المصادقة"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }, [fallback]);

  if (isLoading) {
    return loadingFallback;
  }

  if (!isAuthenticated) {
    return null; // Will redirect in the useEffect
  }

  return <>{children}</>;
});

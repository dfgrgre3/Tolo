"use client";

/**
 * AuthSessionWrapper component
 * Replaces SessionProviderWrapper - no longer uses next-auth
 * Using custom auth system (see src/lib/auth-service.ts)
 * 
 * This component simply wraps children without any next-auth dependencies
 * 
 * @optimized - Memoized to prevent unnecessary re-renders
 */

import React from 'react';

interface AuthSessionWrapperProps {
  session?: unknown | null;
  children: React.ReactNode;
}

/**
 * AuthSessionWrapper - No next-auth dependencies
 * Simply renders children since we're using custom auth system
 */
export const AuthSessionWrapper: React.FC<AuthSessionWrapperProps> = React.memo(
  function AuthSessionWrapper({ 
    children 
  }: AuthSessionWrapperProps) {
    // Simply return children - no session handling needed
    return <>{children}</>;
  }
);

AuthSessionWrapper.displayName = 'AuthSessionWrapper';

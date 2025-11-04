"use client";

/**
 * SessionProviderWrapper component
 * Simplified wrapper - no longer uses next-auth
 * Using custom auth system (see src/lib/auth-service.ts)
 * 
 * This component is kept for backward compatibility but no longer
 * requires or uses next-auth/react SessionProvider
 * 
 * @optimized - Memoized to prevent unnecessary re-renders
 */

import React from 'react';

// Define props locally to avoid any next-auth type dependencies
interface SessionProviderWrapperProps {
  session?: any | null;
  children: React.ReactNode;
}

/**
 * SessionProviderWrapper - Simplified version without next-auth
 * Simply renders children since we're using custom auth system
 */
export const SessionProviderWrapper: React.FC<SessionProviderWrapperProps> = React.memo(
  function SessionProviderWrapper({ 
    session, 
    children 
  }: SessionProviderWrapperProps) {
    // Simply return children since we're using custom auth system
    // The session prop is ignored but kept for backward compatibility
    return <>{children}</>;
  }
);

SessionProviderWrapper.displayName = 'SessionProviderWrapper';

"use client";

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { SessionProviderProps } from './types/session';
import React, { useEffect } from 'react';

/**
 * SessionProviderWrapper component
 * Wraps NextAuth SessionProvider for consistent session management
 * 
 * @optimized - Memoized to prevent unnecessary re-renders
 */
export const SessionProviderWrapper = React.memo(function SessionProviderWrapper({ 
  session, 
  children 
}: SessionProviderProps) {
  // If no session provider is needed, just return children
  // This prevents errors when next-auth endpoints are not configured
  if (!process.env.NEXT_PUBLIC_NEXTAUTH_URL) {
    return <>{children}</>;
  }

  return (
    <SessionProvider 
      session={session as Session | null}
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true}
      basePath="/api/auth"
      // Disable automatic refetching when offline
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  );
});


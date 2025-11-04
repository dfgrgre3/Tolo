"use client";

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { SessionProviderProps } from './types/session';
import React from 'react';

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
  return (
    <SessionProvider 
      session={session as Session | null}
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
});


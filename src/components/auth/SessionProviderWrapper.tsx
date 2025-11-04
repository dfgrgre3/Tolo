"use client";

// Removed next-auth dependency - using custom auth system
// import { SessionProvider } from 'next-auth/react';
// import type { Session } from 'next-auth';
import type { SessionProviderProps } from './types/session';
import React from 'react';

/**
 * SessionProviderWrapper component
 * Simplified wrapper that doesn't require next-auth
 * 
 * @optimized - Memoized to prevent unnecessary re-renders
 */
export const SessionProviderWrapper = React.memo(function SessionProviderWrapper({ 
  session, 
  children 
}: SessionProviderProps) {
  // Simply return children since we're using custom auth system
  // This wrapper is kept for backward compatibility
  return <>{children}</>;
});


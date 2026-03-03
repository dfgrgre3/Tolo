'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { WebSocketProvider } from '@/contexts/websocket-context';
import ClientLayoutProvider from '@/providers/ClientLayoutProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';

type GlobalProvidersProps = {
  children: React.ReactNode;
};

/**
 * GlobalProviders - Root provider composition.
 * 
 * Provider order matters:
 * 1. ClientLayoutProvider - Base client-side setup
 * 2. ThemeProvider - Theme management (must be early for FOUC prevention)
 * 3. AuthProvider - Authentication state (before any auth-dependent providers)
 * 4. ToastProvider - Notifications (can be used by auth for error toasts)
 * 5. WebSocketProvider - Real-time features (needs auth state)
 */
export function GlobalProviders({ children }: GlobalProvidersProps) {
  const [mounted, setMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <>
      <Suspense fallback={null}>
        <ClientLayoutProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <ToastProvider>
                {mounted && isReady ? (
                  <WebSocketProvider>
                    {children}
                  </WebSocketProvider>
                ) : (
                  <>{children}</>
                )}
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </ClientLayoutProvider>
      </Suspense>
    </>
  );
}


// No re-exports here to avoid circular dependencies. 
// Import contexts directly from '@/contexts/...'


'use client';

import React, { useEffect, useState } from 'react';
import { UnifiedAuthProvider } from '@/components/auth/UnifiedAuthProvider';
import { AuthProvider } from '@/components/auth/UserProvider';
import { ToastProvider } from '@/contexts/toast-context';
import { WebSocketProvider } from '@/contexts/websocket-context';
import ClientLayoutProvider from '@/app/ClientLayoutProvider';

type GlobalProvidersProps = {
  children: React.ReactNode;
};

export function GlobalProviders({ children }: GlobalProvidersProps) {
  const [mounted, setMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    // Small delay to ensure all providers are fully initialized
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  
  // CRITICAL: Always render AuthProvider synchronously - never conditionally
  // This ensures AuthProvider is always available when useAuth is called
  // Components can safely use useAuth() immediately, even during SSR
  // The providers are rendered immediately, not conditionally, so they're always available
  return (
    <UnifiedAuthProvider>
      <AuthProvider>
        <ClientLayoutProvider>
          <ToastProvider>
            {mounted && isReady ? (
              <WebSocketProvider>
                {children}
              </WebSocketProvider>
            ) : (
              // Render children immediately - AuthProvider is already available
              // This ensures Header can use useAuth() even during initial render
              <>{children}</>
            )}
          </ToastProvider>
        </ClientLayoutProvider>
      </AuthProvider>
    </UnifiedAuthProvider>
  );
}

export * from '@/contexts/toast-context';
export * from '@/contexts/websocket-context';

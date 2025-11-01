'use client';

import React, { useEffect, useState } from 'react';
import { AuthProvider } from '@/components/auth/UserProvider';
import { ToastProvider } from '@/contexts/toast-context';
import { WebSocketProvider } from '@/contexts/websocket-context';
import ClientLayoutProvider from '@/app/ClientLayoutProvider';

type GlobalProvidersProps = {
  children: React.ReactNode;
};

export function GlobalProviders({ children }: GlobalProvidersProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  try {
    return (
      <AuthProvider>
        <ClientLayoutProvider>
          <ToastProvider>
            {mounted ? (
              <WebSocketProvider>
                {children}
              </WebSocketProvider>
            ) : (
              <>{children}</>
            )}
          </ToastProvider>
        </ClientLayoutProvider>
      </AuthProvider>
    );
  } catch (error) {
    console.error('GlobalProviders error:', error);
    return <>{children}</>; // Fallback rendering
  }
}

export * from '@/contexts/toast-context';
export * from '@/contexts/websocket-context';

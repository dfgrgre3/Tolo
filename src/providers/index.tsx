'use client';

import React, { useEffect, useState, Suspense } from 'react';
// import removed
import { ToastProvider } from '@/contexts/toast-context';
import { WebSocketProvider } from '@/contexts/websocket-context';
import ClientLayoutProvider from '@/providers/ClientLayoutProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';

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
  
  // ✅ تم إزالة نظام تسجيل الدخول بالكامل من المشروع
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
            <ToastProvider>
              {mounted && isReady ? (
                <WebSocketProvider>
                  {children}
                </WebSocketProvider>
              ) : (
                <>{children}</>
              )}
            </ToastProvider>
          </ThemeProvider>
        </ClientLayoutProvider>
      </Suspense>
    </>
  );
}

export * from '@/contexts/toast-context';
export * from '@/contexts/websocket-context';

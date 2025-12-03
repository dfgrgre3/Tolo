'use client';

import React, { useEffect, useState } from 'react';
import { UnifiedAuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { WebSocketProvider } from '@/contexts/websocket-context';
import ClientLayoutProvider from '@/app/ClientLayoutProvider';
import { ThemeProvider } from '@/components/theme-provider';

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
  
  // ✅ النظام الموحد: UnifiedAuthProvider هو المصدر الوحيد للمصادقة
  // ✅ تم إزالة AuthProvider لتجنب التضارب - نظام واحد فقط يدير الحالة
  return (
    <UnifiedAuthProvider>
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
    </UnifiedAuthProvider>
  );
}

export * from '@/contexts/toast-context';
export * from '@/contexts/websocket-context';

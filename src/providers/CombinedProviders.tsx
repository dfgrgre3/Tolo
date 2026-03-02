import React from 'react';
// import removed
import { ToastProvider } from '../contexts/toast-context';
import { WebSocketProvider } from '../contexts/websocket-context';
import ClientLayoutProvider from '@/providers/ClientLayoutProvider';

/**
 * CombinedProviders - Legacy Provider Component
 * 
 * ⚠️ هذا الملف للتوافق مع الأنظمة القديمة
 * ✅ استخدم GlobalProviders من @/providers/index بدلاً منه
 * 
 * البنية الموحدة:
 * - UnifiedAuthProvider: المصدر الوحيد للمصادقة (تم إزالة AuthProvider لتجنب التضارب)
 */
export function CombinedProviders({ children }: { readonly children: React.ReactNode }) {
  return (
    <>
      <ClientLayoutProvider>
        <ToastProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </ToastProvider>
      </ClientLayoutProvider>
    </>
  );
}

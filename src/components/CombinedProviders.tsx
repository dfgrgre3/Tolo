import React from 'react';
import { AuthProvider } from './auth/UserProvider';
import { ToastProvider } from '../contexts/toast-context';
import { WebSocketProvider } from '../contexts/websocket-context';
import ClientLayoutProvider from '../app/ClientLayoutProvider';

export function CombinedProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClientLayoutProvider>
        <ToastProvider>
          <ToastProvider>
            <WebSocketProvider>
              {children}
            </WebSocketProvider>
          </ToastProvider>
        </ToastProvider>
      </ClientLayoutProvider>
    </AuthProvider>
  );
}

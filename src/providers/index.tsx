'use client';

import React, { Suspense } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { WebSocketProvider } from '@/contexts/websocket-context';
import ClientLayoutProvider from '@/providers/ClientLayoutProvider';
import { NotificationsProvider } from '@/providers/NotificationsProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HydrationFix } from '@/components/utils/HydrationFix';
import GlobalSettingsApplier from '@/components/layout/GlobalSettingsApplier';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false, // Disable refetch on window focus
      refetchOnReconnect: true, // Refetch when reconnecting
      refetchOnMount: true, // Refetch when mounting
      networkMode: 'online', // Only fetch when online
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

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

  
  return (
    <>
      <Suspense fallback={null}>
        <ClientLayoutProvider>
          <HydrationFix />
          <QueryClientProvider client={queryClient}>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              disableTransitionOnChange
            >
              <AuthProvider>
                <GlobalSettingsApplier>
                  <WebSocketProvider>
                    <NotificationsProvider>
                      <TooltipProvider>
                        {children}
                        <Toaster richColors closeButton position="top-center" />
                      </TooltipProvider>
                    </NotificationsProvider>
                  </WebSocketProvider>
                </GlobalSettingsApplier>
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </ClientLayoutProvider>
      </Suspense>
    </>
  );
}


// No re-exports here to avoid circular dependencies. 
// Import contexts directly from '@/contexts/...'


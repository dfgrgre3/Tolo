'use client';

import React, { Suspense } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { WebSocketProvider } from '@/contexts/websocket-context';
import ClientLayoutProvider from '@/providers/client-layout-provider';
import { NotificationsProvider } from '@/providers/notifications-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import Footer from '@/components/footer';
import ErrorBoundary from '@/components/error-boundary';
import { HydrationFix } from '@/components/hydration-fix';
import GlobalSettingsApplier from '@/components/layout/global-settings-applier';

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
  initialAuthHint?: boolean;
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
export function GlobalProviders({ children, initialAuthHint }: GlobalProvidersProps) {

  
  return (
    <ErrorBoundary variant="global">
      <Suspense fallback={null}>
        <ClientLayoutProvider>
          <HydrationFix />
          <QueryClientProvider client={queryClient}>
            <AuthProvider initialAuthHint={initialAuthHint}>
              <GlobalSettingsApplier>
                  <WebSocketProvider>
                    <NotificationsProvider>
                      <TooltipProvider>
                        {children}
                        <Footer />
                        <Toaster richColors closeButton position="top-center" />
                      </TooltipProvider>
                    </NotificationsProvider>
                  </WebSocketProvider>
                </GlobalSettingsApplier>
              </AuthProvider>
            </QueryClientProvider>
        </ClientLayoutProvider>
      </Suspense>
    </ErrorBoundary>
  );
}


// No re-exports here to avoid circular dependencies. 
// Import contexts directly from '@/contexts/...'

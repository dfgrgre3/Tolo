'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { WebSocketProvider } from '@/contexts/websocket-context';
import { SettingsProvider } from '@/contexts/settings-context';
import ClientLayoutProvider from '@/providers/client-layout-provider';
import { NotificationsProvider } from '@/providers/notifications-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import ErrorBoundary from '@/components/error-boundary';
import GlobalSettingsApplier from '@/components/layout/global-settings-applier';
import { LazyMotion, domAnimation } from 'framer-motion';
import { PerformanceProvider } from '@/components/providers/PerformanceProvider';
import { TimerBootstrap } from '@/components/providers/TimerBootstrap';
import { ReactQueryPersistence } from '@/providers/react-query-persistence';
import { EfficiencyProvider } from '@/hooks/use-efficiency';
import { OfflineSyncManager } from '@/components/providers/OfflineSyncManager';
import Footer from '@/components/Footer';
import { isCriticalError } from '@/lib/error-utils';

function makeQueryClient() {
  const isDev = process.env.NODE_ENV === 'development';
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 60s staleTime — cuts redundant refetches dramatically.
        // Data is still re-fetched on reconnect and when explicitly invalidated.
        staleTime: 60_000,
        // 10 min garbage-collect window (enough for navigation within a session)
        gcTime: 600_000,
        // Disable retry in development to speed up debugging, otherwise retry transient network errors
        retry: isDev ? false : (failureCount, error) => {
          if (failureCount >= 3 || isCriticalError(error)) {
            return false;
          }
          return true;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // Don't refetch on every component mount if data is still fresh
        refetchOnMount: false,
        networkMode: 'online',
      },
      mutations: {
        retry: 1,
        networkMode: 'online',
      },
    },
  });
}

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
  const [queryClient] = useState(makeQueryClient);

  return (
    <ErrorBoundary variant="global">
      <Suspense fallback={null}>
        <SettingsProvider>
          <EfficiencyProvider>
            <ClientLayoutProvider>
              <QueryClientProvider client={queryClient}>
                <ReactQueryPersistence />
                <OfflineSyncManager />
                <AuthProvider initialAuthHint={initialAuthHint}>
                  <GlobalSettingsApplier>
                    <WebSocketProvider>
                      <NotificationsProvider>
                        <TooltipProvider>
                          <LazyMotion features={domAnimation}>
                            <TimerBootstrap />
                            <PerformanceProvider key="performance-provider">
                              {children}
                            </PerformanceProvider>
                            <Footer key="footer-static" />
                          </LazyMotion>
                          <Toaster richColors closeButton position="top-center" />
                        </TooltipProvider>
                      </NotificationsProvider>
                    </WebSocketProvider>
                  </GlobalSettingsApplier>
                </AuthProvider>
              </QueryClientProvider>
            </ClientLayoutProvider>
          </EfficiencyProvider>
        </SettingsProvider>
      </Suspense>
    </ErrorBoundary>
  );
}

// No re-exports here to avoid circular dependencies.
// Import contexts directly from '@/contexts/...'


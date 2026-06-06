'use client';

import React, { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
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

const FooterLazy = dynamic(() => import('@/components/Footer'), {
  ssr: false,
  loading: () => <footer className="min-h-[100px] w-full" aria-hidden />,
});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 60 * 24,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,
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
                <AuthProvider initialAuthHint={initialAuthHint}>
                  <GlobalSettingsApplier>
                    <WebSocketProvider>
                      <NotificationsProvider>
                        <TooltipProvider>
                          <LazyMotion features={domAnimation} strict>
                            <TimerBootstrap />
                            <PerformanceProvider key="performance-provider">
                              {React.Children.toArray(children)}
                            </PerformanceProvider>
                            <FooterLazy key="footer-lazy" />
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

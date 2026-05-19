'use client';

import React, { Suspense, useState } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { WebSocketProvider } from '@/contexts/websocket-context';
import { SettingsProvider } from '@/contexts/settings-context';
import ClientLayoutProvider from '@/providers/client-layout-provider';
import { NotificationsProvider } from '@/providers/notifications-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import ErrorBoundary from '@/components/error-boundary';
import { HydrationFix } from '@/components/hydration-fix';
import { LazyMotion, domAnimation } from 'framer-motion';
import { PerformanceProvider } from '@/components/providers/PerformanceProvider';
import { ReactQueryPersistence } from '@/providers/react-query-persistence';

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

export function GlobalProviders({ children, initialAuthHint }: GlobalProvidersProps) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <ErrorBoundary variant="global">
      <Suspense fallback={null}>
        <SettingsProvider>
          <ClientLayoutProvider>
            <HydrationFix />
            <QueryClientProvider client={queryClient}>
              <ReactQueryPersistence />
              <AuthProvider initialAuthHint={initialAuthHint}>
                <WebSocketProvider>
                  <NotificationsProvider>
                    <TooltipProvider>
                      <LazyMotion features={domAnimation} strict>
                        <PerformanceProvider>
                          {children}
                        </PerformanceProvider>
                      </LazyMotion>
                      <Toaster richColors closeButton position="top-center" />
                    </TooltipProvider>
                  </NotificationsProvider>
                </WebSocketProvider>
              </AuthProvider>
            </QueryClientProvider>
          </ClientLayoutProvider>
        </SettingsProvider>
      </Suspense>
    </ErrorBoundary>
  );
}

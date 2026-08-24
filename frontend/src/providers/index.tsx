'use client';

import React, { Suspense, useState } from 'react';
import { WebSocketProvider } from '@/contexts/websocket-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { AuthProvider } from '@/contexts/auth-context';
import ClientLayoutProvider from '@/providers/client-layout-provider';
import { NotificationsProvider } from '@/providers/notifications-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import ErrorBoundary from '@/components/error-boundary';
import GlobalSettingsApplier from '@/components/layout/global-settings-applier';
import { ReactQueryPersistence } from '@/providers/react-query-persistence';
import { EfficiencyProvider } from '@/hooks/use-efficiency';
import { isCriticalError } from '@/lib/error-utils';
import { PerformanceProvider } from '@/components/providers/PerformanceProvider';
import { TimerBootstrap } from '@/components/providers/TimerBootstrap';
import { TimeCoordinatorProvider } from '@/providers/TimeCoordinatorProvider';
import { OfflineSyncManager } from '@/components/providers/OfflineSyncManager';
import { useAuth } from '@/hooks/use-auth';

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

// Composed providers for better organization and reduced nesting
const CoreProviders = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary variant="global">
    <Suspense fallback={null}>
      <ClientLayoutProvider>
        <QueryClientProvider client={useState(makeQueryClient)[0]}>
          <ReactQueryPersistence />
          {children}
        </QueryClientProvider>
      </ClientLayoutProvider>
    </Suspense>
  </ErrorBoundary>
);

const AppStateProviders = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>
    <AuthProvider>
      <EfficiencyProvider>
        <GlobalSettingsApplier>
          {children}
        </GlobalSettingsApplier>
      </EfficiencyProvider>
    </AuthProvider>
  </SettingsProvider>
);

/**
 * AuthGatedFeatureProviders — only activates WebSocket and Notifications
 * after the user is confirmed authenticated, avoiding unnecessary connections
 * for guest visitors (reduces bundle activation + server load).
 */
function AuthGatedFeatureProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <WebSocketProvider userId={user?.id}>
      <NotificationsProvider>
        {children}
      </NotificationsProvider>
    </WebSocketProvider>
  );
}

const FeatureProviders = ({ children }: { children: React.ReactNode }) => (
  <AuthGatedFeatureProviders>
    <Suspense fallback={null}>
      <OfflineSyncManager />
      {children}
    </Suspense>
  </AuthGatedFeatureProviders>
);

const UIProviders = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>
    <Suspense fallback={null}>
      <TimerBootstrap />
      <TimeCoordinatorProvider />
      <PerformanceProvider key="performance-provider">
        {children}
      </PerformanceProvider>
      <Toaster richColors closeButton position="top-center" />
    </Suspense>
  </TooltipProvider>
);

type GlobalProvidersProps = {
  children: React.ReactNode;
  initialAuthHint?: boolean;
};

/**
 * GlobalProviders - Consolidated root provider composition.
 *
 * Optimized provider tree with composed providers to reduce nesting depth:
 * - CoreProviders: Error handling, layout, React Query
 * - AppStateProviders: Settings, Auth, Theme, Efficiency
 * - FeatureProviders: WebSocket, Notifications, Offline sync (lazy loaded)
 * - UIProviders: Tooltips, Performance monitoring
 *
 * Framer Motion removed from global scope - import only where needed in specific components.
 * Heavy providers like OfflineSyncManager are lazy loaded to reduce initial bundle size.
 */
export function GlobalProviders({ children, initialAuthHint }: GlobalProvidersProps) {
  return (
    <CoreProviders>
      <AppStateProviders>
        <FeatureProviders>
          <UIProviders>
            {children}
          </UIProviders>
        </FeatureProviders>
      </AppStateProviders>
    </CoreProviders>
  );
}

// No re-exports here to avoid circular dependencies.
// Import contexts directly from '@/contexts/...'


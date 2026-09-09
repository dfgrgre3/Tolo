'use client';

import React, { Suspense, useState } from 'react';
import { WebSocketProvider } from '@/contexts/websocket-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { AuthProvider } from '@/contexts/auth-context';
import { NotificationsProvider } from '@/providers/notifications-provider';
import ClientLayoutProvider from '@/providers/client-layout-provider';
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
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';

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
function CoreRuntime({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <ErrorBoundary variant="global">
      <Suspense fallback={null}>
        <ClientLayoutProvider>
          <QueryClientProvider client={queryClient}>
          {/*
            ReactQueryPersistence renders here so it has access to the
            QueryClient. AuthProvider renders inside AppStateProviders
            below; the persister reads auth state via useAuth() and is
            ordered so AuthProvider is mounted before the first render of
            any useQuery() consumer that may need the restored cache.
          */}
            {children}
          </QueryClientProvider>
        </ClientLayoutProvider>
      </Suspense>
    </ErrorBoundary>
  );
}

const SessionRuntime = ({
  children,
  hasSessionHint,
}: {
  children: React.ReactNode;
  hasSessionHint: boolean;
}) => (
  <SettingsProvider>
    <AuthProvider hasSessionHint={hasSessionHint}>
      {children}
    </AuthProvider>
  </SettingsProvider>
);

const DataRuntime = ({ children }: { children: React.ReactNode }) => (
  <ReactQueryPersistence>
    <EfficiencyProvider>
      <GlobalSettingsApplier>{children}</GlobalSettingsApplier>
    </EfficiencyProvider>
  </ReactQueryPersistence>
);

const RealtimeRuntime = ({ children }: { children: React.ReactNode }) => (
  <AuthGatedFeatureProviders>
    <NotificationsProvider>
      <Suspense fallback={null}>
        <OfflineSyncManager />
        {children}
      </Suspense>
    </NotificationsProvider>
  </AuthGatedFeatureProviders>
);

const UIRuntime = ({ children }: { children: React.ReactNode }) => (
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

/*
 * SessionRuntime owns identity, DataRuntime owns query/persistence state,
 * RealtimeRuntime owns sockets/notifications, and UIRuntime owns visual and
 * lifecycle-only providers. Keep this order explicit because each layer
 * consumes the context established by the layer above it.
 */
const RuntimeProviders = ({
  children,
  hasSessionHint,
}: {
  children: React.ReactNode;
  hasSessionHint: boolean;
}) => (
  <CoreRuntime>
    <SessionRuntime hasSessionHint={hasSessionHint}>
      {/*
        ReactQueryPersistence must be INSIDE AuthProvider so it can read
        the current user via useAuth() and key the IndexedDB store by
        identity (see react-query-persistence.tsx). It still sits under
        QueryClientProvider from CoreProviders, so useQueryClient() works.
      */}
      <DataRuntime>
        <RealtimeRuntime>
          <UIRuntime>{children}</UIRuntime>
        </RealtimeRuntime>
      </DataRuntime>
    </SessionRuntime>
  </CoreRuntime>
);

/**
 * AuthGatedFeatureProviders — only activates WebSocket
 * after the user is confirmed authenticated, avoiding unnecessary connections
 * for guest visitors (reduces bundle activation + server load).
 */
function AuthGatedFeatureProviders({ children }: { children: React.ReactNode }) {
  const { user, authSessionVersion } = useAuth();
  return (
    <WebSocketProvider userId={user?.id} authSessionVersion={authSessionVersion}>
      {children}
    </WebSocketProvider>
  );
}

type GlobalProvidersProps = {
  children: React.ReactNode;
  hasSessionHint?: boolean;
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
 * Framer Motion: the heavier `motion` API is still imported per-component where
 * needed, but the lightweight `m` mini component requires a `LazyMotion`
 * ancestor to animate at all (otherwise it freezes at its `initial` props).
 * Header (via HeaderNotifications -> VirtualList) renders `m.*` on every route,
 * so `LazyMotion` is provided here, once, at the root of the app tree.
 * Heavy providers like OfflineSyncManager are lazy loaded to reduce initial bundle size.
 */
export function GlobalProviders({ children, hasSessionHint = false }: GlobalProvidersProps) {
  return (
    <MotionConfig reducedMotion="always" transition={{ duration: 0 }}>
      <LazyMotion features={domAnimation}>
        <RuntimeProviders hasSessionHint={hasSessionHint}>{children}</RuntimeProviders>
      </LazyMotion>
    </MotionConfig>
  );
}

// No re-exports here to avoid circular dependencies.
// Import contexts directly from '@/contexts/...'


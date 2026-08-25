"use client";

import * as React from "react";
import { logger } from '@/lib/logger';

// Admin section components (Stubs since admin was separated)
export const AdminSections = {
  Dashboard: () => null,
  Users: () => null,
  Analytics: () => null,
  Reports: () => null,
  Infrastructure: () => null,
  Settings: () => null,
  Coupons: () => null,
  Revenue: () => null,
};

// Charts lazy loading (Stubs)
export const ChartComponents = {
  DailyActiveUsers: () => null,
  DailyRegistrations: () => null,
  RoleDistribution: () => null,
};


// Hook for lazy loading components
export function useLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    fallback?: React.ReactNode;
    preload?: boolean;
  }
) {
  const [Component, setComponent] = React.useState<T | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    if (Component) return;
    setIsLoading(true);
    try {
      const loadedModule = await importFn();
      setComponent(() => loadedModule.default);
    } finally {
      setIsLoading(false);
    }
  }, [Component, importFn]);

  // Preload if requested
  React.useEffect(() => {
    if (options?.preload) {
      queueMicrotask(() => {
        load();
      });
    }
  }, [options?.preload, load]);

  return {
    Component,
    isLoading,
    load,
  };
}

// Hook for prefetching routes
export function useRoutePrefetch() {
  const prefetch = React.useCallback((route: string) => {
    // Prefetch the route using Next.js router
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = route;
    document.head.appendChild(link);
  }, []);

  const prefetchComponent = React.useCallback(
    async <T,>(importFn: () => Promise<T>) => {
      try {
        await importFn();
      } catch {
        // Silently fail
      }
    },
    []
  );

  return { prefetch, prefetchComponent };
}

// Hook for measuring component load time
export function useComponentMetrics(componentName: string) {
  const metrics = React.useRef({
    startTime: 0,
    endTime: 0,
  });

  const start = React.useCallback(() => {
    metrics.current.startTime = performance.now();
  }, []);

  const end = React.useCallback(() => {
    metrics.current.endTime = performance.now();
    const duration = metrics.current.endTime - metrics.current.startTime;
    logger.debug(`[Performance] ${componentName} loaded in ${duration.toFixed(2)}ms`);
    return duration;
  }, [componentName]);

  return { start, end };
}

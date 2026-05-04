"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Skeleton for admin sections loading state
function AdminSectionSkeleton({
  title,
  rows = 5,
}: {
  title: string;
  rows?: number;
}) {
  return (
    <div className="space-y-6 p-6" dir="rtl">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[300px] w-full animate-pulse bg-muted/50 rounded-xl" />
  );
}

// Admin section components with lazy loading
export const AdminSections = {
  // Dashboard - loaded immediately
  Dashboard: dynamic(() => import("@/app/(admin)/admin/page"), {
    ssr: false,
  }),

  // Users - loaded on demand
  Users: dynamic(() => import("@/app/(admin)/admin/users/page"), {
    loading: () => <AdminSectionSkeleton title="المستخدمين" />,
    ssr: false,
  }),

  // Analytics - loaded on demand
  Analytics: dynamic(() => import("@/app/(admin)/admin/analytics/page"), {
    loading: () => <AdminSectionSkeleton title="التحليلات" />,
    ssr: false,
  }),

  // Reports - loaded on demand
  Reports: dynamic(() => import("@/app/(admin)/admin/reports/page"), {
    loading: () => <AdminSectionSkeleton title="التقارير" />,
    ssr: false,
  }),

  // Infrastructure - loaded on demand (rarely used)
  Infrastructure: dynamic(() => import("@/app/(admin)/admin/infrastructure/page"), {
    loading: () => <AdminSectionSkeleton title="البنية التحتية" />,
    ssr: false,
  }),

  // Settings - loaded on demand
  Settings: dynamic(() => import("@/app/(admin)/admin/settings/page"), {
    loading: () => <AdminSectionSkeleton title="الإعدادات" />,
    ssr: false,
  }),

  // Coupons - loaded on demand
  Coupons: dynamic(() => import("@/app/(admin)/admin/coupons/page"), {
    loading: () => <AdminSectionSkeleton title="أكواد الخصم" />,
    ssr: false,
  }),

  // Revenue - loaded on demand (rarely used)
  Revenue: dynamic(() => import("@/app/(admin)/admin/revenue/page"), {
    loading: () => <AdminSectionSkeleton title="الإيرادات" />,
    ssr: false,
  }),
};

// Charts lazy loading
export const ChartComponents = {
  DailyActiveUsers: dynamic(
    () => import("@/app/(admin)/admin/analytics/charts").then((m) => m.DailyActiveUsersChart),
    {
      loading: () => <ChartSkeleton />,
      ssr: false,
    }
  ),
  DailyRegistrations: dynamic(
    () => import("@/app/(admin)/admin/analytics/charts").then((m) => m.DailyRegistrationsChart),
    {
      loading: () => <ChartSkeleton />,
      ssr: false,
    }
  ),
  RoleDistribution: dynamic(
    () => import("@/app/(admin)/admin/analytics/charts").then((m) => m.RoleDistributionChart),
    {
      loading: () => <ChartSkeleton />,
      ssr: false,
    }
  ),
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
      const module = await importFn();
      setComponent(() => module.default);
    } finally {
      setIsLoading(false);
    }
  }, [Component, importFn]);

  // Preload if requested
  React.useEffect(() => {
    if (options?.preload) {
      load();
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
    console.log(`[Performance] ${componentName} loaded in ${duration.toFixed(2)}ms`);
    return duration;
  }, [componentName]);

  return { start, end };
}

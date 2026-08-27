"use client";

import React from 'react';
import Link from 'next/link';
import { safeFetch } from '@/lib/safe-client-utils';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-auth';
import { RefreshCw, Target, ScrollText, Clock, ChevronLeft, AlertCircle } from "lucide-react";
import { DashSection, DashEmpty } from "../../shared/SectionShell";
import { DASH_CARD, DASH_GRID, DASH_PROGRESS } from "../../shared/design-system";
import { DailyProgressChart } from "./DailyProgressChart";

type AnalyticsData = {
  progressRate: number;
  skillsAcquired: number;
  studyHours: number;
  timestamp: string;
  dailyProgress: Array<{day: string; progress: number;}>;
};

const fetchAnalyticsData = async (signal?: AbortSignal): Promise<AnalyticsData> => {
  const { data, error } = await safeFetch<AnalyticsData>(
    '/api/analytics/weekly',
    signal ? { signal } : undefined
  );

  // Don't throw error if request was aborted
  if (error && error.name === 'AbortError') {
    throw error;
  }

  if (error || !data) {
    logger.error('Failed to fetch analytics data:', error);
    throw new Error(error?.message || "فشل جلب بيانات التحليلات بسبب خطأ في الخادم.");
  }

  return {
    progressRate: data.progressRate,
    skillsAcquired: data.skillsAcquired,
    studyHours: data.studyHours,
    dailyProgress: data.dailyProgress ?? [],
    timestamp: data.timestamp
  };
};

function AnalyticsSectionComponent() {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [requestLoading, setRequestLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const userId = isAuthenticated && user?.id ? user.id : null;

  const loadData = React.useCallback(async () => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRequestLoading(true);
    setError(null);
    try {
      const fetchedData = await fetchAnalyticsData(controller.signal);
      if (!controller.signal.aborted) {
        setData(fetchedData);
      }
    } catch (err) {
      // Don't log or show error if request was aborted (expected behavior)
      if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
      logger.error("Failed to fetch analytics data:", err);
      setError((err instanceof Error ? err.message : String(err)) || "فشل تحميل البيانات. الرجاء التحقق من اتصالك وإعادة المحاولة.");
    } finally {
      if (!controller.signal.aborted) {
        setRequestLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    if (!userId) {
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    (async () => {
      try {
        const fetchedData = await fetchAnalyticsData(controller.signal);
        if (!controller.signal.aborted) {
          setData(fetchedData);
        }
      } catch (err) {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
        logger.error("Failed to fetch analytics data:", err);
        setError((err instanceof Error ? err.message : String(err)) || "فشل تحميل البيانات. الرجاء التحقق من اتصالك وإعادة المحاولة.");
      } finally {
        if (!controller.signal.aborted) {
          setRequestLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    };
  }, [userId]);

  const isLoading = userId ? requestLoading : false;

  let cardContent;
  if (isLoading && !data) {
    cardContent = (
      <div className="space-y-4">
        <div className={DASH_GRID.cards3}>
          <div className="h-28 rounded-lg bg-muted border border-border animate-pulse" />
          <div className="h-28 rounded-lg bg-muted border border-border animate-pulse" />
          <div className="h-28 rounded-lg bg-muted border border-border animate-pulse" />
        </div>
        <div className="h-48 w-full rounded-lg bg-muted border border-border animate-pulse" />
      </div>
    );
  } else if (error) {
    cardContent = (
      <DashEmpty
        icon={AlertCircle}
        title="تعذر تحميل البيانات"
        description={error}
        action={
          <button
            onClick={loadData}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            إعادة المحاولة
          </button>
        }
      />
    );
  } else {
    cardContent = (
      <div key={data?.timestamp || 'initial-content'}>
        <div className={`${DASH_GRID.cards3} mb-4 ${isLoading ? 'opacity-50' : 'opacity-100'} transition-opacity`}>
          {/* 1. Progress Rate */}
          <div className={`${DASH_CARD.inner} border-primary/30 bg-primary/5 p-3`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="h-4 w-4 text-primary-strong" aria-hidden="true" />
              <p className="text-[11px] font-bold text-muted-foreground">نسبة الإنجاز الأسبوعي</p>
            </div>
            <p className="text-2xl font-black text-primary-strong tabular-nums">
              {isNaN(data?.progressRate ?? 0) ? 0 : (data?.progressRate ?? 0)}%
            </p>
            <div className={`${DASH_PROGRESS.track} mt-2`}>
              <div className={DASH_PROGRESS.bar} style={{ width: `${data?.progressRate || 0}%` }} />
            </div>
          </div>

          {/* 2. Completed tasks */}
          <div className={`${DASH_CARD.inner} p-3`}>
            <div className="flex items-center gap-1.5 mb-1">
              <ScrollText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <p className="text-[11px] font-bold text-muted-foreground">المهام المكتملة</p>
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {isNaN(data?.skillsAcquired ?? 0) ? 0 : (data?.skillsAcquired ?? 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">خلال هذا الأسبوع</p>
          </div>

          {/* 3. Study Hours */}
          <div className={`${DASH_CARD.inner} p-3`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <p className="text-[11px] font-bold text-muted-foreground">ساعات المذاكرة</p>
            </div>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
              {isNaN(data?.studyHours ?? 0) ? 0 : (data?.studyHours ?? 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">إجمالي وقت المذاكرة الأسبوعي</p>
          </div>
        </div>

        {data?.dailyProgress && data.dailyProgress.length > 0 && (
          <DailyProgressChart chartData={data.dailyProgress} />
        )}

        <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-dashed border-border pt-3 sm:flex-row">
          <p className="text-xs font-medium text-muted-foreground">
            آخر حساب:{' '}
            {data?.timestamp
              ? new Date(data.timestamp).toLocaleString('ar-EG', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'غير متاح'}
          </p>

          <Link href="/analytics" className="text-xs sm:text-sm font-bold text-primary-strong hover:bg-primary/10 px-2.5 py-1.5 rounded-md inline-flex items-center gap-1 whitespace-nowrap">
            عرض السجلات الكاملة
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DashSection
      title="إحصائيات الأسبوع"
      subtitle="لمحة سريعة عن أدائك خلال السبعة أيام الماضية"
      action={
        <button
          onClick={loadData}
          disabled={isLoading}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors disabled:opacity-50 ${
            isLoading ? 'bg-muted text-muted-foreground' : 'bg-card text-muted-foreground hover:text-primary-strong hover:border-primary'
          }`}
          title="تحديث البيانات"
          aria-label="تحديث البيانات"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      }
    >
      <div dir="rtl">{cardContent}</div>
    </DashSection>
  );
}

export const AnalyticsSection = React.memo(AnalyticsSectionComponent);
export default AnalyticsSection;

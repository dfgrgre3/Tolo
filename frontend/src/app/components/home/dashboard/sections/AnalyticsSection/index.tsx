"use client";

import React from 'react';
import Link from 'next/link';
import { safeFetch } from '@/lib/safe-client-utils';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-auth';
import { rpgCommonStyles } from "../../shared/styles";
import { Sword, Scroll, Clock, Target, RefreshCw } from "lucide-react";
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          <div className="h-32 rounded-xl bg-white/10 border border-white/5" />
          <div className="h-32 rounded-xl bg-white/10 border border-white/5" />
          <div className="h-32 rounded-xl bg-white/10 border border-white/5" />
        </div>
        <div className="h-48 w-full rounded-xl bg-white/10 border border-white/5" />
        <div className="flex justify-between items-center mt-6">
          <div className="h-4 w-48 bg-white/10 rounded" />
          <div className="h-10 w-32 bg-white/10 rounded-xl" />
        </div>
      </div>
    );
  } else if (error) {
    cardContent = (
      <div className="text-center py-12 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <Target className="h-10 w-10 text-red-400" />
        </div>
        <p className="text-xl font-bold text-gray-500 mb-2">تعذر تحميل البيانات</p>
        <p className="text-sm text-gray-600 mb-6">{error}</p>
        <button
          onClick={loadData}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-xl text-base font-bold hover:bg-primary/90 shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] inline-flex items-center gap-2"
        >
          <RefreshCw className="h-5 w-5" />
          إعادة المحاولة
        </button>
      </div>
    );
  } else {
    cardContent = (
      <div key={data?.timestamp || 'initial-content'}>
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          {/* 1. Progress Rate */}
          <div className={`${rpgCommonStyles.card} border-indigo-500/20 bg-indigo-500/10`}>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-indigo-400" />
              <p className="text-sm text-gray-400">نسبة الإنجاز الأسبوعي</p>
            </div>
            <p className={`text-3xl font-extrabold ${rpgCommonStyles.neonText} mt-1`}>
              {isNaN(data?.progressRate ?? 0) ? 0 : (data?.progressRate ?? 0)}%
            </p>
            <div className="h-2 bg-gray-700 rounded-full mt-3 overflow-hidden">
              <div
                className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                style={{ width: `${data?.progressRate || 0}%` }}
              />
            </div>
          </div>

          {/* 2. Completed tasks */}
          <div className={`${rpgCommonStyles.card} border-emerald-500/20 bg-emerald-500/10`}>
            <div className="flex items-center gap-2 mb-2">
              <Scroll className="h-5 w-5 text-emerald-400" />
              <p className="text-sm text-gray-400">المهام المكتملة</p>
            </div>
            <p className="text-3xl font-extrabold text-emerald-400 mt-1 drop-shadow-md">
              {isNaN(data?.skillsAcquired ?? 0) ? 0 : (data?.skillsAcquired ?? 0)}
            </p>
            <p className="text-xs text-emerald-500 mt-2">خلال هذا الأسبوع</p>
          </div>

          {/* 3. Study Hours */}
          <div className={`${rpgCommonStyles.card} border-amber-500/20 bg-amber-500/10`}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <p className="text-sm text-gray-400">ساعات المذاكرة</p>
            </div>
            <p className={`text-3xl font-extrabold ${rpgCommonStyles.goldText} mt-1`}>
              {isNaN(data?.studyHours ?? 0) ? 0 : (data?.studyHours ?? 0)}
            </p>
            <p className="text-xs text-amber-500 mt-2">إجمالي وقت المذاكرة الأسبوعي</p>
          </div>
        </div>

        {data?.dailyProgress && data.dailyProgress.length > 0 && (
          <DailyProgressChart chartData={data.dailyProgress} />
        )}

        <p className="font-semibold mb-4 text-xl text-gray-300 border-b border-dashed border-white/10 pb-3 flex items-center gap-2">
          <Sword className="h-5 w-5 text-red-400" />
          التقرير الأسبوعي
        </p>

        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span>
              آخر حساب:{' '}
              {data?.timestamp
                ? new Date(data.timestamp).toLocaleString('ar-EG', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'غير متاح'}
            </span>
          </div>
          
          <Link
            href="/analytics"
            className="rtl:flex-row-reverse rtl:justify-end px-6 py-3 bg-primary text-primary-foreground rounded-xl text-base font-bold hover:bg-primary/90 shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] inline-flex items-center gap-2"
          >
            عرض السجلات الكاملة
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-16 relative overflow-hidden p-4 md:p-8 max-w-5xl mx-auto rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl opacity-30 pointer-events-none" />
      
      <div className="relative z-10 text-right" dir="rtl">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-8">
          <div className="flex items-center gap-3 order-2 sm:order-1">
            <h2 className={`text-3xl md:text-4xl font-black ${rpgCommonStyles.goldText}`}>إحصائيات الأسبوع</h2>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 shadow-inner">
              <span className="text-2xl filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">📊</span>
            </div>
          </div>

          <div className="flex items-center gap-3 order-1 sm:order-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className={`p-2 rounded-full flex items-center justify-center border border-white/10 ${isLoading ? 'bg-white/5 cursor-not-allowed text-gray-500' : 'bg-white/5 text-primary hover:bg-white/10 hover:shadow-[0_0_10px_rgba(124,58,237,0.2)]'}`}
              title="تحديث البيانات"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? '' : ''}`} />
            </button>
          </div>
        </div>
        
        <div className="relative z-10">
          {cardContent}
        </div>
      </div>
    </div>
  );
}

export const AnalyticsSection = React.memo(AnalyticsSectionComponent);
export default AnalyticsSection;

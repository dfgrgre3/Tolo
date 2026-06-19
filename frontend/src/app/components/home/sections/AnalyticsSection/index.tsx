"use client";

import React from 'react';
import Link from 'next/link';
import { safeFetch, getSafeUserId } from '@/lib/safe-client-utils';
import { logger } from '@/lib/logger';
import StatusMessage from '@/app/(dashboard)/analytics/components/StatusMessage';
import { rpgCommonStyles } from "../../constants";
import { Sword, Scroll, Clock, Target, RefreshCw } from "lucide-react";
import { DailyProgressChart } from "./DailyProgressChart";

type AnalyticsData = {
  progressRate: number;
  skillsAcquired: number;
  studyHours: number;
  lastUpdate: string;
  dailyProgress: Array<{day: string; progress: number;}>;
};

const PATH_OPTIONS = ['الكل', 'البرمجة', 'التصميم'];

const fetchAnalyticsData = async (path: string): Promise<AnalyticsData> => {
  const userId = getSafeUserId();

  try {
    const { data, error } = await safeFetch<AnalyticsData>(
      `/api/analytics/weekly${userId ? `?userId=${userId}` : ''}${path !== 'الكل' ? `&path=${encodeURIComponent(path)}` : ''}`
    );

    if (error || !data) {
      const { data: summaryData } = await safeFetch<{
        totalMinutes: number;
        averageFocus: number;
        tasksCompleted: number;
        streakDays: number;
      }>(
        `/api/progress/summary${userId ? `?userId=${userId}` : ''}`
      );

      if (summaryData) {
        const progressRate = Math.min(100, Math.round(
          summaryData.tasksCompleted / 10 * 20 +
          summaryData.streakDays / 30 * 30 +
          summaryData.averageFocus / 100 * 50
        ));

        const dailyProgress = Array.from({ length: 7 }, (_, i) => ({
          day: `Lvl ${i + 1}`,
          progress: Math.min(100, Math.max(0, progressRate + (i % 3 === 0 ? 5 : -2)))
        }));

        return {
          progressRate,
          skillsAcquired: Math.floor(summaryData.tasksCompleted / 2),
          studyHours: Math.floor(summaryData.totalMinutes / 60),
          dailyProgress,
          lastUpdate: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
      }

      return {
        progressRate: 0,
        skillsAcquired: 0,
        studyHours: 0,
        dailyProgress: Array.from({ length: 7 }, (_, i) => ({
          day: `Lvl ${i + 1}`,
          progress: 0
        })),
        lastUpdate: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
    }

    return {
      progressRate: data.progressRate,
      skillsAcquired: data.skillsAcquired,
      studyHours: data.studyHours,
      dailyProgress: data.dailyProgress,
      lastUpdate: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  } catch (err) {
    logger.error('Error fetching analytics data:', err);
    throw new Error("فشل جلب سجل المعارك بسبب خطأ في الخادم.");
  }
};

function AnalyticsSectionComponent() {
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pathFilter, setPathFilter] = React.useState('الكل');

  const loadData = React.useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedData = await fetchAnalyticsData(path);
      setData(fetchedData);
    } catch (err) {
      logger.error("Failed to fetch analytics data:", err);
      setError((err instanceof Error ? err.message : String(err)) || "فشل تحميل البيانات. الرجاء التحقق من اتصالك وإعادة المحاولة.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData(pathFilter);
  }, [loadData, pathFilter]);

  let cardContent;
  if (isLoading && !data) {
    cardContent = (
      <div className="space-y-6 animate-pulse">
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
    cardContent = <StatusMessage text={error} isError={true} />;
  } else {
    cardContent = (
      <div key={pathFilter + data?.lastUpdate || 'initial-content'}>
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 transition-opacity duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          {/* 1. Progress Rate */}
          <div className={`${rpgCommonStyles.card} border-indigo-500/20 bg-indigo-500/10`}>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-indigo-400" />
              <p className="text-sm text-gray-400">إتمام المهام (Quest Completion)</p>
            </div>
            <p className={`text-3xl font-extrabold ${rpgCommonStyles.neonText} mt-1`}>
              {isNaN(data?.progressRate ?? 0) ? 0 : (data?.progressRate ?? 0)}%
            </p>
            <div className="h-2 bg-gray-700 rounded-full mt-3 overflow-hidden">
              <div
                className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                style={{ width: `${data?.progressRate || 0}%` }}
              />
            </div>
          </div>
          
          {/* 2. Skills Acquired */}
          <div className={`${rpgCommonStyles.card} border-emerald-500/20 bg-emerald-500/10`}>
            <div className="flex items-center gap-2 mb-2">
              <Scroll className="h-5 w-5 text-emerald-400" />
              <p className="text-sm text-gray-400">المهارات (XP Gained)</p>
            </div>
            <p className="text-3xl font-extrabold text-emerald-400 mt-1 transition-colors duration-1000 drop-shadow-md">
              {isNaN(data?.skillsAcquired ?? 0) ? 0 : (data?.skillsAcquired ?? 0)}
            </p>
            <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
              <span className="text-lg">+</span> 3 مهارات جديدة هذا الأسبوع
            </p>
          </div>
          
          {/* 3. Study Hours */}
          <div className={`${rpgCommonStyles.card} border-amber-500/20 bg-amber-500/10`}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <p className="text-sm text-gray-400">ساعات التدريب (Training)</p>
            </div>
            <p className={`text-3xl font-extrabold ${rpgCommonStyles.goldText} mt-1`}>
              {isNaN(data?.studyHours ?? 0) ? 0 : (data?.studyHours ?? 0)}
            </p>
            <p className="text-xs text-amber-500 mt-2">إجمالي وقت اللعب</p>
          </div>
        </div>

        {data?.dailyProgress && <DailyProgressChart chartData={data.dailyProgress} />}
        
        <p className="font-semibold mb-4 text-xl text-gray-300 border-b border-dashed border-white/10 pb-3 flex items-center gap-2">
          <Sword className="h-5 w-5 text-red-400" />
          تقرير المعركة الأسبوعي (Battle Report)
        </p>
        
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span>آخر تحديث للسيرفر: {data?.lastUpdate}</span>
          </div>
          
          <Link
            href="/analytics"
            className="rtl:flex-row-reverse rtl:justify-end px-6 py-3 bg-primary text-primary-foreground rounded-xl text-base font-bold hover:bg-primary/90 transition-all duration-300 shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] inline-flex items-center gap-2 transform hover:scale-105"
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
            <h2 className={`text-3xl md:text-4xl font-black ${rpgCommonStyles.goldText}`}>إحصائيات البطل</h2>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 shadow-inner">
              <span className="text-2xl filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">📊</span>
            </div>
          </div>

          <div className="flex items-center gap-3 order-1 sm:order-2">
            <div className="relative">
              <select
                value={pathFilter}
                onChange={(e) => setPathFilter(e.target.value)}
                disabled={isLoading}
                className={`p-2 pr-8 pl-4 rounded-lg border border-white/10 bg-black/40 text-gray-200 shadow-sm appearance-none transition-colors focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-white/5'}`}
              >
                {PATH_OPTIONS.map((path) => (
                  <option key={path} value={path} className="bg-slate-900 text-gray-200">{path}</option>
                ))}
              </select>
              <div className="absolute top-1/2 right-2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
            
            <button
              onClick={() => loadData(pathFilter)}
              disabled={isLoading}
              className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center border border-white/10 ${isLoading ? 'bg-white/5 cursor-not-allowed text-gray-500' : 'bg-white/5 text-primary hover:bg-white/10 hover:shadow-[0_0_10px_rgba(124,58,237,0.2)]'}`}
              title="تحديث البيانات"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
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

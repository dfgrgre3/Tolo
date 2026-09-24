'use client';

import { PageContainer } from "@/components/ui/page-container";
import {
  fetchAnalyticsPerformanceRaw,
  fetchAnalyticsPredictionsRaw,
  fetchAnalyticsWeeklyRaw,
  fetchProgressSummaryRaw,
} from "@/features/gamification/api/gamification-gateway";
import { Button } from "@/components/ui/button";
import { BarChart3, RefreshCw, Download, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";
import { useEffect, useState, useCallback, useMemo } from "react";
import AnalyticsTabs from "./AnalyticsTabs";
import {
  buildSubjectInsights,
  calcCoreScores,
  toAnalyticsCsv,
} from "@/features/analytics/lib/performance-calculations";
import type {
  PerformanceRaw,
  Prediction,
  SummaryData,
  WeeklyData,
} from "@/features/analytics/lib/types";

// This is a client component, so it cannot use `revalidate` (which is server-only).
// The page is always rendered on demand for the authenticated user.
export const dynamic = 'force-dynamic';

interface AnalyticsState {
  summary: SummaryData | null;
  weekly: WeeklyData | null;
  predictions: Prediction[];
  performance: PerformanceRaw | null;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const loadAnalyticsData = useCallback(async (signal?: AbortSignal) => {
    const failed: string[] = [];
    const fetchJson = async <T,>(loader: () => Promise<T>, name: string): Promise<T | null> => {
      try {
        return await loader();
      } catch (e) {
        if (signal?.aborted) return null;
        logger.error(`Error fetching ${name} data:`, e);
        failed.push(name);
        return null;
      }
    };

    // Session-scoped: the backend resolves the user from the JWT, so no
    // ?userId= is appended (IDOR/BOLA hardening).
    const [summary, weekly, predictionsResp, performance] = await Promise.all([
      fetchJson(() => fetchProgressSummaryRaw<SummaryData>(), "summary"),
      fetchJson(() => fetchAnalyticsWeeklyRaw<WeeklyData>(), "weekly"),
      fetchJson(
        () => fetchAnalyticsPredictionsRaw<{ success: boolean; predictions: Prediction[] }>(),
        "predictions"
      ),
      fetchJson(
        () => fetchAnalyticsPerformanceRaw<PerformanceRaw>("?hours=168"),
        "performance"
      ),
    ]);

    const predictions = predictionsResp?.success ? predictionsResp.predictions : [];

    return { result: { summary, weekly, predictions, performance }, failed };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const controller = new AbortController();
    try {
      const { result, failed } = await loadAnalyticsData(controller.signal);
      setData(result);
      setErrors(failed);
    } catch (e) {
      logger.error('Error loading analytics page:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [loadAnalyticsData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { result, failed } = await loadAnalyticsData();
      if (cancelled) return;
      setData(result);
      setErrors(failed);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadAnalyticsData]);

  const scores = useMemo(
    () => calcCoreScores(data?.summary ?? null, data?.weekly ?? null, data?.performance ?? null),
    [data],
  );

  const download = useCallback((content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportJson = useCallback(() => {
    if (!data) return;
    download(
      JSON.stringify({ ...data, scores, exportedAt: new Date().toISOString() }, null, 2),
      `analytics-${new Date().toISOString().split("T")[0]}.json`,
      "application/json",
    );
  }, [data, scores, download]);

  const handleExportCsv = useCallback(() => {
    if (!data) return;
    const insights = buildSubjectInsights(data.weekly, data.performance);
    download(
      toAnalyticsCsv({ summary: data.summary, weekly: data.weekly, scores, insights }),
      `analytics-${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8",
    );
  }, [data, scores, download]);

  if (loading) {
    return (
      <PageContainer size="xl" spacing="lg">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">
              {"التحليلات والإحصائيات"}
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground" role="status" aria-live="polite">
            <RefreshCw className="h-5 w-5 animate-spin" />
            جارٍ تحميل بيانات التحليلات…
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-card/40 animate-pulse border border-white/5" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="xl" spacing="lg">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">
            {"التحليلات والإحصائيات"}
          </h1>
        </div>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
          {"تابع أداءك التعليمي وتطورك مع تحليلات شاملة ومفصلة"}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> {"تحديث البيانات"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            disabled={!data}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> {"تصدير JSON"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!data}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" /> {"تصدير CSV"}
          </Button>
        </div>
        {errors.length > 0 && (
          <div className="mt-4 mx-auto max-w-2xl flex items-center gap-2 justify-center text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2" role="alert">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            تعذّر تحميل: {errors.join("، ")} — تُعرض باقي البيانات المتاحة.
          </div>
        )}
      </div>

      <AnalyticsTabs
        summary={data?.summary ?? null}
        weekly={data?.weekly ?? null}
        predictions={data?.predictions ?? []}
        performance={data?.performance ?? null}
      />
    </PageContainer>
  );
}

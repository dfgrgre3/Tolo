import { unstable_cache } from "next/cache";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { BarChart3, RefreshCw, Download } from "lucide-react";
import { ensureUser } from "@/lib/user-utils";
import { logger } from "@/lib/logger";
import AnalyticsTabs from "./AnalyticsTabs";

export const revalidate = 60;

type WeeklyData = {
  bySubject: Record<string, number>;
  byDay: { date: string | Date; minutes: number }[];
};

type SummaryData = {
  totalMinutes: number;
  averageFocus: number;
  tasksCompleted: number;
  streakDays: number;
};

type PredictionsData = {
  period: string;
  predictedScore: number;
  confidence: number;
  milestones: Array<{ date: string; goal: string; status: string }>;
  recommendations: string[];
};

/** Cached loader, revalidates every 60 seconds */
const loadAnalyticsData = unstable_cache(async (userId: string) => {
  const safeFetch = async <T,>(url: string, name: string): Promise<T | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch (e) {
      logger.error(`Error fetching ${name} data:`, e);
      return null;
    }
  };

  const [summary, weekly, predictionsResp, performance] = await Promise.all([
    safeFetch<SummaryData>(`/api/progress/summary?userId=${userId}`, "summary"),
    safeFetch<WeeklyData>(`/api/analytics/weekly?userId=${userId}`, "weekly"),
    safeFetch<{ success: boolean; predictions: PredictionsData[] }>(
      `/api/analytics/predictions?userId=${userId}`,
      "predictions"
    ),
    safeFetch<Record<string, unknown>>(
      `/api/analytics/performance?hours=168`,
      "performance"
    ),
  ]);

  const predictions = predictionsResp?.success ? predictionsResp.predictions : [];

  return { summary, weekly, predictions, performance };
});

export async function AnalyticsPage() {
  const userId = await ensureUser();
  const { summary, weekly, predictions, performance } = await loadAnalyticsData(userId);

  const handleExport = () => {
    const exportData = {
      summary,
      weekly,
      predictions,
      performance,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <PageContainer size="xl" spacing="lg">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">
            التحليلات والإحصائيات
          </h1>
        </div>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
          تابع أداءك التعليمي وتطورك مع تحليلات شاملة ومفصلة
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> تحديث البيانات
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> تصدير البيانات
          </Button>
        </div>
      </div>

      <AnalyticsTabs
        summary={summary}
        weekly={weekly}
        predictions={predictions}
        performance={performance}
      />
    </PageContainer>
  );
}

const AnalyticsPageWithAuth = () => <AnalyticsPage />;
export default AnalyticsPageWithAuth;

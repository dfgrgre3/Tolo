import { unstable_cache } from "next/cache";
import dynamic from "next/dynamic";
import { PageContainer } from "@/components/ui/page-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  Target,
  Calendar,
  Zap,
  Brain,
  RefreshCw,
  Download,
  Activity,
  BookOpen,
} from "lucide-react";
import { ensureUser } from "@/lib/user-utils";
import { logger } from "@/lib/logger";
export const revalidate = 60;
const LoadingFallback = () => (
  <div className="w-full h-64 bg-card/20 animate-pulse rounded-[2rem] border border-white/5 flex items-center justify-center">
    <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
  </div>
);

// `ssr: false` keeps the chart.js / recharts dependencies (loaded
// transitively by the *Canvas sub-components) out of the server bundle
// AND out of the client main bundle. They stream in as separate chunks
// after hydration, dramatically improving LCP and FCP on the analytics
// page.
const OverviewStats = dynamic(() => import("./components/OverviewStats"), { ssr: false, loading: LoadingFallback });
const WeeklyChart = dynamic(() => import("./components/WeeklyChart"), { ssr: false, loading: LoadingFallback });
const PerformanceMetrics = dynamic(() => import("./components/PerformanceMetrics"), { ssr: false, loading: LoadingFallback }) as React.ComponentType<{
  summary: SummaryData | null;
  weekly: WeeklyData | null;
  performanceMetrics: Record<string, unknown> | null;
}>;
const PredictionsSection = dynamic(() => import("./components/PredictionsSection"), { ssr: false, loading: LoadingFallback });
const SubjectDistribution = dynamic(() => import("./components/SubjectDistribution"), { ssr: false, loading: LoadingFallback });
const TimeTrends = dynamic(() => import("./components/TimeTrends"), { ssr: false, loading: LoadingFallback });
const StudyPatterns = dynamic(() => import("./components/StudyPatterns"), { ssr: false, loading: LoadingFallback });

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
    safeFetch<{ success: boolean; predictions: PredictionsData[] }>(`/api/analytics/predictions?userId=${userId}`, "predictions"),
    safeFetch<Record<string, unknown>>(`/api/analytics/performance?hours=168`, "performance"),
  ]);

  const predictions = predictionsResp?.success ? predictionsResp.predictions : [];

  return { summary, weekly, predictions, performance };
});

export async function AnalyticsPage() {
  const userId = await ensureUser();
  const { summary, weekly, predictions, performance } = await loadAnalyticsData(userId);

  const handleExport = () => {
    const exportData = { summary, weekly, predictions, performance, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
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
          <Button variant="outline" size="sm" onClick={() => location.reload()} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> تحديث البيانات
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" /> تصدير البيانات
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">نظرة عامة</span>
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">الأسبوعي</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">الأداء</span>
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">المواد</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">الاتجاهات</span>
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">الأنماط</span>
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">التنبؤات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewStats summary={summary} weekly={weekly} />
        </TabsContent>
        <TabsContent value="weekly" className="space-y-6">
          <WeeklyChart weekly={weekly} />
        </TabsContent>
        <TabsContent value="performance" className="space-y-6">
          <PerformanceMetrics summary={summary} weekly={weekly} performanceMetrics={performance} />
        </TabsContent>
        <TabsContent value="subjects" className="space-y-6">
          <SubjectDistribution weekly={weekly} />
        </TabsContent>
        <TabsContent value="trends" className="space-y-6">
          <TimeTrends weekly={weekly} />
        </TabsContent>
        <TabsContent value="patterns" className="space-y-6">
          <StudyPatterns weekly={weekly} />
        </TabsContent>
        <TabsContent value="predictions" className="space-y-6">
          <PredictionsSection predictions={predictions} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

const AnalyticsPageWithAuth = () => <AnalyticsPage />;
export default AnalyticsPageWithAuth;

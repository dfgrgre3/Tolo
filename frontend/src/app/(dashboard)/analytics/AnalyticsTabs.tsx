'use client';

// This is a Client Component wrapper for the analytics page.
// `next/dynamic` with `ssr: false` is only allowed inside Client Components
// in Next.js 15+. We isolate the chart / heavy components here so that
// the page itself can stay a Server Component that pre-fetches the data
// via `unstable_cache`. The chart.js / recharts dependencies are loaded
// as separate client chunks after hydration, dramatically improving
// LCP and FCP on the analytics page.

import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";
import {
  Activity,
  BookOpen,
  Brain,
  Calendar,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

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

const LoadingFallback = () => (
  <div className="w-full h-64 bg-card/20 animate-pulse rounded-[2rem] border border-white/5 flex items-center justify-center">
    <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
  </div>
);

// All chart-bearing sub-components are loaded only on the client.
// They share the small LoadingFallback above.
const OverviewStats = dynamic(
  () => import("./components/OverviewStats"),
  { ssr: false, loading: LoadingFallback }
);

const WeeklyChart = dynamic(
  () => import("./components/WeeklyChart"),
  { ssr: false, loading: LoadingFallback }
);

const PerformanceMetrics = dynamic(
  () => import("./components/PerformanceMetrics"),
  { ssr: false, loading: LoadingFallback }
) as React.ComponentType<{
  summary: SummaryData | null;
  weekly: WeeklyData | null;
  performanceMetrics: Record<string, unknown> | null;
}>;

const PredictionsSection = dynamic(
  () => import("./components/PredictionsSection"),
  { ssr: false, loading: LoadingFallback }
);

const SubjectDistribution = dynamic(
  () => import("./components/SubjectDistribution"),
  { ssr: false, loading: LoadingFallback }
);

const TimeTrends = dynamic(
  () => import("./components/TimeTrends"),
  { ssr: false, loading: LoadingFallback }
);

const StudyPatterns = dynamic(
  () => import("./components/StudyPatterns"),
  { ssr: false, loading: LoadingFallback }
);

interface AnalyticsTabsProps {
  summary: SummaryData | null;
  weekly: WeeklyData | null;
  predictions: PredictionsData[];
  performance: Record<string, unknown> | null;
}

export default function AnalyticsTabs({
  summary,
  weekly,
  predictions,
  performance,
}: AnalyticsTabsProps) {
  return (
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
        <PerformanceMetrics
          summary={summary}
          weekly={weekly}
          performanceMetrics={performance}
        />
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
  );
}

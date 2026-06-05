'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useIsMounted } from '@/lib/safe-client-utils';

/**
 * WeeklyChart
 * -----------
 * This component does NOT import `chart.js` or `react-chartjs-2` directly.
 * The actual chart rendering is done by `WeeklyChartCanvas` which is loaded
 * lazily via next/dynamic with `ssr: false`. This keeps the ~200KB chart.js
 * library out of the analytics page's main bundle and the dashboard's
 * initial JS, improving LCP and TTI significantly on mobile networks.
 *
 * We only import:
 *   - React, next/dynamic          → small
 *   - Card UI components            → already on the page
 *   - date-fns / ar locale         → only what we need
 *   - lucide-react icons            → already optimized via optimizePackageImports
 */

type WeeklyData = {
  bySubject: Record<string, number>;
  byDay: { date: string | Date; minutes: number }[];
};

interface WeeklyChartProps {
  weekly: WeeklyData | null;
}

// Loading placeholder shown while the chart.js chunk is being downloaded.
function ChartLoading() {
  return (
    <div className="h-80 bg-card/20 animate-pulse rounded-2xl border border-white/5 flex items-center justify-center">
      <Clock className="h-6 w-6 animate-spin text-primary/40" />
    </div>
  );
}

// The heavy lifting: load chart.js only on the client, after hydration.
const WeeklyChartCanvas = dynamic(
  () => import('./WeeklyChartCanvas'),
  {
    ssr: false,
    loading: () => <ChartLoading />,
  }
);

export default function WeeklyChart({ weekly }: WeeklyChartProps) {
  const isMounted = useIsMounted();

  // Pre-format day labels in Arabic so the canvas (loaded async) doesn't
  // need date-fns or the `ar` locale itself.
  const formattedWeekly = useMemo(() => {
    if (!weekly) return null;
    return {
      bySubject: weekly.bySubject || {},
      byDay: (weekly.byDay || []).map((d) => ({
        date: format(new Date(d.date), 'EEEE', { locale: ar }),
        minutes: d.minutes,
      })),
    };
  }, [weekly]);

  if (!weekly || !formattedWeekly) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد بيانات أسبوعية متاحة</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Summary stats are computed without chart.js so we can render them
  // immediately. The chart itself streams in once the dynamic chunk loads.
  const totalMinutes = formattedWeekly.byDay.reduce((a, b) => a + b.minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const averageMinutes =
    formattedWeekly.byDay.length > 0
      ? Math.round(totalMinutes / formattedWeekly.byDay.length)
      : 0;
  const maxDayIndex =
    formattedWeekly.byDay.length > 0
      ? formattedWeekly.byDay
          .map((d) => d.minutes)
          .indexOf(Math.max(...formattedWeekly.byDay.map((d) => d.minutes)))
      : -1;
  const bestDay = maxDayIndex >= 0 ? formattedWeekly.byDay[maxDayIndex]?.date : '';

  return (
    <div className="space-y-6">
      {/* Summary Cards — render eagerly, no chart.js needed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">إجمالي الوقت</p>
                <p className="text-2xl font-bold">{totalHours} ساعة</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">المتوسط اليومي</p>
                <p className="text-2xl font-bold">{averageMinutes} دقيقة</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">أفضل يوم</p>
                <p className="text-2xl font-bold">{bestDay}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Distribution Chart */}
      {Object.keys(formattedWeekly.bySubject).length > 0 && isMounted && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              توزيع وقت المذاكرة حسب المادة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <WeeklyChartCanvas weekly={formattedWeekly} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

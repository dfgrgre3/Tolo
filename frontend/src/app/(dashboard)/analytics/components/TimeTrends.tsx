'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, Clock, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useIsMounted } from '@/lib/safe-client-utils';

/**
 * TimeTrends
 * ----------
 * No direct chart.js import — see `TimeTrendsCanvas` for the lazy-loaded
 * chart implementation. This file is responsible for:
 *   - The trend summary cards (4 cards at the top)
 *   - Per-day detail cards
 *   - Triggering the lazy load of the line chart inside an `isMounted` guard
 */

type WeeklyData = {
  bySubject: Record<string, number>;
  byDay: { date: string | Date; minutes: number }[];
};

interface TimeTrendsProps {
  weekly: WeeklyData | null;
}

interface TrendData {
  days: Array<{ label: string; shortLabel: string; minutes: number; hours: number }>;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  firstAvg: number;
  secondAvg: number;
  peakDay: { label: string; minutes: number; hours: number } | null;
  lowDay: { label: string; minutes: number; hours: number } | null;
  totalMinutes: number;
}

function calculateTrendData(weekly: WeeklyData | null): TrendData | null {
  if (!weekly || !weekly.byDay) return null;

  const days = weekly.byDay.map((d) => {
    const date = new Date(d.date);
    return {
      date,
      label: format(date, 'EEEE', { locale: ar }),
      shortLabel: format(date, 'EEE', { locale: ar }),
      minutes: d.minutes,
      hours: d.minutes / 60,
    };
  });

  const firstHalf = days.slice(0, Math.floor(days.length / 2));
  const secondHalf = days.slice(Math.floor(days.length / 2));
  const firstAvg = firstHalf.reduce((sum, d) => sum + d.minutes, 0) / (firstHalf.length || 1);
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.minutes, 0) / (secondHalf.length || 1);

  const trend = (secondAvg > firstAvg ? 'up' : secondAvg < firstAvg ? 'down' : 'stable') as
    | 'up'
    | 'down'
    | 'stable';
  const trendPercentage = firstAvg > 0 ? Math.abs((secondAvg - firstAvg) / firstAvg) * 100 : 0;

  const peakDay =
    days.length > 0
      ? days.reduce((max, day) => (day.minutes > max.minutes ? day : max), days[0]!)
      : null;
  const lowDay =
    days.length > 0
      ? days.reduce((min, day) => (day.minutes < min.minutes ? day : min), days[0]!)
      : null;

  return {
    days,
    trend,
    trendPercentage,
    firstAvg,
    secondAvg,
    peakDay,
    lowDay,
    totalMinutes: days.reduce((sum, d) => sum + d.minutes, 0),
  };
}

const getTrendConfig = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return {
        label: 'تحسن',
        color: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20',
        Icon: TrendingUp,
        prefix: '+',
      };
    case 'down':
      return {
        label: 'تراجع',
        color: 'text-red-600 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20',
        Icon: TrendingDown,
        prefix: '-',
      };
    default:
      return {
        label: 'مستقر',
        color: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-800',
        Icon: Activity,
        prefix: '',
      };
  }
};

interface DayCardProps {
  day: { label: string; minutes: number; hours: number };
  peakDayMinutes?: number;
  lowDayMinutes?: number;
}

const DayCard = ({ day, peakDayMinutes, lowDayMinutes }: DayCardProps) => {
  const isPeak = day.minutes === peakDayMinutes;
  const isLow = day.minutes === lowDayMinutes;

  const borderClass = isPeak
    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20'
    : isLow
    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20'
    : 'border-gray-200 dark:border-gray-800';

  return (
    <div className={`p-4 rounded-lg border-2 ${borderClass}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold">{day.label}</p>
        {isPeak && <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />}
        {isLow && <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />}
      </div>
      <p className="text-2xl font-bold">{day.hours.toFixed(1)} ساعة</p>
      <p className="text-sm text-muted-foreground">{day.minutes} دقيقة</p>
    </div>
  );
};

// Lazy-load the line chart. chart.js is ~200KB, we don't want it in the
// initial bundle of the analytics page (which is a "use client" page that
// also includes recharts dependencies through other tabs).
const TimeTrendsCanvas = dynamic(() => import('./TimeTrendsCanvas'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-card/20 animate-pulse rounded-2xl border border-white/5 flex items-center justify-center">
      <Activity className="h-6 w-6 animate-spin text-primary/40" />
    </div>
  ),
});

export default function TimeTrends({ weekly }: TimeTrendsProps) {
  const isMounted = useIsMounted();
  const trendData = useMemo(() => calculateTrendData(weekly), [weekly]);

  if (!trendData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد بيانات للاتجاهات</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const trendConfig = getTrendConfig(trendData.trend);

  // Data passed to the lazy chart. Strip out anything that depends on
  // date-fns / ar locale so the chart chunk stays small.
  const chartInput = {
    days: trendData.days.map((d) => ({ shortLabel: d.shortLabel, minutes: d.minutes })),
    firstAvg: trendData.firstAvg,
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards — no chart.js needed */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`border-2 ${trendConfig.border}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">الاتجاه</p>
                <p className="text-2xl font-bold">{trendConfig.label}</p>
              </div>
              <trendConfig.Icon className={`h-8 w-8 ${trendConfig.color}`} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">متوسط اليوم</p>
                <p className="text-2xl font-bold">{(trendData.firstAvg / 60).toFixed(1)} ساعة</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">أفضل يوم</p>
                <p className="text-2xl font-bold">{trendData.peakDay?.label || '-'}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">التغيير</p>
                <p className={`text-2xl font-bold ${trendConfig.color}`}>
                  {trendConfig.prefix}
                  {trendData.trendPercentage.toFixed(1)}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart — chart.js loaded lazily */}
      {isMounted && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              اتجاه وقت المذاكرة خلال الأسبوع
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <TimeTrendsCanvas days={chartInput.days} firstAvg={chartInput.firstAvg} />
          </CardContent>
        </Card>
      )}

      {/* Day Details — no chart.js */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
            تفاصيل الأيام
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendData.days.map((day, index) => (
              <DayCard
                key={index}
                day={day}
                peakDayMinutes={trendData.peakDay?.minutes}
                lowDayMinutes={trendData.lowDay?.minutes}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

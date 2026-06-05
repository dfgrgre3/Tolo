'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, TrendingUp, Award, BarChart3 } from 'lucide-react';

/**
 * SubjectDistribution
 * -------------------
 * No direct chart.js import — the bar and doughnut charts are loaded
 * lazily via SubjectDistributionCanvas. The summary cards at the top and
 * the per-subject breakdown at the bottom are rendered without chart.js.
 */

type WeeklyData = {
  bySubject: Record<string, number>;
  byDay: { date: string | Date; minutes: number }[];
};

interface SubjectDistributionProps {
  weekly: WeeklyData | null;
}

const COLORS = [
  'rgba(59, 130, 246, 0.8)',
  'rgba(16, 185, 129, 0.8)',
  'rgba(245, 158, 11, 0.8)',
  'rgba(239, 68, 68, 0.8)',
  'rgba(139, 92, 246, 0.8)',
  'rgba(236, 72, 153, 0.8)',
  'rgba(34, 197, 94, 0.8)',
  'rgba(59, 130, 246, 0.8)',
];

const SubjectDistributionCanvas = dynamic(
  () => import('./SubjectDistributionCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 bg-card/20 animate-pulse rounded-2xl border border-white/5 flex items-center justify-center">
        <BarChart3 className="h-6 w-6 animate-pulse text-primary/40" />
      </div>
    ),
  }
);

export default function SubjectDistribution({ weekly }: SubjectDistributionProps) {
  const subjectData = useMemo(() => {
    if (!weekly || !weekly.bySubject) return null;

    const subjects = Object.entries(weekly.bySubject || {})
      .map(([name, minutes]) => ({
        name,
        minutes: minutes || 0,
        hours: (minutes || 0) / 60,
        percentage: 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const totalMinutes = subjects.reduce((sum, s) => sum + s.minutes, 0);

    subjects.forEach((subject) => {
      subject.percentage =
        totalMinutes > 0 ? Math.round((subject.minutes / totalMinutes) * 100) : 0;
    });

    return { subjects, totalMinutes, totalHours: totalMinutes / 60 };
  }, [weekly]);

  if (!subjectData || subjectData.subjects.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد بيانات للمواد الدراسية</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topSubject = subjectData.subjects[0];

  return (
    <div className="space-y-6">
      {/* Summary Cards — no chart.js needed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">إجمالي المواد</p>
                <p className="text-2xl font-bold">{subjectData.subjects.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">إجمالي الوقت</p>
                <p className="text-2xl font-bold">{subjectData.totalHours.toFixed(1)} ساعة</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">المادة الأكثر</p>
                <p className="text-2xl font-bold">{topSubject?.name || '-'}</p>
              </div>
              <Award className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts — chart.js loaded lazily */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              توزيع الوقت حسب المادة (عمودي)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <SubjectDistributionCanvas subjects={subjectData.subjects} colors={COLORS} />
          </CardContent>
        </Card>

        {/* Detailed List — no chart.js */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              تفاصيل المواد
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {subjectData.subjects.map((subject, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{subject.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {subject.hours.toFixed(1)} ساعة
                      </span>
                      <span className="text-sm font-semibold text-primary w-12 text-left">
                        {subject.percentage}%
                      </span>
                    </div>
                  </div>
                  <Progress value={subject.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

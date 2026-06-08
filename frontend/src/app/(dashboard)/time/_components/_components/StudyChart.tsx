'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { ChartData, SessionStats } from './study-session-types';
import { formatDuration } from './study-session-types';

interface StudyChartProps {
  chartData: ChartData[];
  stats: SessionStats;
}

export function StudyChart({ chartData, stats }: StudyChartProps) {
  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BarChart3 className="mx-auto h-12 w-12 opacity-50 mb-2" />
        <p>لا توجد بيانات لعرض الرسم البياني</p>
      </div>
    );
  }

  const maxHours = Math.max(...chartData.map(d => d.hours));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalHours}س</div>
              <div className="text-sm text-gray-600">إجمالي الساعات</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalSessions}</div>
              <div className="text-sm text-gray-600">إجمالي الجلسات</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.averageProductivity}%</div>
              <div className="text-sm text-gray-600">متوسط الإنتاجية</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.studyStreak}</div>
              <div className="text-sm text-gray-600">أيام متتالية</div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>الساعات اليومية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {chartData.slice(-14).map((day) => (
              <div key={day.date} className="flex items-center gap-3">
                <div className="w-20 text-sm text-gray-600">
                  {format(new Date(day.date), 'dd/MM', { locale: ar })}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="bg-primary h-6 rounded min-w-[2px]"
                      style={{ width: `${(day.hours / maxHours) * 100}%` }}
                    />
                    <span className="text-sm font-medium">{day.hours}س</span>
                  </div>
                </div>
                <div className="w-16 text-sm text-gray-500">
                  {day.sessions} جلسة
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

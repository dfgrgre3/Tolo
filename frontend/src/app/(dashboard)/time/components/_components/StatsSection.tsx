'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Flame, BookOpen, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import type { SessionStats } from './study-session-types';
import { formatDuration } from './study-session-types';

interface StatsSectionProps {
  stats: SessionStats;
}

function TrendValue({ trend }: { readonly trend: number }) {
  if (trend > 0) {
    return (
      <>
        <span className="text-lg font-bold text-green-600">+{trend}%</span>
        <TrendingUp className="h-4 w-4 text-green-600" />
      </>
    );
  }
  if (trend < 0) {
    return (
      <>
        <span className="text-lg font-bold text-red-600">{trend}%</span>
        <TrendingDown className="h-4 w-4 text-red-600" />
      </>
    );
  }
  return <span className="text-lg font-bold text-gray-600">{trend}%</span>;
}

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">أطول جلسة</p>
                <p className="text-2xl font-bold text-blue-600">{formatDuration(stats.longestSession)}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">سلسلة الدراسة</p>
                <p className="text-2xl font-bold text-green-600">{stats.studyStreak} يوم</p>
              </div>
              <Flame className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">المادة المفضلة</p>
                <p className="text-lg font-bold text-purple-600">{stats.favoriteSubject || 'غير محدد'}</p>
              </div>
              <BookOpen className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">الوقت الأمثل</p>
                <p className="text-sm font-bold text-orange-600">{stats.mostProductiveTime}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">الاتجاه الأسبوعي</p>
                <div className="flex items-center gap-2">
                  <TrendValue trend={stats.weeklyTrend} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">الاتجاه الشهري</p>
                <div className="flex items-center gap-2">
                  <TrendValue trend={stats.monthlyTrend} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

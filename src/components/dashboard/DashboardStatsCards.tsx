import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

import { Clock, Calendar, Target, TrendingUp } from 'lucide-react';

/**
 * إحصائيات لوحة التحكم
 */
export interface DashboardStats {
  /** إجمالي المهام */
  totalTasks: number;
  /** المهام المكتملة */
  completedTasks: number;
  /** الوقت المستغرق اليوم (بالدقائق) */
  todayTimeSpent: number;
  /** الوقت المستغرق هذا الأسبوع (بالدقائق) */
  weekTimeSpent: number;
  /** عدد الأحداث القادمة */
  upcomingEvents: number;
  /** معدل الإنجاز (نسبة مئوية) */
  completionRate: number;
}

/**
 * خصائص مكون إحصائيات لوحة التحكم
 */
export interface DashboardStatsProps {
  /** بيانات الإحصائيات */
  stats: DashboardStats;
}

/**
 * تنسيق الوقت من دقائق إلى ساعات ودقائق
 */
const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} دقيقة`;
  }

  return `${hours} ساعة${mins > 0 ? ` و ${mins} دقيقة` : ''}`;
};

/**
 * مكون إحصائيات لوحة التحكم
 * 
 * يعرض ملخص سريع لأداء المستخدم
 * 
 * @example
 * ```tsx
 * <DashboardStatsCards stats={{
 *   totalTasks: 10,
 *   completedTasks: 7,
 *   todayTimeSpent: 120,
 *   weekTimeSpent: 600,
 *   upcomingEvents: 3,
 *   completionRate: 70
 * }} />
 * ```
 */
export const DashboardStatsCards: React.FC<DashboardStatsProps> = React.memo(({ stats }) => {
  const statsCards = [
  {
    title: 'المهام',
    value: `${stats.completedTasks}/${stats.totalTasks}`,
    description: 'مكتملة',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    title: 'الوقت اليوم',
    value: formatTime(stats.todayTimeSpent),
    description: 'وقت الدراسة',
    icon: Clock,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    title: 'الأحداث القادمة',
    value: stats.upcomingEvents.toString(),
    description: 'في الجدول',
    icon: Calendar,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    title: 'معدل الإنجاز',
    value: `${stats.completionRate}%`,
    description: 'هذا الأسبوع',
    icon: TrendingUp,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  }];


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className="hover:shadow-lg transition-shadow duration-300">
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>);

      })}
    </div>);

});

DashboardStatsCards.displayName = 'DashboardStatsCards';

export default DashboardStatsCards;
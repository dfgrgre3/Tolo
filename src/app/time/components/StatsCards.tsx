'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import type { TimeStats } from '../types';

interface StatsCardsProps {
  stats: TimeStats;
  subjectsCount: number;
  onTabChange: (tab: string) => void;
}

export default function StatsCards({ stats, subjectsCount, onTabChange }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50 to-white dark:from-green-950/20 dark:to-background" 
        onClick={() => onTabChange("tasks")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">المهام المكتملة</CardTitle>
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{stats.completedTasks}</div>
          <p className="text-xs text-muted-foreground">
            {stats.pendingTasks} مهام في الانتظار
          </p>
        </CardContent>
      </Card>
      
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-background" 
        onClick={() => onTabChange("history")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ساعات المذاكرة</CardTitle>
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{stats.studyHours}</div>
          <p className="text-xs text-muted-foreground">
            هذا الأسبوع
          </p>
        </CardContent>
      </Card>
      
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-l-4 border-l-yellow-500 bg-gradient-to-br from-yellow-50/50 to-white dark:from-yellow-950/20 dark:to-background" 
        onClick={() => onTabChange("reminders")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">التذكيرات القادمة</CardTitle>
          <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">{stats.upcomingReminders}</div>
          <p className="text-xs text-muted-foreground">
            خلال 24 ساعة
          </p>
        </CardContent>
      </Card>
      
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-background" 
        onClick={() => onTabChange("schedule")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">المواد الدراسية</CardTitle>
          <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">{subjectsCount}</div>
          <p className="text-xs text-muted-foreground">
            مسجلة هذا الفصل
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


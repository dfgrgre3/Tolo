'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Progress } from "@/shared/progress";
import { Target, Flame, Zap, Brain, Award } from 'lucide-react';
import type { TimeStats } from '../types';

interface PerformanceMetricsProps {
  stats: TimeStats;
  totalTasks: number;
}

export default function PerformanceMetrics({ stats, totalTasks }: PerformanceMetricsProps) {
  const completionRate = totalTasks > 0 ? (stats.completedTasks / totalTasks) * 100 : 0;

  return (
    <Card className="lg:col-span-2 border-2 border-primary/10 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
        <CardTitle className="flex items-center text-lg">
          <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 ml-2">
            <Target className="h-5 w-5 text-primary" />
          </div>
          الأداء والإحصائيات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 p-4 rounded-lg bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
            <div className="flex justify-between items-center">
              <span className="font-medium">أهداف اليوم</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{Math.round(stats.dailyGoalProgress)}%</span>
            </div>
            <Progress value={stats.dailyGoalProgress} className="h-3" />
          </div>
          
          <div className="space-y-2 p-4 rounded-lg bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20">
            <div className="flex justify-between items-center">
              <span className="font-medium">أهداف الأسبوع</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">{Math.round(stats.weeklyGoalProgress)}%</span>
            </div>
            <Progress value={stats.weeklyGoalProgress} className="h-3" />
          </div>
          
          <div className="space-y-2 p-4 rounded-lg bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20">
            <div className="flex justify-between items-center">
              <span className="font-medium">إكمال المهام</span>
              <span className="font-bold text-green-600 dark:text-green-400">{Math.round(completionRate)}%</span>
            </div>
            <Progress value={completionRate} className="h-3" />
          </div>
          
          <div className="space-y-2 p-4 rounded-lg bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20">
            <div className="flex justify-between items-center">
              <span className="font-medium">درجة التركيز</span>
              <span className="font-bold text-orange-600 dark:text-orange-400">{stats.focusScore}%</span>
            </div>
            <Progress value={stats.focusScore} className="h-3" />
          </div>
        </div>
        
        <div className="flex items-center justify-around p-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30 rounded-xl border border-primary/10">
          <div className="text-center transform hover:scale-110 transition-transform duration-200">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 mx-auto mb-2 shadow-md">
              <Flame className="h-7 w-7 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">سلسلة الأيام</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.streakDays} أيام</p>
          </div>
          
          <div className="text-center transform hover:scale-110 transition-transform duration-200">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 mx-auto mb-2 shadow-md">
              <Zap className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">التركيز</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.focusScore}%</p>
          </div>
          
          <div className="text-center transform hover:scale-110 transition-transform duration-200">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 mx-auto mb-2 shadow-md">
              <Brain className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">المهام</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completedTasks}</p>
          </div>
          
          <div className="text-center transform hover:scale-110 transition-transform duration-200">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 mx-auto mb-2 shadow-md">
              <Award className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">الإنجاز</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Math.round(completionRate)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


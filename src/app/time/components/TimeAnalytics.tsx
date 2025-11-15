'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, TrendingDown, Clock, Target, Calendar, Zap } from 'lucide-react';
import type { Task, StudySession, Reminder } from '../types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subDays, subWeeks } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TimeAnalyticsProps {
  tasks: Task[];
  studySessions: StudySession[];
  reminders: Reminder[];
}

export default function TimeAnalytics({ tasks, studySessions, reminders }: TimeAnalyticsProps) {
  const analytics = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { locale: ar });
    const weekEnd = endOfWeek(now, { locale: ar });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    // Weekly study time distribution
    const weeklyStudyTime = weekDays.map(day => {
      const daySessions = studySessions.filter(session => 
        isSameDay(new Date(session.startTime), day)
      );
      return daySessions.reduce((sum, s) => sum + s.durationMin, 0);
    });
    
    // Task completion trend
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(now, 6 - i));
    const taskCompletionTrend = last7Days.map(day => {
      const dayTasks = tasks.filter(task => 
        task.completedAt && isSameDay(new Date(task.completedAt), day)
      );
      return dayTasks.length;
    });
    
    // Subject-based time distribution
    const subjectTimeMap = new Map<string, number>();
    studySessions.forEach(session => {
      if (session.subject) {
        const current = subjectTimeMap.get(session.subject) || 0;
        subjectTimeMap.set(session.subject, current + session.durationMin);
      }
    });
    
    // Average session duration
    const avgSessionDuration = studySessions.length > 0
      ? studySessions.reduce((sum, s) => sum + s.durationMin, 0) / studySessions.length
      : 0;
    
    // Task completion rate
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
    
    // Reminder effectiveness (reminders that led to completed tasks)
    const effectiveReminders = reminders.filter(r => {
      const relatedTasks = tasks.filter(t => 
        t.dueAt && Math.abs(new Date(t.dueAt).getTime() - new Date(r.remindAt).getTime()) < 24 * 60 * 60 * 1000
      );
      return relatedTasks.some(t => t.status === 'COMPLETED');
    }).length;
    
    // Peak study hours
    const hourDistribution = Array.from({ length: 24 }, () => 0);
    studySessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourDistribution[hour] += session.durationMin;
    });
    const peakHour = hourDistribution.indexOf(Math.max(...hourDistribution));
    
    // Productivity score (0-100)
    const productivityScore = Math.min(100, Math.round(
      (completionRate * 0.4) +
      (avgSessionDuration / 60 * 10 * 0.3) +
      (weeklyStudyTime.reduce((a, b) => a + b, 0) / 60 / 20 * 100 * 0.3)
    ));
    
    return {
      weeklyStudyTime,
      taskCompletionTrend,
      subjectTimeMap,
      avgSessionDuration,
      completionRate,
      effectiveReminders,
      peakHour,
      productivityScore,
      totalStudyHours: weeklyStudyTime.reduce((a, b) => a + b, 0) / 60
    };
  }, [tasks, studySessions, reminders]);

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/10 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
          <CardTitle className="flex items-center text-lg">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 ml-2">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            تحليل الوقت والإنتاجية
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Productivity Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 border border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">درجة الإنتاجية</span>
                <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {analytics.productivityScore}%
              </div>
              <Progress value={analytics.productivityScore} className="h-2" />
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20 border border-green-200/50 dark:border-green-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">متوسط الجلسة</span>
                <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                {Math.round(analytics.avgSessionDuration)} د
              </div>
              <p className="text-xs text-muted-foreground">
                {studySessions.length} جلسة إجمالية
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20 border border-purple-200/50 dark:border-purple-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">ساعات هذا الأسبوع</span>
                <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {analytics.totalStudyHours.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                هدف: 20 ساعة/أسبوع
              </p>
            </div>
          </div>

          {/* Weekly Study Time Chart */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-gray-50/50 to-transparent dark:from-gray-900/20 border border-gray-200/50 dark:border-gray-800/50">
            <h3 className="font-semibold mb-4 flex items-center">
              <Calendar className="h-4 w-4 ml-2" />
              توزيع وقت المذاكرة خلال الأسبوع
            </h3>
            <div className="space-y-2">
              {analytics.weeklyStudyTime.map((minutes, index) => {
                const dayName = format(startOfWeek(now, { locale: ar }).getTime() + index * 24 * 60 * 60 * 1000, 'EEEE', { locale: ar });
                const hours = minutes / 60;
                const maxHours = Math.max(...analytics.weeklyStudyTime) / 60 || 1;
                const percentage = (hours / maxHours) * 100;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{dayName}</span>
                      <span className="text-muted-foreground">{hours.toFixed(1)} ساعة</span>
                    </div>
                    <Progress value={percentage} className="h-3" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subject Time Distribution */}
          {analytics.subjectTimeMap.size > 0 && (
            <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20 border border-orange-200/50 dark:border-orange-800/50">
              <h3 className="font-semibold mb-4 flex items-center">
                <Target className="h-4 w-4 ml-2" />
                توزيع الوقت حسب المادة
              </h3>
              <div className="space-y-2">
                {Array.from(analytics.subjectTimeMap.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([subject, minutes]) => {
                    const hours = minutes / 60;
                    const totalMinutes = Array.from(analytics.subjectTimeMap.values()).reduce((a, b) => a + b, 0);
                    const percentage = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;
                    
                    return (
                      <div key={subject} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">{subject}</span>
                          <span className="text-muted-foreground">{hours.toFixed(1)} ساعة</span>
                        </div>
                        <Progress value={percentage} className="h-3" />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Peak Study Hour */}
          {analytics.peakHour >= 0 && (
            <div className="p-4 rounded-lg bg-gradient-to-br from-pink-50/50 to-transparent dark:from-pink-950/20 border border-pink-200/50 dark:border-pink-800/50">
              <h3 className="font-semibold mb-2 flex items-center">
                <Clock className="h-4 w-4 ml-2" />
                ساعة الذروة للمذاكرة
              </h3>
              <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                {analytics.peakHour}:00 - {analytics.peakHour + 1}:00
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                أكثر ساعة تذاكر فيها خلال الأسبوع
              </p>
            </div>
          )}

          {/* Task Completion Trend */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/50">
            <h3 className="font-semibold mb-4 flex items-center">
              <TrendingUp className="h-4 w-4 ml-2" />
              اتجاه إكمال المهام (آخر 7 أيام)
            </h3>
            <div className="flex items-end justify-between gap-2 h-32">
              {analytics.taskCompletionTrend.map((count, index) => {
                const maxCount = Math.max(...analytics.taskCompletionTrend) || 1;
                const height = (count / maxCount) * 100;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-500 dark:to-indigo-300 rounded-t-lg transition-all hover:opacity-80"
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${count} مهام`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {format(subDays(now, 6 - index), 'd', { locale: ar })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


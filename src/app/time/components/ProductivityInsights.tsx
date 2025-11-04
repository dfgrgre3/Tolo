'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle, 
  Target, 
  TrendingUp, 
  Clock,
  Zap,
  Calendar,
  BookOpen
} from 'lucide-react';
import type { Task, StudySession } from '../types';
import { format, isPast, differenceInDays, differenceInHours } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ProductivityInsightsProps {
  tasks: Task[];
  studySessions: StudySession[];
}

export default function ProductivityInsights({ tasks, studySessions }: ProductivityInsightsProps) {
  const insights = useMemo(() => {
    const now = new Date();
    
    // Overdue tasks
    const overdueTasks = tasks.filter(task => 
      task.dueAt && 
      task.status !== 'COMPLETED' && 
      isPast(new Date(task.dueAt))
    );
    
    // Upcoming deadlines (next 3 days)
    const upcomingDeadlines = tasks.filter(task =>
      task.dueAt &&
      task.status !== 'COMPLETED' &&
      !isPast(new Date(task.dueAt)) &&
      differenceInDays(new Date(task.dueAt), now) <= 3
    );
    
    // High priority pending tasks
    const highPriorityTasks = tasks.filter(task =>
      task.status !== 'COMPLETED' &&
      (task.priority === 'HIGH' || task.priority === 'URGENT')
    );
    
    // Time estimation accuracy
    const tasksWithTime = tasks.filter(t => t.estimatedTime && t.actualTime);
    const timeAccuracy = tasksWithTime.length > 0
      ? tasksWithTime.reduce((sum, t) => {
          const diff = Math.abs((t.estimatedTime || 0) - (t.actualTime || 0));
          const accuracy = 100 - (diff / (t.estimatedTime || 1)) * 100;
          return sum + Math.max(0, accuracy);
        }, 0) / tasksWithTime.length
      : 0;
    
    // Study consistency (days with sessions in last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      return date.toDateString();
    });
    const studyDays = new Set(
      studySessions
        .filter(s => last7Days.includes(new Date(s.startTime).toDateString()))
        .map(s => new Date(s.startTime).toDateString())
    ).size;
    const consistencyScore = (studyDays / 7) * 100;
    
    // Focus areas (subjects with most incomplete tasks)
    const subjectTaskCount = new Map<string, number>();
    tasks
      .filter(t => t.status !== 'COMPLETED' && t.subject)
      .forEach(t => {
        const count = subjectTaskCount.get(t.subject!) || 0;
        subjectTaskCount.set(t.subject!, count + 1);
      });
    
    // Recommendations
    const recommendations: string[] = [];
    
    if (overdueTasks.length > 0) {
      recommendations.push(`لديك ${overdueTasks.length} مهمة متأخرة تحتاج إلى انتباه فوري`);
    }
    
    if (upcomingDeadlines.length > 0) {
      recommendations.push(`${upcomingDeadlines.length} مهمة قريبة من الموعد النهائي`);
    }
    
    if (consistencyScore < 50) {
      recommendations.push('حاول المذاكرة يومياً لتحسين الانتظام');
    }
    
    if (timeAccuracy < 70 && tasksWithTime.length > 0) {
      recommendations.push('حسّن تقديرك للوقت المطلوب لإكمال المهام');
    }
    
    if (highPriorityTasks.length > 0) {
      recommendations.push(`ركز على ${highPriorityTasks.length} مهمة عالية الأولوية`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('أحسنت! أنت على المسار الصحيح');
    }
    
    // Best time to study (based on session quality - longer sessions indicate better focus time)
    const hourQuality = Array.from({ length: 24 }, () => ({
      total: 0,
      count: 0,
      avg: 0
    }));
    
    studySessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourQuality[hour].total += session.durationMin;
      hourQuality[hour].count += 1;
    });
    
    hourQuality.forEach((h, i) => {
      h.avg = h.count > 0 ? h.total / h.count : 0;
    });
    
    const bestHour = hourQuality.reduce((best, current, index) => 
      current.avg > best.avg ? { ...current, index } : best
    , { avg: 0, index: -1 });
    
    return {
      overdueTasks,
      upcomingDeadlines,
      highPriorityTasks,
      timeAccuracy,
      consistencyScore,
      subjectTaskCount,
      recommendations,
      bestHour: bestHour.index >= 0 ? bestHour.index : null,
      studyDays
    };
  }, [tasks, studySessions]);

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/10 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
          <CardTitle className="flex items-center text-lg">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 ml-2">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            رؤى الإنتاجية والتوصيات
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Recommendations */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 border border-blue-200/50 dark:border-blue-800/50">
            <h3 className="font-semibold mb-3 flex items-center">
              <Lightbulb className="h-4 w-4 ml-2 text-blue-600 dark:text-blue-400" />
              توصيات ذكية
            </h3>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.overdueTasks.length > 0 && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20 border border-red-200/50 dark:border-red-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold flex items-center">
                    <AlertTriangle className="h-4 w-4 ml-2 text-red-600 dark:text-red-400" />
                    المهام المتأخرة
                  </span>
                  <Badge variant="destructive">{insights.overdueTasks.length}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {insights.overdueTasks.length} مهمة تجاوزت موعدها النهائي
                </p>
              </div>
            )}

            {insights.upcomingDeadlines.length > 0 && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-50/50 to-transparent dark:from-yellow-950/20 border border-yellow-200/50 dark:border-yellow-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold flex items-center">
                    <Clock className="h-4 w-4 ml-2 text-yellow-600 dark:text-yellow-400" />
                    مواعيد قريبة
                  </span>
                  <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30">
                    {insights.upcomingDeadlines.length}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {insights.upcomingDeadlines.length} مهمة خلال 3 أيام القادمة
                </p>
              </div>
            )}

            {insights.highPriorityTasks.length > 0 && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20 border border-orange-200/50 dark:border-orange-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold flex items-center">
                    <Target className="h-4 w-4 ml-2 text-orange-600 dark:text-orange-400" />
                    أولوية عالية
                  </span>
                  <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/30">
                    {insights.highPriorityTasks.length}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {insights.highPriorityTasks.length} مهمة تحتاج إلى انتباه فوري
                </p>
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20 border border-green-200/50 dark:border-green-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">انتظام المذاكرة</span>
                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.round(insights.consistencyScore)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {insights.studyDays} من 7 أيام
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20 border border-purple-200/50 dark:border-purple-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">دقة التقدير</span>
                <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(insights.timeAccuracy)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                تقدير الوقت المطلوب
              </p>
            </div>

            {insights.bestHour !== null && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">أفضل وقت</span>
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {insights.bestHour}:00
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  أكثر ساعة إنتاجية
                </p>
              </div>
            )}
          </div>

          {/* Focus Areas */}
          {insights.subjectTaskCount.size > 0 && (
            <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/50">
              <h3 className="font-semibold mb-3 flex items-center">
                <BookOpen className="h-4 w-4 ml-2 text-indigo-600 dark:text-indigo-400" />
                مجالات التركيز (مهام غير مكتملة)
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(insights.subjectTaskCount.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([subject, count]) => (
                    <Badge 
                      key={subject} 
                      variant="outline"
                      className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    >
                      {subject}: {count}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


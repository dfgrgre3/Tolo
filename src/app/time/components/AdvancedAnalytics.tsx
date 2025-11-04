'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Progress } from "@/shared/progress";
import { TrendingUp, TrendingDown, Clock, Target, Flame, Award, BarChart3, Calendar } from 'lucide-react';
import type { Task, StudySession, Reminder } from '../types';
import { useMemo } from 'react';

interface AdvancedAnalyticsProps {
  tasks: Task[];
  studySessions: StudySession[];
  reminders: Reminder[];
}

export default function AdvancedAnalytics({ tasks, studySessions, reminders }: AdvancedAnalyticsProps) {
  const analytics = useMemo(() => {
    // Calculate task completion rate over time
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
    
    // Calculate average task completion time
    const tasksWithCompletion = completedTasks.filter(t => t.completedAt && t.createdAt);
    const avgCompletionTime = tasksWithCompletion.length > 0
      ? tasksWithCompletion.reduce((acc, task) => {
          const created = new Date(task.createdAt!).getTime();
          const completed = new Date(task.completedAt!).getTime();
          return acc + (completed - created);
        }, 0) / tasksWithCompletion.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;
    
    // Study time analysis
    const totalStudyMinutes = studySessions.reduce((acc, s) => acc + s.durationMin, 0);
    const avgSessionDuration = studySessions.length > 0 
      ? totalStudyMinutes / studySessions.length 
      : 0;
    
    // Weekly study pattern
    const weeklyHours = totalStudyMinutes / 60;
    const weeklyGoal = 21; // 3 hours per day
    const weeklyProgress = Math.min(100, (weeklyHours / weeklyGoal) * 100);
    
    // Task priority distribution
    const priorityCounts = {
      urgent: tasks.filter(t => t.priority === 'URGENT').length,
      high: tasks.filter(t => t.priority === 'HIGH').length,
      medium: tasks.filter(t => t.priority === 'MEDIUM').length,
      low: tasks.filter(t => t.priority === 'LOW').length,
    };
    
    // Study streak (consecutive days with study sessions)
    const studyDays = new Set(
      studySessions.map(s => new Date(s.startTime).toDateString())
    );
    const streakDays = studyDays.size;
    
    // Reminder effectiveness
    const completedReminders = reminders.filter(r => r.isCompleted).length;
    const reminderCompletionRate = reminders.length > 0
      ? (completedReminders / reminders.length) * 100
      : 0;
    
    return {
      completionRate,
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      avgSessionDuration: Math.round(avgSessionDuration),
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      weeklyProgress,
      priorityCounts,
      streakDays,
      reminderCompletionRate,
      totalStudyMinutes,
    };
  }, [tasks, studySessions, reminders]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الإكمال</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.completionRate)}%</div>
            <Progress value={analytics.completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {tasks.filter(t => t.status === 'COMPLETED').length} من {tasks.length} مهمة
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط وقت الإكمال</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgCompletionTime} يوم</div>
            <p className="text-xs text-muted-foreground mt-1">
              متوسط الوقت لإكمال المهام
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط مدة الجلسة</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgSessionDuration} دقيقة</div>
            <p className="text-xs text-muted-foreground mt-1">
              لكل جلسة مذاكرة
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">سلسلة الأيام</CardTitle>
            <Flame className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.streakDays} يوم</div>
            <p className="text-xs text-muted-foreground mt-1">
              أيام مذاكرة متتالية
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              توزيع أولويات المهام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">عاجل</span>
                <span className="font-bold text-red-600">{analytics.priorityCounts.urgent}</span>
              </div>
              <Progress 
                value={tasks.length > 0 ? (analytics.priorityCounts.urgent / tasks.length) * 100 : 0} 
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">عالي</span>
                <span className="font-bold text-orange-600">{analytics.priorityCounts.high}</span>
              </div>
              <Progress 
                value={tasks.length > 0 ? (analytics.priorityCounts.high / tasks.length) * 100 : 0} 
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">متوسط</span>
                <span className="font-bold text-yellow-600">{analytics.priorityCounts.medium}</span>
              </div>
              <Progress 
                value={tasks.length > 0 ? (analytics.priorityCounts.medium / tasks.length) * 100 : 0} 
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">منخفض</span>
                <span className="font-bold text-blue-600">{analytics.priorityCounts.low}</span>
              </div>
              <Progress 
                value={tasks.length > 0 ? (analytics.priorityCounts.low / tasks.length) * 100 : 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              تقدم الأسبوع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">ساعات المذاكرة هذا الأسبوع</span>
                <span className="font-bold text-primary">{analytics.weeklyHours} ساعة</span>
              </div>
              <Progress value={analytics.weeklyProgress} className="h-3" />
              <p className="text-xs text-muted-foreground">
                الهدف: 21 ساعة في الأسبوع ({Math.round(analytics.weeklyProgress)}%)
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">إجمالي الدقائق</span>
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary">{analytics.totalStudyMinutes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {studySessions.length} جلسة مذاكرة
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


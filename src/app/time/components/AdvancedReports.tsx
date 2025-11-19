'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Clock,
  Target,
  Award,
  Activity,
  Download,
  Bell,
  BookOpen
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import type { Task, StudySession, Reminder, TimeStats } from '../types';

interface AdvancedReportsProps {
  tasks: Task[];
  studySessions: StudySession[];
  reminders: Reminder[];
  stats: TimeStats;
  onExport?: () => void;
}

export default function AdvancedReports({
  tasks,
  studySessions,
  reminders,
  stats,
  onExport
}: AdvancedReportsProps) {
  // Calculate advanced metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const pendingTasks = tasks.filter(t => t.status === 'PENDING').length;
  
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  // Time analysis
  const totalStudyMinutes = studySessions.reduce((acc, s) => acc + s.durationMin, 0);
  const avgSessionDuration = studySessions.length > 0 
    ? Math.round(totalStudyMinutes / studySessions.length) 
    : 0;
  
  // Task priority distribution
  const highPriorityTasks = tasks.filter(t => t.priority === 'HIGH' || t.priority === 'URGENT').length;
  const mediumPriorityTasks = tasks.filter(t => t.priority === 'MEDIUM').length;
  const lowPriorityTasks = tasks.filter(t => t.priority === 'LOW').length;
  
  // Weekly progress
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  const weekSessions = studySessions.filter(s => 
    new Date(s.startTime) >= weekStart
  );
  const weekMinutes = weekSessions.reduce((acc, s) => acc + s.durationMin, 0);
  
  // Subject distribution (if available)
  const subjectStats: Record<string, number> = {};
  studySessions.forEach(session => {
    if (session.subject) {
      subjectStats[session.subject] = (subjectStats[session.subject] || 0) + session.durationMin;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          تقارير الأداء المتقدمة
        </h2>
        {onExport && (
          <Button onClick={onExport} variant="outline" size="sm">
            <Download className="h-4 w-4 ml-2" />
            تصدير التقرير
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Task Statistics */}
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
            <CardTitle className="flex items-center text-lg">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 ml-2" />
              إحصائيات المهام
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>مكتملة</span>
                <span className="font-bold text-green-600">{completedTasks}</span>
              </div>
              <Progress value={(completedTasks / totalTasks) * 100 || 0} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>قيد التنفيذ</span>
                <span className="font-bold text-blue-600">{inProgressTasks}</span>
              </div>
              <Progress value={(inProgressTasks / totalTasks) * 100 || 0} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>في الانتظار</span>
                <span className="font-bold text-yellow-600">{pendingTasks}</span>
              </div>
              <Progress value={(pendingTasks / totalTasks) * 100 || 0} className="h-2" />
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold">معدل الإكمال</span>
                <span className="text-2xl font-bold text-primary">{Math.round(completionRate)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Study Time Analysis */}
        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30">
            <CardTitle className="flex items-center text-lg">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400 ml-2" />
              تحليل وقت المذاكرة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">إجمالي ساعات المذاكرة</span>
                <span className="font-bold text-lg">{stats.studyHours.toFixed(1)} ساعة</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">عدد الجلسات</span>
                <span className="font-bold">{studySessions.length} جلسة</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">متوسط مدة الجلسة</span>
                <span className="font-bold">{avgSessionDuration} دقيقة</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">وقت المذاكرة هذا الأسبوع</span>
                <span className="font-bold">{Math.round(weekMinutes / 60 * 10) / 10} ساعة</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card className="border-2 border-orange-200 dark:border-orange-800">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30">
            <CardTitle className="flex items-center text-lg">
              <Award className="h-5 w-5 text-orange-600 dark:text-orange-400 ml-2" />
              تقدم الأهداف
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>هدف اليوم</span>
                <span className="font-bold">{Math.round(stats.dailyGoalProgress)}%</span>
              </div>
              <Progress value={stats.dailyGoalProgress} className="h-3" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>هدف الأسبوع</span>
                <span className="font-bold">{Math.round(stats.weeklyGoalProgress)}%</span>
              </div>
              <Progress value={stats.weeklyGoalProgress} className="h-3" />
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold">سلسلة الأيام</span>
                <span className="text-2xl font-bold text-orange-600">{stats.streakDays} يوم</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card className="border-2 border-red-200 dark:border-red-800">
          <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30">
            <CardTitle className="flex items-center text-lg">
              <Activity className="h-5 w-5 text-red-600 dark:text-red-400 ml-2" />
              توزيع الأولويات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>عالية / عاجلة</span>
                <span className="font-bold text-red-600">{highPriorityTasks}</span>
              </div>
              <Progress 
                value={totalTasks > 0 ? (highPriorityTasks / totalTasks) * 100 : 0} 
                className="h-2" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>متوسطة</span>
                <span className="font-bold text-yellow-600">{mediumPriorityTasks}</span>
              </div>
              <Progress 
                value={totalTasks > 0 ? (mediumPriorityTasks / totalTasks) * 100 : 0} 
                className="h-2" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>منخفضة</span>
                <span className="font-bold text-green-600">{lowPriorityTasks}</span>
              </div>
              <Progress 
                value={totalTasks > 0 ? (lowPriorityTasks / totalTasks) * 100 : 0} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Reminders Overview */}
        <Card className="border-2 border-yellow-200 dark:border-yellow-800">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/30">
            <CardTitle className="flex items-center text-lg">
              <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400 ml-2" />
              نظرة عامة على التذكيرات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">إجمالي التذكيرات</span>
                <span className="font-bold">{reminders.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">التذكيرات القادمة</span>
                <span className="font-bold text-yellow-600">{stats.upcomingReminders}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">التذكيرات المكتملة</span>
                <span className="font-bold text-green-600">
                  {reminders.filter(r => r.isCompleted).length}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">التذكيرات المتكررة</span>
                <span className="font-bold text-blue-600">
                  {reminders.filter(r => r.isRecurring).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subject Distribution */}
        {Object.keys(subjectStats).length > 0 && (
          <Card className="border-2 border-indigo-200 dark:border-indigo-800">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30">
              <CardTitle className="flex items-center text-lg">
                <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400 ml-2" />
                توزيع المواد الدراسية
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {Object.entries(subjectStats)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([subject, minutes]) => (
                  <div key={subject} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{subject}</span>
                      <span className="font-bold">{Math.round(minutes / 60 * 10) / 10} ساعة</span>
                    </div>
                    <Progress 
                      value={(minutes / totalStudyMinutes) * 100 || 0} 
                      className="h-2" 
                    />
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


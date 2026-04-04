'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Clock, 
  BookOpen,
  BarChart3,
  Activity,
  Brain,
  Flame
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { Task, StudySession, Reminder } from '../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TimeAnalyticsProps {
  tasks: Task[];
  studySessions: StudySession[];
  reminders: Reminder[];
}

const TimeAnalytics = ({ tasks, studySessions, reminders: _reminders }: TimeAnalyticsProps) => {
  const analyticsData = useMemo(() => {
    const now = new Date();
    const sessionMinutesByDay = new Map<string, number>();
    const pomodoroCountByDay = new Map<string, number>();
    const completedTasksByDay = new Map<string, number>();

    for (const session of studySessions) {
      const sessionDate = new Date(session.startTime);
      const dayKey = format(sessionDate, 'yyyy-MM-dd');
      sessionMinutesByDay.set(dayKey, (sessionMinutesByDay.get(dayKey) || 0) + session.durationMin);

      if (session.durationMin >= 20 && session.durationMin <= 30) {
        pomodoroCountByDay.set(dayKey, (pomodoroCountByDay.get(dayKey) || 0) + 1);
      }
    }

    for (const task of tasks) {
      if (!task.completedAt) continue;
      const dayKey = format(new Date(task.completedAt), 'yyyy-MM-dd');
      completedTasksByDay.set(dayKey, (completedTasksByDay.get(dayKey) || 0) + 1);
    }

    const weeklyData = [];
    const productivityData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dayKey = format(date, 'yyyy-MM-dd');
      const studyMinutes = sessionMinutesByDay.get(dayKey) || 0;
      const studyHours = Math.round((studyMinutes / 60) * 10) / 10;
      const completedTasks = completedTasksByDay.get(dayKey) || 0;
      const pomodoroSessions = pomodoroCountByDay.get(dayKey) || 0;
      const productivityScore = Math.min(100, Math.round(
        (studyHours / 8) * 40 +
        (completedTasks / 10) * 40 +
        (pomodoroSessions / 5) * 20
      ));

      weeklyData.push({
        name: format(date, 'EEEE', { locale: ar }).slice(0, 2),
        studyHours,
        completedTasks,
        date: date.toLocaleDateString('ar-SA')
      });

      productivityData.push({
        name: format(date, 'EEEE', { locale: ar }).slice(0, 2),
        productivity: productivityScore,
        studyHours,
        pomodoroSessions,
        date: date.toDateString()
      });
    }

    const totalStudyMinutes = studySessions.reduce((sum, session) => sum + session.durationMin, 0);
    const totalStudyHours = totalStudyMinutes / 60;
    const totalPomodoroSessions = studySessions.reduce((sum, session) => (
      sum + (session.durationMin >= 20 && session.durationMin <= 30 ? 1 : 0)
    ), 0);
    const averageProductivityScore = Math.round(
      productivityData.reduce((sum, day) => sum + day.productivity, 0) / productivityData.length
    );
    const streak = calculateStreak(studySessions);

    return {
      weeklyData,
      productivityData,
      totalStudyHours,
      avgStudyHours: totalStudyHours / 7,
      totalPomodoroSessions,
      avgPomodoroPerDay: totalPomodoroSessions / 7,
      averageProductivityScore,
      streak
    };
  }, [studySessions, tasks]);

  const {
    weeklyData,
    productivityData,
    totalStudyHours,
    avgStudyHours,
    totalPomodoroSessions,
    avgPomodoroPerDay,
    averageProductivityScore,
    streak
  } = analyticsData;

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/10 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
          <CardTitle className="flex items-center text-lg">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 ml-2">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            تحليلات الإنتاجية
          </CardTitle>
          <CardDescription className="mt-2">
            رؤى مفصلة عن أدائك ومستوى إنتاجيتك عبر الزمن
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">متوسط الساعات الدراسية يومياً</h3>
                <Badge variant="secondary">{avgStudyHours.toFixed(1)} ساعة</Badge>
              </div>
              <Progress value={Math.min(100, (avgStudyHours / 8) * 100)} className="h-2" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">متوسط جلسات البومودورو يومياً</h3>
                <Badge variant="secondary">{avgPomodoroPerDay.toFixed(1)} جلسة</Badge>
              </div>
              <Progress value={Math.min(100, (avgPomodoroPerDay / 5) * 100)} className="h-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                ساعات الدراسة والمهمات المكتملة
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={weeklyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'studyHours' ? `${value} ساعة` : value,
                      name === 'studyHours' ? 'ساعات الدراسة' : 'المهام المكتملة'
                    ]}
                    labelFormatter={(label) => `اليوم: ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Area type="monotone" dataKey="studyHours" stackId="1" stroke="#4f46e5" fill="url(#colorStudy)" strokeWidth={2} name="ساعات الدراسة" />
                  <Line type="monotone" dataKey="completedTasks" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="المهام المكتملة" />
                  <defs>
                    <linearGradient id="colorStudy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c7d2fe" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-500" />
                مقياس الإنتاجية
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={productivityData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'نسبة']}
                    labelFormatter={(label) => `اليوم: ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="productivity" 
                    stroke="#0d9488" 
                    strokeWidth={3} 
                    dot={{ r: 5 }} 
                    activeDot={{ r: 8 }} 
                    name="مقياس الإنتاجية"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الساعات الدراسية</CardTitle>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{totalStudyHours.toFixed(1)}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              هذا الأسبوع
            </p>
            <Progress 
              value={Math.min(100, (totalStudyHours / 40) * 100)} 
              className="mt-2 h-1.5" 
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي جلسات البومودورو</CardTitle>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{totalPomodoroSessions}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              هذا الأسبوع
            </p>
            <Progress 
              value={Math.min(100, (totalPomodoroSessions / 35) * 100)} 
              className="mt-2 h-1.5" 
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">نقطة التركيز</CardTitle>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{averageProductivityScore}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              متوسط الأسبوع
            </p>
            <Progress 
              value={averageProductivityScore} 
              className="mt-2 h-1.5 bg-purple-300" 
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الانضباط</CardTitle>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">{streak}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              أيام متتالية
            </p>
            <Progress 
              value={Math.min(100, streak * 10)} 
              className="mt-2 h-1.5 bg-emerald-300" 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Helper function to calculate streak
function calculateStreak(studySessions: StudySession[]): number {
  let streak = 0;
  const today = new Date();
  const sessionDates = [...new Set(studySessions.map(s => new Date(s.startTime).toDateString()))];
  const sortedDates = sessionDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  // Count backwards from today
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toDateString();
    if (sortedDates.includes(dateStr)) {
      streak++;
    } else if (i > 0) { // Don't break if it's the first day (today) with no session
      break;
    }
  }
  
  return streak;
}

export default TimeAnalytics;

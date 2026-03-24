import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Lightbulb,
  Target,
  TrendingUp,
  Clock,
  Brain,
  Calendar,
  Award,
  Zap,
  BookOpen,
  BarChart3 } from
'lucide-react';
import type { Task, StudySession } from '../types';
import { calculateDisciplineScore, calculateMasteryScore, calculateStudyEfficiency } from '../utils/timeUtils';

interface ProductivityInsightsProps {
  tasks: Task[];
  studySessions: StudySession[];
}

const ProductivityInsights = ({ tasks, studySessions }: ProductivityInsightsProps) => {
  // Calculate insights based on the data
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks * 100 : 0;

  // Calculate how many sessions are Pomodoro-length (20-30 minutes)
  const pomodoroSessions = studySessions.filter((session) =>
  session.durationMin >= 20 && session.durationMin <= 30
  ).length;
  const pomodoroRatio = studySessions.length > 0 ? pomodoroSessions / studySessions.length : 0;

  // Calculate average daily goal progress (assuming 3 hours per day)
  const DAILY_GOAL_MINUTES = 180;
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const todaySessions = studySessions.filter((session) =>
  new Date(session.startTime) >= startOfToday
  );
  const todayMinutes = todaySessions.reduce((sum, session) => sum + session.durationMin, 0);
  const dailyGoalProgress = Math.min(100, todayMinutes / DAILY_GOAL_MINUTES * 100);

  // Calculate study efficiency
  const totalActualTime = studySessions.reduce((sum, session) => sum + session.durationMin, 0);
  const totalEstimatedTime = tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);
  const studyEfficiency = calculateStudyEfficiency(totalActualTime, totalEstimatedTime);

  // Calculate discipline and mastery scores using our new utility functions
  const disciplineScore = calculateDisciplineScore(completedTasks, totalTasks, 7); // Assuming 7-day streak
  const masteryScore = calculateMasteryScore(completionRate, pomodoroRatio, dailyGoalProgress);

  // Find the best performing subject based on completed tasks
  const subjectPerformance: Record<string, {completed: number;total: number;}> = {};

  tasks.forEach((task) => {
    if (task.subject) {
      if (!subjectPerformance[task.subject]) {
        subjectPerformance[task.subject] = { completed: 0, total: 0 };
      }
      subjectPerformance[task.subject].total++;
      if (task.status === 'COMPLETED') {
        subjectPerformance[task.subject].completed++;
      }
    }
  });

  const bestSubject = Object.entries(subjectPerformance).reduce((best, current) => {
    const [, stats] = current;
    const currentRate = stats.total > 0 ? stats.completed / stats.total * 100 : 0;
    const bestRate = best[1].total > 0 ? best[1].completed / best[1].total * 100 : 0;

    return currentRate > bestRate ? current : best;
  }, ['', { completed: 0, total: 0 }]);

  // Identify optimal study times
  const hourlyPerformance: Record<number, {sessions: number;avgDuration: number;}> = {};

  studySessions.forEach((session) => {
    const hour = new Date(session.startTime).getHours();
    if (!hourlyPerformance[hour]) {
      hourlyPerformance[hour] = { sessions: 0, avgDuration: 0 };
    }

    const current = hourlyPerformance[hour];
    const newAvg = (current.avgDuration * current.sessions + session.durationMin) / (current.sessions + 1);
    current.avgDuration = newAvg;
    current.sessions += 1;
  });

  // Find the hour with highest average duration
  const bestStudyHour = Object.entries(hourlyPerformance).reduce((best, [hour, data]) => {
    const [, bestData] = best;
    return data.avgDuration > bestData.avgDuration ? [hour, data] : best;
  }, ['0', { sessions: 0, avgDuration: 0 }]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          رؤى الإنتاجية
        </CardTitle>
        <CardDescription>
          تحليل متعمق لأنماط دراستك ونقاط القوة لديك
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <h3 className="font-medium">نسبة الانضباط</h3>
            </div>
            <div className="text-2xl font-bold text-purple-600">{disciplineScore}%</div>
            <p className="text-sm text-muted-foreground">
              بناء على اكتمال المهام والاستمرارية
            </p>
            <Progress value={disciplineScore} className="h-2" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-500" />
              <h3 className="font-medium">نسبة الإتقان</h3>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{masteryScore}%</div>
            <p className="text-sm text-muted-foreground">
              بناء على التركيز وكفاءة الدراسة
            </p>
            <Progress value={masteryScore} className="h-2" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <h3 className="font-medium">كفاءة الدراسة</h3>
            </div>
            <div className="text-2xl font-bold text-blue-600">{studyEfficiency}%</div>
            <p className="text-sm text-muted-foreground">
              مقارنة بين الوقت المقدر والفعلي
            </p>
            <Progress value={studyEfficiency} className="h-2" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-orange-500" />
              <h3 className="font-medium">أفضل موضوع</h3>
            </div>
            <div className="text-xl font-bold text-orange-600">
              {bestSubject[0] || 'لم يحدد'}
            </div>
            <p className="text-sm text-muted-foreground">
              أعلى نسبة إكمال للمهام
            </p>
            {bestSubject[0] &&
            <Badge variant="secondary">
                {bestSubject[1].total > 0 ?
              `${Math.round(bestSubject[1].completed / bestSubject[1].total * 100)}%` :
              '0%'} إكمال
              </Badge>
            }
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" />
              <h3 className="font-medium">أفضل وقت للدراسة</h3>
            </div>
            <div className="text-xl font-bold text-indigo-600">
              {bestStudyHour[0]}:00
            </div>
            <p className="text-sm text-muted-foreground">
              متوسط {Math.round(parseFloat(bestStudyHour[1].avgDuration.toFixed(1)))} دقيقة
            </p>
            <Badge variant="outline">
              {bestStudyHour[1].sessions} جلسة
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-teal-500" />
              <h3 className="font-medium">نوعية التركيز</h3>
            </div>
            <div className="text-xl font-bold text-teal-600">
              {pomodoroRatio >= 0.5 ? 'مرتفع' : pomodoroRatio >= 0.25 ? 'متوسط' : 'منخفض'}
            </div>
            <p className="text-sm text-muted-foreground">
              جلسات بومودورو {Math.round(pomodoroRatio * 100)}%
            </p>
            <Progress value={pomodoroRatio * 100} className="h-2" />
          </div>
        </div>
        
        <div className="mt-8">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            اقتراحات لتحسين إنتاجيتك
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completionRate < 70 &&
            <li className="flex items-start p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Target className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                <span>حدد أولوياتك: ركز على المهام عالية الأهمية أولاً</span>
              </li>
            }
            {studyEfficiency < 70 &&
            <li className="flex items-start p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
                <span>حسّن تقدير الوقت: خصص وقتًا أكثر دقة للمهام الصعبة</span>
              </li>
            }
            {pomodoroRatio < 0.3 &&
            <li className="flex items-start p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <BookOpen className="h-4 w-4 text-purple-500 mt-0.5 mr-2 flex-shrink-0" />
                <span>جرب تقنية بومودورو: استخدم فترات الدراسة المركزة لزيادة إنتاجيتك</span>
              </li>
            }
            <li className="flex items-start p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <Calendar className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
              <span>خطط ليومك مسبقًا: ضع جدولًا زمنيًا لمهامك في بداية كل يوم</span>
            </li>
            <li className="flex items-start p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
              <Zap className="h-4 w-4 text-indigo-500 mt-0.5 mr-2 flex-shrink-0" />
              <span>قلل المشتتات: حدد أوقاتًا معينة لفحص الهاتف والرسائل</span>
            </li>
            <li className="flex items-start p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg">
                <Award className="h-4 w-4 text-teal-500 mt-0.5 mr-2 flex-shrink-0" />
                <span>احتفل بالإنجازات: كافئ نفسك عند إكمال المهام المهمة</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>);

};

export default ProductivityInsights;
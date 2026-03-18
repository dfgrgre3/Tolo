'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Target, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Flame, 
  TrendingUp, 
  Trophy,
  Zap,
  BookOpen
} from 'lucide-react';
import { formatTime } from '../utils/timeUtils';
import type { Task, Reminder, StudySession, TimeStats } from '../types';
import QuickActions from './QuickActions';
import UpcomingTasksCard from './UpcomingTasksCard';
import UpcomingRemindersCard from './UpcomingRemindersCard';

interface DashboardTabProps {
  stats: TimeStats;
  subjects: string[];
  tasks: Task[];
  reminders: Reminder[];
  studySessions: StudySession[];
  showCompletedTasks: boolean;
  showUpcomingRemindersOnly: boolean;
  onTabChange: (tab: string) => void;
  onToggleCompletedTasks: () => void;
  onToggleUpcomingReminders: () => void;
  onTimerToggle: (taskId?: string) => void;
}

export default function DashboardTab({
  stats,
  subjects,
  tasks,
  reminders,
  studySessions,
  showCompletedTasks,
  showUpcomingRemindersOnly,
  onTabChange,
  onToggleCompletedTasks,
  onToggleUpcomingReminders,
  onTimerToggle
}: DashboardTabProps) {
  const upcomingTasks = tasks
    .filter(task => 
      task.dueAt && 
      new Date(task.dueAt) > new Date() && 
      (showCompletedTasks || task.status !== 'COMPLETED')
    )
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
    .slice(0, 5);

  const recentSessions = studySessions
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المهام المكتملة</CardTitle>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.completedTasks}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              من أصل {tasks.length} مهمة
            </p>
            <Progress 
              value={tasks.length ? Math.round((stats.completedTasks / tasks.length) * 100) : 0} 
              className="mt-2 h-1.5" 
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ساعات الدراسة</CardTitle>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{stats.studyHours}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              هذا الأسبوع
            </p>
            <Progress 
              value={Math.min(100, stats.weeklyGoalProgress)} 
              className="mt-2 h-1.5" 
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الانضباط</CardTitle>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{stats.disciplineScore}%</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              استمرارية وتحقيق الأهداف
            </p>
            <Progress 
              value={stats.disciplineScore} 
              className="mt-2 h-1.5 bg-purple-300" 
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الإتقان</CardTitle>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">{stats.masteryScore}%</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              كفاءة الدراسة والتركيز
            </p>
            <Progress 
              value={stats.masteryScore} 
              className="mt-2 h-1.5 bg-emerald-300" 
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>الإجراءات السريعة</span>
              </CardTitle>
              <CardDescription>
                ابدأ المهام أو مؤقت الدراسة بنقرة واحدة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuickActions
                onAction={(action) => {
                  switch (action) {
                    case 'new-task':
                      onTabChange('tasks');
                      return;
                    case 'new-reminder':
                      onTabChange('reminders');
                      return;
                    case 'start-timer':
                    case 'quick-study':
                      onTimerToggle(undefined);
                      return;
                    case 'set-goal':
                      onTabChange('goals');
                      return;
                    case 'view-schedule':
                      onTabChange('schedule');
                      return;
                    case 'view-analytics':
                      onTabChange('analytics');
                      return;
                    case 'view-history':
                      onTabChange('history');
                      return;
                    default:
                      return;
                  }
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>المهام القادمة</CardTitle>
                <CardDescription>المهام التي يجب إنجازها قريباً</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onToggleCompletedTasks}
              >
                {showCompletedTasks ? 'إخفاء المكتملة' : 'عرض المكتملة'}
              </Button>
            </CardHeader>
            <CardContent>
              <UpcomingTasksCard 
                tasks={upcomingTasks}
                showCompleted={showCompletedTasks}
                onToggleView={onToggleCompletedTasks}
                onTabChange={onTabChange}
                onTimerToggle={onTimerToggle}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                متوالية الالتزام
              </CardTitle>
              <CardDescription>
                عدد الأيام المتتالية التي تحقق فيها أهدافك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-500">{stats.streakDays}</div>
                  <div className="text-sm text-muted-foreground">يوم</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm">
                  <Zap className="h-4 w-4 text-yellow-500 ml-2" />
                  <span>التركيز: {stats.focusScore}%</span>
                </div>
                <div className="flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-blue-500 ml-2" />
                  <span>الكفاءة: {stats.studyEfficiency}%</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 text-purple-500 ml-2" />
                  <span>البومودورو: {stats.pomodoroSessions}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>التذكيرات القادمة</CardTitle>
                <CardDescription>تذكيراتك في الـ 24 ساعة القادمة</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onToggleUpcomingReminders}
              >
                {showUpcomingRemindersOnly ? 'إظهار الكل' : 'القادمة فقط'}
              </Button>
            </CardHeader>
            <CardContent>
              <UpcomingRemindersCard 
                reminders={reminders.filter(r => {
                  const now = new Date();
                  const remindDate = new Date(r.remindAt);
                  return remindDate > now;
                })} 
                showUpcomingOnly={showUpcomingRemindersOnly}
                onToggleView={onToggleUpcomingReminders}
                onTabChange={onTabChange}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>جلسات الدراسة الأخيرة</CardTitle>
              <CardDescription>سجل جلساتك الدراسية الأخيرة</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSessions.length > 0 ? (
                <div className="space-y-4">
                  {recentSessions.map((session, index) => (
                    <div 
                      key={`${session.id}-${index}`} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {session.taskId 
                            ? tasks.find(t => t.id === session.taskId)?.title || 'جلسة مذاكرة' 
                            : 'جلسة مذاكرة'}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(session.durationMin * 60)} • {new Date(session.startTime).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {Math.floor(session.durationMin)} د
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">لا توجد جلسات بعد</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { motion } from "framer-motion";

import {
  Target,
  CheckCircle2,
  Clock,
  Flame,
  TrendingUp,
  Trophy,
  Zap,
  BookOpen,
  Sword,
  ShieldAlert,
  Star } from
'lucide-react';
import { formatTime } from '../utils/timeUtils';
import type { Task, Reminder, StudySession, TimeStats } from '../types';
import QuickActions from './QuickActions';
import UpcomingTasksCard from './UpcomingTasksCard';
import UpcomingRemindersCard from './UpcomingRemindersCard';
import CircularProgress from './CircularProgress';
import MasterySystem from './MasterySystem';
import StudyAdvisor from './StudyAdvisor';

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
  const upcomingTasks = tasks.
  filter((task) =>
  task.dueAt &&
  new Date(task.dueAt) > new Date() && (
  showCompletedTasks || task.status !== 'COMPLETED')
  ).
  sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()).
  slice(0, 5);

  const recentSessions = studySessions.
  sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).
  slice(0, 3);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* RPG Mastery & Advisor */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <MasterySystem stats={stats} />
        <StudyAdvisor stats={stats} />
      </motion.div>

      {/* RPG Stats Indicators (Minified) */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, staggerChildren: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <motion.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="h-full bg-background/30 backdrop-blur-2xl border border-blue-500/20 shadow-[0_8px_32px_rgba(59,130,246,0.15)] relative overflow-hidden group rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-colors" />
            <CardHeader className="pb-2 text-center relative z-10">
              <CardTitle className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <Sword className="h-4 w-4" /> معدل الإنجاز
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-2 pb-4 relative z-10">
              <div className="text-3xl font-black text-blue-500">{tasks.length ? Math.round(stats.completedTasks / tasks.length * 100) : 0}%</div>
              <div className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">{stats.completedTasks} مهمة مكتملة</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="h-full bg-background/30 backdrop-blur-2xl border border-orange-500/20 shadow-[0_8px_32px_rgba(249,115,22,0.15)] relative overflow-hidden group rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl group-hover:bg-orange-500/30 transition-colors" />
            <CardHeader className="pb-2 text-center relative z-10">
              <CardTitle className="text-sm font-bold text-orange-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <BookOpen className="h-4 w-4" /> تقدم الدراسة
              </CardTitle>
            </CardHeader>
             <CardContent className="flex flex-col items-center justify-center pt-2 pb-4 relative z-10">
                <div className="text-3xl font-black text-orange-500">{Math.round(stats.weeklyGoalProgress)}%</div>
                <div className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">{stats.studyHours} ساعات متراكمة</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="h-full bg-background/30 backdrop-blur-2xl border border-purple-500/20 shadow-[0_8px_32px_rgba(168,85,247,0.15)] relative overflow-hidden group rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-colors" />
            <CardHeader className="pb-2 text-center relative z-10">
              <CardTitle className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <ShieldAlert className="h-4 w-4" /> الانضباط
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-2 pb-4 relative z-10">
                <div className="text-3xl font-black text-purple-500">{stats.disciplineScore}%</div>
                <div className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">القوة والثبات</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="h-full bg-background/30 backdrop-blur-2xl border border-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.15)] relative overflow-hidden group rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-colors" />
            <CardHeader className="pb-2 text-center relative z-10">
              <CardTitle className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <Trophy className="h-4 w-4" /> الإتقان
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-2 pb-4 relative z-10">
                <div className="text-3xl font-black text-emerald-500">{stats.masteryScore}%</div>
                <div className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">السيطرة التامة</div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Boards */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
          
          <Card className="bg-background/40 backdrop-blur-xl border-white/5 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                 <Zap className="h-6 w-6 text-amber-500 fill-amber-500/20" /> الإجراءات السريعة
              </CardTitle>
              <CardDescription>
                الوصول السريع للأدوات الاستراتيجية
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
                      onTabChange('tasks');
                      return;
                    case 'view-schedule':
                      onTabChange('schedule');
                      return;
                    case 'view-analytics':
                      return;
                    case 'view-history':
                      onTabChange('history');
                      return;
                    default:
                      return;
                  }
                }} />
            </CardContent>
          </Card>

          <Card className="bg-background/40 backdrop-blur-xl border-white/5 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Sword className="h-5 w-5 text-indigo-400" /> ساحة القتال القادمة
                </CardTitle>
                <CardDescription>المهام المنتظرة قريباً</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full shadow-sm hover:shadow-md transition-shadow"
                onClick={onToggleCompletedTasks}>
                {showCompletedTasks ? 'إخفاء المهام المنجزة' : 'عرض السجل المكتمل'}
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <UpcomingTasksCard
                tasks={upcomingTasks}
                showCompleted={showCompletedTasks}
                onToggleView={onToggleCompletedTasks}
                onTabChange={onTabChange}
                onTimerToggle={onTimerToggle} />
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-8">
          
          <Card className="bg-gradient-to-b from-orange-500/10 to-transparent border-orange-500/20 rounded-3xl backdrop-blur-xl shadow-[0_0_30px_rgba(249,115,22,0.1)] relative overflow-hidden group">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-400 to-red-600 top-0 w-full animate-pulse opacity-50"></div>
            <CardHeader className="text-center pb-2 pt-8">
              <div className="mx-auto w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(249,115,22,0.5)] group-hover:scale-110 transition-transform">
                 <Flame className="h-8 w-8 text-orange-500 drop-shadow-md" />
              </div>
              <CardTitle className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                شعلة الحماس
              </CardTitle>
              <CardDescription className="text-orange-200/60 font-medium">أيام الالتزام المستمر</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center pb-4">
                <div className="text-6xl font-black text-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.6)] group-hover:drop-shadow-[0_0_30px_rgba(249,115,22,0.8)] transition-all">
                   {stats.streakDays}
                </div>
                <div className="text-sm font-bold text-orange-300 tracking-wider">أيام</div>
              </div>
              
              <div className="bg-background/40 rounded-2xl p-4 mt-2 space-y-3 border border-orange-500/10">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" /> طاقة التركيز</div>
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">{stats.focusScore}%</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> معدل الكفاءة</div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{stats.studyEfficiency}%</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-purple-500" /> جلسات الإنجاز</div>
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">{stats.pomodoroSessions} جلسة</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/40 backdrop-blur-xl border-white/5 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
               <CardTitle className="text-lg font-bold flex items-center gap-2">
                 <ShieldAlert className="h-5 w-5 text-rose-400" /> التنبيهات المنتظرة
               </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={onToggleUpcomingReminders}>
                {showUpcomingRemindersOnly ? 'عرض الكل' : 'القادمة فقط'}
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <UpcomingRemindersCard
                reminders={reminders.filter((r) => {
                  const now = new Date();
                  const remindDate = new Date(r.remindAt);
                  return remindDate > now;
                })}
                showUpcomingOnly={showUpcomingRemindersOnly}
                onToggleView={onToggleUpcomingReminders}
                onTabChange={onTabChange} />
            </CardContent>
          </Card>

          <Card className="bg-background/40 backdrop-blur-xl border-white/5 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-lg font-bold">مخطوطات السجل القديم</CardTitle>
              <CardDescription>أحدث جلسات التركيز المكتملة</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {recentSessions.length > 0 ?
              <div className="space-y-4">
                  {recentSessions.map((session, index) =>
                <div
                  key={`${session.id}-${index}`}
                  className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-white/5 hover:bg-muted/40 transition-colors group">
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-foreground/90 group-hover:text-primary transition-colors">
                          {session.taskId ?
                      tasks.find((t) => t.id === session.taskId)?.title || 'جلسة تدريب مكثفة' :
                      'تحصيل علمي'}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5 font-medium">
                          <Clock className="h-3 w-3 text-primary/70" />
                          <span className="bg-background/50 px-2 py-0.5 rounded-md">{formatTime(session.durationMin * 60)}</span>
                          <span className="opacity-50">⬢</span>
                          <span>{new Date(session.startTime).toLocaleDateString('ar-SA')}</span>
                        </div>
                      </div>
                      <Badge variant="default" className="ml-3 bg-primary/20 text-primary border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground shadow-sm transition-all h-8 px-3">
                        {Math.floor(session.durationMin)} د
                      </Badge>
                    </div>
                )}
                </div> :
              <div className="text-center text-muted-foreground py-8 bg-muted/10 rounded-2xl border border-dashed border-white/10">
                  <Clock className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p>لا توجد مخطوطات تدريبية بعد</p>
                </div>
              }
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>);

}
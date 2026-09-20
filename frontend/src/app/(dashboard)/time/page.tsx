'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  TimerReset,
  History,
  Bell,
  Settings,
  Filter,
  Search,
  BarChart3,
  Play,
  Pause,
  CalendarRange,
  KanbanSquare,
  Target,
  FileBarChart,
  Wrench
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// Components
import TimeManagementHeader from './_components/TimeManagementHeader';
import DashboardTab from './_components/DashboardTab';
import { ComponentErrorBoundary } from '@/components/ui/error-boundary';

// Hooks
import { useTimeData } from './hooks/useTimeData';
import { useTimeStats } from './hooks/useTimeStats';
import { useTimeFilters } from './hooks/useTimeFilters';
import { useOverdueNotifications } from './hooks/useOverdueNotifications';
import { toast } from 'sonner';

// Types
import type { Task, StudySession, Reminder, Schedule, TimeTrackerTask } from './types';

import { logger } from '@/lib/logger';
import { patchTaskRaw } from '@/features/tasks/api/tasks-gateway';
import { buildTaskPayload, mergeServerTask } from './_components/_components/task-utils';
import { useTimeTrackerStore } from '@/hooks/use-time-tracker-store';

const LazyWeeklySchedule = dynamic(() => import("@/app/(dashboard)/time/_components/WeeklySchedule"), { ssr: false });
const LazyTaskManagement = dynamic(() => import("@/app/(dashboard)/time/_components/TaskManagement"), { ssr: false });
const LazyStudySessionsHistory = dynamic(() => import("@/app/(dashboard)/time/_components/StudySessionsHistory"), { ssr: false });
const LazyReminders = dynamic(() => import("@/app/(dashboard)/time/_components/Reminders"), { ssr: false });
const LazyTimeTracker = dynamic(() => import("@/app/(dashboard)/time/_components/TimeTracker"), { ssr: false });
const LazyTimeAnalytics = dynamic(() => import('./_components/TimeAnalytics'), { ssr: false });
const LazyProductivityInsights = dynamic(() => import('./_components/ProductivityInsights'), { ssr: false });
const LazyExportDialog = dynamic(() => import('./_components/ExportDialog'), { ssr: false });
const LazyKeyboardShortcutsHelp = dynamic(() => import('./_components/KeyboardShortcutsHelp'), { ssr: false });
const QuickActionButton = dynamic(() => import('./_components/QuickActionButton'), { ssr: false });
const LazyTimeCalendar = dynamic(() => import('./_components/TimeCalendar'), { ssr: false });
const LazyTaskKanban = dynamic(() => import('./_components/TaskKanban'), { ssr: false });
const LazyGoalsHabits = dynamic(() => import('./_components/GoalsHabits'), { ssr: false });
const LazyAdvancedPomodoro = dynamic(() => import('./_components/AdvancedPomodoro'), { ssr: false });
const LazyProductivityReport = dynamic(() => import('./_components/ProductivityReport'), { ssr: false });
const LazyTaskTools = dynamic(() => import('./_components/TaskTools'), { ssr: false });

export default function TimeManagementPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { isRunning: isTimerRunning, startTimer, pauseTimer } = useTimeTrackerStore();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  // Search and filter states
  const [taskSearch, setTaskSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [reminderSearch, setReminderSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState<"all" | "today" | "week" | "month">("all");

  // UI states
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [showUpcomingRemindersOnly, setShowUpcomingRemindersOnly] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore state from localStorage on mount
  useEffect(() => {
    queueMicrotask(() => {
      const storedStateRaw = localStorage.getItem('time-management-state');
      if (storedStateRaw) {
        try {
          const storedState = JSON.parse(storedStateRaw);
          if (storedState.activeTab) setActiveTab(storedState.activeTab);
          if (storedState.taskFilter) setTaskFilter(storedState.taskFilter);
          if (storedState.sessionFilter) setSessionFilter(storedState.sessionFilter);
          if (typeof storedState.showCompletedTasks === 'boolean') setShowCompletedTasks(storedState.showCompletedTasks);
          if (typeof storedState.showUpcomingRemindersOnly === 'boolean') setShowUpcomingRemindersOnly(storedState.showUpcomingRemindersOnly);
          if (typeof storedState.showAnalytics === 'boolean') setShowAnalytics(storedState.showAnalytics);
        } catch (e) {
          logger.error('Failed to restore time management state', e);
        }
      }
      setIsInitialized(true);
    });
  }, []);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;

    const stateToSave = {
      activeTab,
      taskFilter,
      sessionFilter,
      showCompletedTasks,
      showUpcomingRemindersOnly,
      showAnalytics
    };

    localStorage.setItem('time-management-state', JSON.stringify(stateToSave));
  }, [activeTab, taskFilter, sessionFilter, showCompletedTasks, showUpcomingRemindersOnly, showAnalytics, isInitialized]);

  // Custom hooks
  const {
    isAuthenticated,
    schedule,
    subjects,
    tasks,
    studySessions,
    reminders,
    isLoading,
    fetchData,
    setTasks,
    setReminders,
    setStudySessions,
    setSchedule
  } = useTimeData();

  const {
    stats,
    updateStatsOnTaskChange,
    updateStatsOnTaskCreate,
    updateStatsOnTaskDelete,
    updateStatsOnSessionCreate,
    updateStatsOnReminderCreate,
    updateStatsOnReminderDelete
  } = useTimeStats({ tasks, studySessions, reminders });

  const { filteredTasks, filteredReminders, filteredSessions } = useTimeFilters({
    tasks,
    reminders,
    studySessions,
    taskSearch,
    taskFilter,
    reminderSearch,
    sessionFilter,
    showUpcomingRemindersOnly
  });

  // Handle task updates
  const handleTaskUpdate = useCallback((updatedTask: Task) => {
    const oldTask = tasks.find(t => t.id === updatedTask.id);
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (oldTask) {
      updateStatsOnTaskChange(oldTask, updatedTask);
    }
  }, [tasks, setTasks, updateStatsOnTaskChange]);

  // Kanban status move — optimistic + persisted with a FULL backend payload
  const handleKanbanStatusChange = useCallback(async (taskId: string, status: Task['status']) => {
    const oldTask = tasks.find(t => t.id === taskId);
    if (!oldTask || oldTask.status === status) return;
    const optimistic = { ...oldTask, status };
    setTasks(prev => prev.map(t => t.id === taskId ? optimistic : t));
    try {
      const saved = await patchTaskRaw<Task>(taskId, buildTaskPayload(optimistic));
      handleTaskUpdate(mergeServerTask(optimistic, saved));
    } catch (error) {
      setTasks(prev => prev.map(t => t.id === taskId ? oldTask : t));
      logger.error('Error moving task on kanban:', error);
      toast.error('فشل نقل المهمة — حاول مرة أخرى');
    }
  }, [tasks, setTasks, handleTaskUpdate]);

  // Handle new task creation
  const handleTaskCreate = useCallback((newTask: Task) => {
    setTasks(prev => [newTask, ...prev]);
    updateStatsOnTaskCreate(newTask);
    toast.success(`تم إنشاء المهمة "${newTask.title}" بنجاح`);
  }, [setTasks, updateStatsOnTaskCreate]);

  // Handle task deletion
  const handleTaskDelete = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    updateStatsOnTaskDelete(task);
    toast.warning(`تم حذف المهمة "${task.title}"`);
  }, [tasks, setTasks, updateStatsOnTaskDelete]);

  // Handle new study session
  const handleStudySessionCreate = useCallback((partialSession: Omit<StudySession, 'updatedAt'>) => {
    const newSession: StudySession = { ...partialSession, updatedAt: new Date().toISOString() };
    setStudySessions(prev => [newSession, ...prev]);
    updateStatsOnSessionCreate(newSession);
    toast.success(`تم تسجيل ${newSession.durationMin} دقيقة من المذاكرة`);
  }, [setStudySessions, updateStatsOnSessionCreate]);

  // Handle reminder updates
  const handleReminderUpdate = useCallback((updatedReminder: Reminder) => {
    setReminders(prev => prev.map(r => r.id === updatedReminder.id ? updatedReminder : r));
  }, [setReminders]);

  // Handle new reminder creation
  const handleReminderCreate = useCallback((newReminder: Reminder) => {
    setReminders(prev => [newReminder, ...prev]);
    updateStatsOnReminderCreate(newReminder);
    toast.success(`تم إضافة تذكير "${newReminder.title}"`);
  }, [setReminders, updateStatsOnReminderCreate]);

  // Handle reminder deletion
  const handleReminderDelete = useCallback((reminderId: string) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;
    setReminders(prev => prev.filter(r => r.id !== reminderId));
    updateStatsOnReminderDelete(reminder);
    toast.warning(`تم حذف تذكير "${reminder.title}"`);
  }, [reminders, setReminders, updateStatsOnReminderDelete]);

  // Handle schedule updates
  const handleScheduleUpdate = useCallback((updatedSchedule: Schedule) => {
    setSchedule(updatedSchedule);
  }, [setSchedule]);

  // Handle notifications with toast
  const handleNotification = useCallback((message: string, type: 'warning' | 'error') => {
    logger.info(`[${type.toUpperCase()}] ${message}`);
    const toastMethod = type === 'error' ? toast.error : toast.warning;
    toastMethod(type === 'error' ? `تنبيه مهم: ${message}` : message);
  }, []);

  // Overdue notifications
  useOverdueNotifications({
    tasks,
    onNotification: handleNotification
  });

  // Handle timer start/stop using global store
  const handleTimerToggle = useCallback((_taskId?: string) => {
    if (isTimerRunning) {
      pauseTimer();
    } else {
      startTimer();
      setActiveTab("tracker");
    }
  }, [isTimerRunning, startTimer, pauseTimer]);

  // Map our Task type to TimeTracker's expected Task type
  const mapTasksForTimeTracker = useMemo((): TimeTrackerTask[] => {
    if (!Array.isArray(tasks)) {
      logger.warn('tasks is not an array in mapTasksForTimeTracker:', tasks);
      return [];
    }
    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status || 'PENDING'
    }));
  }, [tasks]);

  // Calculate quick stats for header
  const quickStats = useMemo(() => {
    const today = new Date();
    return {
      todayTasks: tasks.filter(t =>
        t.dueAt && new Date(t.dueAt).toDateString() === today.toDateString()
      ).length,
      overdueTasks: tasks.filter(t =>
        t.dueAt && new Date(t.dueAt) < today && t.status !== 'COMPLETED'
      ).length,
      completedToday: tasks.filter(t =>
        t.completedAt && new Date(t.completedAt).toDateString() === today.toDateString()
      ).length,
      studyHours: stats.studyHours
    };
  }, [tasks, stats.studyHours]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8 space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64 bg-orange-500/10 rounded-xl" />
            <Skeleton className="h-4 w-96 bg-muted/50 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-12 w-32 bg-orange-500/5 rounded-xl" />
            <Skeleton className="h-12 w-12 bg-muted/40 rounded-xl" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-muted/40 border border-border p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 bg-orange-500/10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20 bg-muted" />
                  <Skeleton className="h-6 w-12 bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Tabs Skeleton */}
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between p-2 gap-2 bg-muted/40 border border-border rounded-3xl">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-11 flex-1 bg-muted/60 rounded-2xl" />
            ))}
          </div>
        </div>

        {/* Dashboard Content Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-muted/30 border border-border p-6 space-y-4">
              <Skeleton className="h-6 w-40 bg-muted" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-border">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48 bg-muted" />
                      <Skeleton className="h-3 w-32 bg-muted/60" />
                    </div>
                    <Skeleton className="h-6 w-16 bg-muted rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl bg-muted/30 border border-border p-6 space-y-4">
              <Skeleton className="h-6 w-32 bg-muted" />
              <Skeleton className="h-[200px] w-full bg-muted/50 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ComponentErrorBoundary onError={fetchData}>
      {/* `m.*` components throughout this page and its descendants — WeeklySchedule,
          TimeManagementHeader, DashboardTab, etc. — are animated by the global
          LazyMotion provider in providers/index.tsx. Don't nest another LazyMotion
          here; it can desync from the root provider's context under HMR. */}
      {/* Premium Background Layer */}
      <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
        {/* خلفية ثابتة بدون أنيميشن */}
        <div className="absolute top-0 right-0 w-[80%] h-[60%] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900/20 via-background to-background pointer-events-none" />
        <div className="absolute top-1/4 left-0 w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background pointer-events-none opacity-60 dark:opacity-40" />

        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto p-4 md:p-6 lg:p-8 rtl relative z-10" dir="rtl">
          <div
            className="mb-8"
          >
            <TimeManagementHeader
              isTimerRunning={isTimerRunning}
              onTimerToggle={() => handleTimerToggle()}
              onRefresh={fetchData}
              quickStats={quickStats}
              fullStats={stats}
              subjects={subjects}
              onTaskCreate={handleTaskCreate}
              isCreateTaskOpen={isCreateTaskOpen}
              setIsCreateTaskOpen={setIsCreateTaskOpen}
            />
          </div>

          <QuickActionButton
            onAction={(type) => {
              if (type === 'task') {
                setIsCreateTaskOpen(true);
              } else if (type === 'reminder') {
                setActiveTab('reminders');
              } else if (type === 'timer') {
                handleTimerToggle();
              }
            }}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* RPG Style Glassmorphic Floating Tabs */}
            <div className="sticky top-4 z-40 mb-8 max-w-6xl mx-auto">
              <TabsList className="flex w-full overflow-x-auto hide-scrollbar sm:grid sm:grid-cols-4 lg:grid-cols-6 h-auto p-2 gap-2 bg-card border border-border shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-3xl w-full">
                {[
                  { id: "dashboard", label: "لوحة القيادة", icon: LayoutDashboard },
                  { id: "schedule", label: "خريطة الأسبوع", icon: CalendarDays },
                  { id: "tasks", label: "سجل المهام", icon: CheckSquare },
                  { id: "kanban", label: "كانبان", icon: KanbanSquare },
                  { id: "calendar", label: "التقويم", icon: CalendarRange },
                  { id: "tracker", label: "بؤرة التركيز", icon: TimerReset },
                  { id: "pomodoro", label: "بومودورو", icon: Play },
                  { id: "goals", label: "أهداف وعادات", icon: Target },
                  { id: "history", label: "موسوعة السجل", icon: History },
                  { id: "tools", label: "أدوات المهام", icon: Wrench },
                  { id: "reports", label: "التقارير", icon: FileBarChart },
                  { id: "reminders", label: "أجراس التنبيه", icon: Bell }
                ].map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="relative px-2 py-3 sm:py-3.5 text-sm sm:text-sm font-bold rounded-2xl whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary-strong hover:bg-muted/30 w-full group overflow-hidden"
                    >
                    {activeTab === tab.id && (
                      <div
                        className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-blue-500/10 rounded-2xl border border-orange-500/30 z-0 shadow-[inset_0_0_10px_rgba(249,115,22,0.1)]"
                      />
                    )}
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <tab.icon className="h-4 w-4 opacity-70 group-hover:opacity-100 group-data-[state=active]:opacity-100" />
                      <span>{tab.label}</span>
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="mt-6">
              <TabsContent value="dashboard" className="space-y-6 mt-0">
                <div className="flex justify-between items-center mb-4 gap-2">
                  <LazyKeyboardShortcutsHelp />
                  <div className="flex gap-2">
                    <LazyExportDialog
                      tasks={tasks}
                      studySessions={studySessions}
                      reminders={reminders}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAnalytics(!showAnalytics)}
                      className="flex items-center gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      {showAnalytics ? 'إخفاء التحليلات' : 'إظهار التحليلات'}
                    </Button>
                  </div>
                </div>

                <ComponentErrorBoundary>
                  <DashboardTab
                    stats={stats}
                    subjects={subjects}
                    tasks={filteredTasks}
                    reminders={filteredReminders}
                    studySessions={studySessions}
                    showCompletedTasks={showCompletedTasks}
                    showUpcomingRemindersOnly={showUpcomingRemindersOnly}
                    onTabChange={setActiveTab}
                    onToggleCompletedTasks={() => setShowCompletedTasks(!showCompletedTasks)}
                    onToggleUpcomingReminders={() => setShowUpcomingRemindersOnly(!showUpcomingRemindersOnly)}
                    onTimerToggle={handleTimerToggle}
                  />
                </ComponentErrorBoundary>

                {showAnalytics && activeTab === "dashboard" && (
                  <div className="space-y-6">
                    <ComponentErrorBoundary>
                      <LazyTimeAnalytics
                        tasks={tasks}
                        studySessions={studySessions}
                        reminders={reminders}
                      />
                    </ComponentErrorBoundary>
                    <ComponentErrorBoundary>
                      <LazyProductivityInsights
                        tasks={tasks}
                        studySessions={studySessions}
                      />
                    </ComponentErrorBoundary>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="schedule" className="mt-0">
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">الجدول الأسبوعي</h2>
                    <p className="text-sm text-muted-foreground mt-1">نظم دراستك وخطط لأسبوعك</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="transition-shadow hover:shadow-md">
                      <Settings className="h-4 w-4 ms-2" />
                      إعدادات الجدول
                    </Button>
                  </div>
                </div>
                {isAuthenticated ? (
                  <div>
                    <ComponentErrorBoundary>
                      <LazyWeeklySchedule schedule={schedule} subjects={subjects} onScheduleUpdate={handleScheduleUpdate} />
                    </ComponentErrorBoundary>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-background/20 backdrop-blur-sm rounded-2xl border border-dashed">
                    يرجى تسجيل الدخول لعرض جدولك الأسبوعي
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tasks" className="mt-0">
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">إدارة المهام</h2>
                    <p className="text-sm text-muted-foreground mt-1">تابع مهامك وأكملها في الوقت المحدد</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث في المهام..."
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        className="ps-8 w-full sm:w-40 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <Select value={taskFilter} onValueChange={(value: "all" | "pending" | "in_progress" | "completed") => setTaskFilter(value)}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder="تصفية حسب الحالة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع المهام</SelectItem>
                        <SelectItem value="pending">في الانتظار</SelectItem>
                        <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                        <SelectItem value="completed">مكتملة</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="transition-shadow hover:shadow-md">
                      <Filter className="h-4 w-4 ms-2" />
                      تصفية متقدمة
                    </Button>
                  </div>
                </div>
                {isAuthenticated ? (
                  <div>
                    <ComponentErrorBoundary>
                      <LazyTaskManagement
                        initialTasks={filteredTasks}
                        subjects={subjects}
                        onTaskUpdate={handleTaskUpdate}
                        onTaskCreate={handleTaskCreate}
                        onTaskDelete={handleTaskDelete}
                      />
                    </ComponentErrorBoundary>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-background/20 backdrop-blur-sm rounded-2xl border border-dashed">
                    يرجى تسجيل الدخول لإدارة مهامك
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tracker" className="mt-0">
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">مؤقت الوقت</h2>
                    <p className="text-sm text-muted-foreground mt-1">سجل وقت مذاكرتك واتبع تقدمك</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleTimerToggle()}
                      className={`flex items-center gap-2 shadow-lg ${isTimerRunning
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                      {isTimerRunning ? (
                        <>
                          <Pause className="h-4 w-4" />
                          إيقاف
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          بدء
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {isAuthenticated ? (
                  <div>
                    <ComponentErrorBoundary>
                      <LazyTimeTracker
                        tasks={mapTasksForTimeTracker}
                        subjects={subjects.map(String)}
                        onStudySessionCreate={handleStudySessionCreate}
                      />
                    </ComponentErrorBoundary>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-background/20 backdrop-blur-sm rounded-2xl border border-dashed">
                    يرجى تسجيل الدخول لبدء تتبع الوقت
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">سجل المذاكرة</h2>
                    <p className="text-sm text-muted-foreground mt-1">راجع تاريخ جلسات المذاكرة وتحليل أدائك</p>
                  </div>
                  <div className="flex gap-2">
                    <Select value={sessionFilter} onValueChange={(value: "all" | "today" | "week" | "month") => setSessionFilter(value)}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder="تصفية حسب التاريخ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الجلسات</SelectItem>
                        <SelectItem value="today">اليوم</SelectItem>
                        <SelectItem value="week">هذا الأسبوع</SelectItem>
                        <SelectItem value="month">هذا الشهر</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="transition-shadow hover:shadow-md">
                      <BarChart3 className="h-4 w-4 ms-2" />
                      تحليل البيانات
                    </Button>
                  </div>
                </div>
                <div>
                  <ComponentErrorBoundary>
                    <LazyStudySessionsHistory
                      sessions={filteredSessions.length > 0 ? filteredSessions : studySessions}
                      subjects={subjects.map(String)}
                    />
                  </ComponentErrorBoundary>
                </div>
              </TabsContent>

              <TabsContent value="kanban" className="mt-0">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">لوحة كانبان</h2>
                  <p className="text-sm text-muted-foreground mt-1">اسحب مهامك بين المراحل: انتظار ← تنفيذ ← إنجاز</p>
                </div>
                <ComponentErrorBoundary>
                  <LazyTaskKanban
                    tasks={tasks}
                    onStatusChange={handleKanbanStatusChange}
                  />
                </ComponentErrorBoundary>
              </TabsContent>

              <TabsContent value="calendar" className="mt-0">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">التقويم الشهري</h2>
                  <p className="text-sm text-muted-foreground mt-1">عرض موحد للمهام والجلسات والتذكيرات على مدار الشهر</p>
                </div>
                <ComponentErrorBoundary>
                  <LazyTimeCalendar tasks={tasks} sessions={studySessions} reminders={reminders} />
                </ComponentErrorBoundary>
              </TabsContent>

              <TabsContent value="pomodoro" className="mt-0">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">بومودورو متقدم</h2>
                  <p className="text-sm text-muted-foreground mt-1">خصص دورات التركيز والاستراحة مع تنبيه صوتي وانتقال تلقائي</p>
                </div>
                <ComponentErrorBoundary>
                  <LazyAdvancedPomodoro onSessionComplete={(min) => handleStudySessionCreate({
                    id: `pomo_${Date.now()}`,
                    durationMin: min,
                    startTime: new Date(Date.now() - min * 60000).toISOString(),
                    endTime: new Date().toISOString(),
                    subjectId: '',
                    createdAt: new Date().toISOString(),
                  })} />
                </ComponentErrorBoundary>
              </TabsContent>

              <TabsContent value="goals" className="mt-0">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">الأهداف والعادات</h2>
                  <p className="text-sm text-muted-foreground mt-1">حدد أهدافًا رقمية وابنِ عادات يومية مع تتبع الالتزام — تُحفظ على جهازك</p>
                </div>
                <ComponentErrorBoundary>
                  <LazyGoalsHabits studyMinutesWeek={studySessions.filter(s => {
                    const d = new Date(s.startTime);
                    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
                    return d >= weekAgo;
                  }).reduce((a, s) => a + s.durationMin, 0)} />
                </ComponentErrorBoundary>
              </TabsContent>

              <TabsContent value="tools" className="mt-0">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">أدوات المهام</h2>
                  <p className="text-sm text-muted-foreground mt-1">مهام تتولد تلقائيًا كل يوم + قوالب جاهزة بمهام فرعية بضغطة واحدة</p>
                </div>
                <ComponentErrorBoundary>
                  <LazyTaskTools subjects={subjects.map(String)} onTaskCreate={handleTaskCreate} />
                </ComponentErrorBoundary>
              </TabsContent>

              <TabsContent value="reports" className="mt-0">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">تقارير الإنتاجية</h2>
                  <p className="text-sm text-muted-foreground mt-1">خريطة نشاط 12 أسبوع مع ملخص وإمكانية التصدير CSV</p>
                </div>
                <ComponentErrorBoundary>
                  <LazyProductivityReport tasks={tasks} sessions={studySessions} />
                </ComponentErrorBoundary>
              </TabsContent>

              <TabsContent value="reminders" className="mt-0">
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">التذكيرات</h2>
                    <p className="text-sm text-muted-foreground mt-1">لا تنس أي موعد أو مهمة مهمة</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث في التذكيرات..."
                        value={reminderSearch}
                        onChange={(e) => setReminderSearch(e.target.value)}
                        className="ps-8 w-full sm:w-40 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="transition-shadow hover:shadow-md">
                      <Filter className="h-4 w-4 ms-2" />
                      تصفية متقدمة
                    </Button>
                  </div>
                </div>
                {isAuthenticated ? (
                  <div>
                    <ComponentErrorBoundary>
                      <LazyReminders
                        initialReminders={filteredReminders.length > 0 ? filteredReminders : reminders}
                        onReminderUpdate={handleReminderUpdate}
                        onReminderCreate={handleReminderCreate}
                        onReminderDelete={handleReminderDelete}
                      />
                    </ComponentErrorBoundary>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-background/20 backdrop-blur-sm rounded-2xl border border-dashed">
                    يرجى تسجيل الدخول لعرض تذكيراتك
                  </div>
                )}
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </div>
    </ComponentErrorBoundary>
  );
}

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  TimerReset,
  History,
  Bell,
  RefreshCw,
  Settings,
  Filter,
  Search,
  BarChart3,
  Play,
  Pause
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Components
import TimeManagementHeader from './components/TimeManagementHeader';
import DashboardTab from './components/DashboardTab';
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

const LazyWeeklySchedule = dynamic(() => import("@/app/(dashboard)/time/components/WeeklySchedule"));
const LazyTaskManagement = dynamic(() => import("@/app/(dashboard)/time/components/TaskManagement"));
const LazyStudySessionsHistory = dynamic(() => import("@/app/(dashboard)/time/components/StudySessionsHistory"));
const LazyReminders = dynamic(() => import("@/app/(dashboard)/time/components/Reminders"));
const LazyTimeTracker = dynamic(() => import("@/app/(dashboard)/time/components/TimeTracker"));
const LazyTimeAnalytics = dynamic(() => import('./components/TimeAnalytics'));
const LazyProductivityInsights = dynamic(() => import('./components/ProductivityInsights'));
const LazyExportDialog = dynamic(() => import('./components/ExportDialog'));
const LazyKeyboardShortcutsHelp = dynamic(() => import('./components/KeyboardShortcutsHelp'));
const QuickActionButton = dynamic(() => import('./components/QuickActionButton'));

export default function TimeManagementPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
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
        console.error('Failed to restore time management state', e);
      }
    }
    setIsInitialized(true);
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
    userId,
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
  const handleStudySessionCreate = useCallback((newSession: StudySession) => {
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

  // Handle timer start/stop
  const handleTimerToggle = useCallback((_taskId?: string) => {
    setIsTimerRunning(prev => !prev);
    // Switch to tracker tab when timer starts
    if (!isTimerRunning) {
      setActiveTab("tracker");
    }
  }, [isTimerRunning]);

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
      <div className="container mx-auto p-4 text-center min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold">جاري التحميل...</p>
            <p className="text-sm text-muted-foreground">يرجى الانتظار بينما نقوم بتحميل بياناتك</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ComponentErrorBoundary onError={fetchData}>
      {/* Premium Background Layer */}
      <div className="min-h-screen bg-[#050B14] text-slate-100 relative overflow-hidden">
        {/* Animated Deep Space / RPG Glowing Orbs Background */}
        <div className="absolute top-0 right-0 w-[80%] h-[60%] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-background to-background pointer-events-none" />
        <div className="absolute top-1/4 left-0 w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background pointer-events-none opacity-60 dark:opacity-40 animate-pulse duration-10000" />

        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse duration-5000" />
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse duration-7000 delay-1000" />

        <div className="container mx-auto p-4 md:p-6 lg:p-8 rtl relative z-10" dir="rtl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-8"
          >
            <TimeManagementHeader
              isTimerRunning={isTimerRunning}
              onTimerToggle={() => handleTimerToggle()}
              onRefresh={fetchData}
              quickStats={quickStats}
              fullStats={stats}
              subjects={subjects}
              userId={userId || undefined}
              onTaskCreate={handleTaskCreate}
              isCreateTaskOpen={isCreateTaskOpen}
              setIsCreateTaskOpen={setIsCreateTaskOpen}
            />
          </motion.div>

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
            <div className="sticky top-4 z-40 mb-8 max-w-5xl mx-auto">
              <TabsList className="flex w-full overflow-x-auto hide-scrollbar sm:grid sm:grid-cols-3 md:grid-cols-6 h-auto p-2 gap-2 bg-background/50 backdrop-blur-2xl border border-white/10 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-3xl w-full">
                {[
                  { id: "dashboard", label: "لوحة القيادة", icon: LayoutDashboard },
                  { id: "schedule", label: "خريطة الأسبوع", icon: CalendarDays },
                  { id: "tasks", label: "سجل المهام", icon: CheckSquare },
                  { id: "tracker", label: "بؤرة التركيز", icon: TimerReset },
                  { id: "history", label: "موسوعة السجل", icon: History },
                  { id: "reminders", label: "أجراس التنبيه", icon: Bell }
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="relative px-2 py-3 sm:py-3.5 text-sm sm:text-sm font-bold transition-all duration-300 rounded-2xl whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-emerald-400 hover:bg-muted/30 w-full group overflow-hidden"
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-2xl border border-emerald-500/30 z-0 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-sm">
                      <tab.icon className="h-4 w-4 opacity-70 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity" />
                      <span className="group-data-[state=active]:text-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{tab.label}</span>
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

                {showAnalytics && activeTab === "dashboard" && (
                  <div className="space-y-6">
                    <LazyTimeAnalytics
                      tasks={tasks}
                      studySessions={studySessions}
                      reminders={reminders}
                    />
                    <LazyProductivityInsights
                      tasks={tasks}
                      studySessions={studySessions}
                    />
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
                    <Button variant="outline" size="sm" className="transition-all hover:shadow-md">
                      <Settings className="h-4 w-4 ml-2" />
                      إعدادات الجدول
                    </Button>
                  </div>
                </div>
                {userId ? (
                  <div className="animate-in fade-in duration-700">
                    <LazyWeeklySchedule schedule={schedule} subjects={subjects} userId={userId} onScheduleUpdate={handleScheduleUpdate} />
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
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث في المهام..."
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        className="pl-8 w-full sm:w-40 transition-all focus:ring-2 focus:ring-primary/20"
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
                    <Button variant="outline" size="sm" className="transition-all hover:shadow-md">
                      <Filter className="h-4 w-4 ml-2" />
                      تصفية متقدمة
                    </Button>
                  </div>
                </div>
                {userId ? (
                  <div className="animate-in fade-in duration-700">
                    <LazyTaskManagement
                      initialTasks={filteredTasks}
                      userId={userId}
                      subjects={subjects}
                      onTaskUpdate={handleTaskUpdate}
                      onTaskCreate={handleTaskCreate}
                      onTaskDelete={handleTaskDelete}
                    />
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
                      className={`flex items-center gap-2 transition-all shadow-lg hover:shadow-xl ${isTimerRunning
                          ? 'bg-red-600 hover:bg-red-700 animate-pulse'
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
                {userId ? (
                  <div className="animate-in fade-in duration-700">
                    <LazyTimeTracker
                      userId={userId}
                      tasks={mapTasksForTimeTracker}
                      subjects={subjects.map(String)}
                      onStudySessionCreate={handleStudySessionCreate}
                    />
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
                    <Button variant="outline" size="sm" className="transition-all hover:shadow-md">
                      <BarChart3 className="h-4 w-4 ml-2" />
                      تحليل البيانات
                    </Button>
                  </div>
                </div>
                <div className="animate-in fade-in duration-700">
                  <LazyStudySessionsHistory
                    sessions={filteredSessions.length > 0 ? filteredSessions : studySessions}
                    subjects={subjects.map(String)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="reminders" className="mt-0">
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">التذكيرات</h2>
                    <p className="text-sm text-muted-foreground mt-1">لا تنس أي موعد أو مهمة مهمة</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث في التذكيرات..."
                        value={reminderSearch}
                        onChange={(e) => setReminderSearch(e.target.value)}
                        className="pl-8 w-full sm:w-40 transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="transition-all hover:shadow-md">
                      <Filter className="h-4 w-4 ml-2" />
                      تصفية متقدمة
                    </Button>
                  </div>
                </div>
                {userId ? (
                  <div className="animate-in fade-in duration-700">
                    <LazyReminders
                      initialReminders={filteredReminders.length > 0 ? filteredReminders : reminders}
                      userId={userId}
                      onReminderUpdate={handleReminderUpdate}
                      onReminderCreate={handleReminderCreate}
                      onReminderDelete={handleReminderDelete}
                    />
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

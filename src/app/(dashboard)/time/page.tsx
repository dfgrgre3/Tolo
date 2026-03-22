'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, Settings, Filter, Search, BarChart3, Play, Pause } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Components
import TimeManagementHeader from './components/TimeManagementHeader';
import DashboardTab from './components/DashboardTab';
import { ComponentErrorBoundary } from '@/components/ui/ErrorBoundary';

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

export default function TimeManagementPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  // Search and filter states
  const [taskSearch, setTaskSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [reminderSearch, setReminderSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState<"all" | "today" | "week" | "month">("all");
  
  // UI states
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [showUpcomingRemindersOnly, setShowUpcomingRemindersOnly] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);

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
      <div className="container mx-auto p-4 rtl" dir="rtl">
      <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
        <TimeManagementHeader
          isTimerRunning={isTimerRunning}
          onTimerToggle={() => handleTimerToggle()}
          onRefresh={fetchData}
          quickStats={quickStats}
          subjects={subjects}
          userId={userId || undefined}
          onTaskCreate={handleTaskCreate}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 md:gap-2 mb-6 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger 
            value="dashboard"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            لوحة التحكم
          </TabsTrigger>
          <TabsTrigger 
            value="schedule"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            الجدول الأسبوعي
          </TabsTrigger>
          <TabsTrigger 
            value="tasks"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            إدارة المهام
          </TabsTrigger>
          <TabsTrigger 
            value="tracker"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            مؤقت الوقت
          </TabsTrigger>
          <TabsTrigger 
            value="history"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            سجل المذاكرة
          </TabsTrigger>
          <TabsTrigger 
            value="reminders"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            التذكيرات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

        <TabsContent value="schedule" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          {userId && activeTab === "schedule" && (
            <div className="animate-in fade-in duration-700">
              <LazyWeeklySchedule schedule={schedule} subjects={subjects} userId={userId} onScheduleUpdate={handleScheduleUpdate} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          {userId && activeTab === "tasks" && (
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
          )}
        </TabsContent>

        <TabsContent value="tracker" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">مؤقت الوقت</h2>
              <p className="text-sm text-muted-foreground mt-1">سجل وقت مذاكرتك واتبع تقدمك</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleTimerToggle()} 
                className={`flex items-center gap-2 transition-all shadow-lg hover:shadow-xl ${
                  isTimerRunning 
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
          {userId && activeTab === "tracker" && (
            <div className="animate-in fade-in duration-700">
              <LazyTimeTracker 
                userId={userId}
                tasks={mapTasksForTimeTracker}
                subjects={subjects.map(String)}
                onStudySessionCreate={handleStudySessionCreate}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          {activeTab === "history" && (
            <div className="animate-in fade-in duration-700">
              <LazyStudySessionsHistory 
                sessions={filteredSessions.length > 0 ? filteredSessions : studySessions} 
                subjects={subjects.map(String)}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="reminders" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          {userId && activeTab === "reminders" && (
            <div className="animate-in fade-in duration-700">
              <LazyReminders 
                initialReminders={filteredReminders.length > 0 ? filteredReminders : reminders} 
                userId={userId}
                onReminderUpdate={handleReminderUpdate}
                onReminderCreate={handleReminderCreate}
                onReminderDelete={handleReminderDelete}
              />
            </div>
          )}
        </TabsContent>

      </Tabs>
      </div>
    </ComponentErrorBoundary>
  );
}

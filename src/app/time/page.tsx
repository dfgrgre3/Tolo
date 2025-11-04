'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WeeklySchedule from "@/components/time/WeeklySchedule";
import TaskManagement from "@/components/time/TaskManagement";
import StudySessionsHistory from "@/components/time/StudySessionsHistory";
import Reminders from "@/components/time/Reminders";
import TimeTracker from "@/components/TimeTracker";
import { Button } from "@/shared/button";
import { RefreshCw, Settings, Filter, Search, BarChart3, Play, Pause } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Components
import TimeManagementHeader from './components/TimeManagementHeader';
import DashboardTab from './components/DashboardTab';

// Hooks
import { useTimeData } from './hooks/useTimeData';
import { useTimeStats } from './hooks/useTimeStats';
import { useTimeFilters } from './hooks/useTimeFilters';

// Types
import type { Task, StudySession, Reminder, Schedule, TimeTrackerTask } from './types';

export default function TimeManagementPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  
  // Search and filter states
  const [taskSearch, setTaskSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [reminderSearch, setReminderSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState<"all" | "today" | "week" | "month">("all");
  
  // UI states
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [showUpcomingRemindersOnly, setShowUpcomingRemindersOnly] = useState(true);

  // Custom hooks
  const { 
    userId, 
    schedule, 
    subjects, 
    tasks, 
    studySessions, 
    reminders, 
    isLoading, 
    fetchData 
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

  // Local state management for tasks, reminders, and sessions
  const [tasksLocal, setTasksLocal] = useState<Task[]>(tasks);
  const [remindersLocal, setRemindersLocal] = useState<Reminder[]>(reminders);
  const [studySessionsLocal, setStudySessionsLocal] = useState<StudySession[]>(studySessions);
  const [scheduleLocal, setScheduleLocal] = useState<Schedule | null>(schedule);

  // Sync with hook data
  useEffect(() => {
    setTasksLocal(tasks);
    setRemindersLocal(reminders);
    setStudySessionsLocal(studySessions);
    setScheduleLocal(schedule);
  }, [tasks, reminders, studySessions, schedule]);

  // Handle task updates
  const handleTaskUpdate = (updatedTask: Task) => {
    const oldTask = tasksLocal.find(t => t.id === updatedTask.id);
    setTasksLocal(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (oldTask) {
      updateStatsOnTaskChange(oldTask, updatedTask);
    }
  };

  // Handle new task creation
  const handleTaskCreate = (newTask: Task) => {
    setTasksLocal(prev => [newTask, ...prev]);
    updateStatsOnTaskCreate(newTask);
  };

  // Handle task deletion
  const handleTaskDelete = (taskId: string) => {
    const task = tasksLocal.find(t => t.id === taskId);
    if (!task) return;
    setTasksLocal(prev => prev.filter(t => t.id !== taskId));
    updateStatsOnTaskDelete(task);
  };

  // Handle new study session
  const handleStudySessionCreate = (newSession: StudySession) => {
    setStudySessionsLocal(prev => [newSession, ...prev]);
    updateStatsOnSessionCreate(newSession);
  };

  // Handle reminder updates
  const handleReminderUpdate = (updatedReminder: Reminder) => {
    setRemindersLocal(prev => prev.map(r => r.id === updatedReminder.id ? updatedReminder : r));
  };

  // Handle new reminder creation
  const handleReminderCreate = (newReminder: Reminder) => {
    setRemindersLocal(prev => [newReminder, ...prev]);
    updateStatsOnReminderCreate(newReminder);
  };

  // Handle reminder deletion
  const handleReminderDelete = (reminderId: string) => {
    const reminder = remindersLocal.find(r => r.id === reminderId);
    if (!reminder) return;
    setRemindersLocal(prev => prev.filter(r => r.id !== reminderId));
    updateStatsOnReminderDelete(reminder);
  };

  // Handle schedule updates
  const handleScheduleUpdate = (updatedSchedule: Schedule) => {
    setScheduleLocal(updatedSchedule);
  };

  // Handle timer start/stop
  const handleTimerToggle = (taskId?: string) => {
    setIsTimerRunning(!isTimerRunning);
    if (taskId) {
      setCurrentTaskId(taskId);
    }
    // Switch to tracker tab when timer starts
    if (!isTimerRunning) {
      setActiveTab("tracker");
    }
  };

  // Map our Task type to TimeTracker's expected Task type
  const mapTasksForTimeTracker = (): TimeTrackerTask[] => {
    return tasksLocal.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status || 'PENDING'
    }));
  };

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
    <div className="container mx-auto p-4 rtl" dir="rtl">
      <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
        <TimeManagementHeader
          isTimerRunning={isTimerRunning}
          onTimerToggle={() => handleTimerToggle()}
          onRefresh={fetchData}
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
          <DashboardTab
            stats={stats}
            subjects={subjects}
            tasks={filteredTasks}
            reminders={filteredReminders}
            showCompletedTasks={showCompletedTasks}
            showUpcomingRemindersOnly={showUpcomingRemindersOnly}
            onTabChange={setActiveTab}
            onToggleCompletedTasks={() => setShowCompletedTasks(!showCompletedTasks)}
            onToggleUpcomingReminders={() => setShowUpcomingRemindersOnly(!showUpcomingRemindersOnly)}
            onTimerToggle={handleTimerToggle}
          />
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
          {userId && (
            <div className="animate-in fade-in duration-700">
              <WeeklySchedule schedule={scheduleLocal} subjects={subjects} userId={userId} onScheduleUpdate={handleScheduleUpdate} />
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
              <Select value={taskFilter} onValueChange={(value: any) => setTaskFilter(value)}>
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
          {userId && (
            <div className="animate-in fade-in duration-700">
              <TaskManagement 
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
          {userId && (
            <div className="animate-in fade-in duration-700">
              <TimeTracker 
                userId={userId}
                tasks={mapTasksForTimeTracker()}
                subjects={subjects}
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
              <Select value={sessionFilter} onValueChange={(value: any) => setSessionFilter(value)}>
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
            <StudySessionsHistory 
              sessions={filteredSessions.length > 0 ? filteredSessions : studySessionsLocal} 
              subjects={subjects}
            />
          </div>
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
          {userId && (
            <div className="animate-in fade-in duration-700">
              <Reminders 
                initialReminders={filteredReminders.length > 0 ? filteredReminders : remindersLocal} 
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
  );
}
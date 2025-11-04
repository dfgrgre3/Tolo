'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WeeklySchedule from "@/components/time/WeeklySchedule";
import TaskManagement from "@/components/time/TaskManagement";
import StudySessionsHistory from "@/components/time/StudySessionsHistory";
import Reminders from "@/components/time/Reminders";
import TimeTracker from "@/components/TimeTracker";
import CalendarScheduler from "@/components/CalendarScheduler";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { Button } from "@/shared/button";
import { Progress } from "@/shared/progress";
import { 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  BarChart3, 
  CheckCircle, 
  AlertCircle,
  PlusCircle,
  BookOpen,
  Timer,
  Bell,
  Play,
  Pause,
  Zap,
  Award,
  Flame,
  Brain,
  RefreshCw,
  Settings,
  Filter,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define local types based on what we know from the components
interface Schedule {
  id: string;
  userId: string;
  planJson: string;
  createdAt: string;
  updatedAt: string;
}

interface SubjectEnrollment {
  id: string;
  userId: string;
  subject: SubjectType;
  createdAt: string;
}

// Use a compatible Task interface that matches what the components expect
interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  subject?: "MATH" | "PHYSICS" | "CHEMISTRY" | "ARABIC" | "ENGLISH";
  dueAt?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedTime?: number;
  actualTime?: number;
  tags?: string[];
  subtasks?: SubTask[];
  attachments?: string[];
  notes?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

interface StudySession {
  id: string;
  userId: string;
  taskId?: string;
  durationMin: number;
  startTime: string;
  endTime: string;
  subject?: string;
  createdAt: string;
  updatedAt: string;
}

interface Reminder {
  id: string;
  userId: string;
  title: string;
  message?: string;
  remindAt: string;
  type?: 'TASK' | 'BREAK' | 'STUDY' | 'MEETING' | 'PERSONAL' | 'MEDICINE' | 'EXERCISE' | 'MEAL' | 'SLEEP' | 'CUSTOM';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isRecurring?: boolean;
  recurringPattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  recurringInterval?: number;
  recurringDays?: number[];
  recurringEndDate?: string;
  isCompleted?: boolean;
  completedAt?: string;
  isSnoozed?: boolean;
  snoozeUntil?: string;
  soundEnabled?: boolean;
  notificationEnabled?: boolean;
  tags?: string[];
  color?: string;
  location?: string;
  attachments?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

type SubjectType = "MATH" | "PHYSICS" | "CHEMISTRY" | "ARABIC" | "ENGLISH";

// TimeTracker's expected Task type
interface TimeTrackerTask {
  id: string;
  title: string;
  status: string;
}

import { ensureUser } from "@/lib/user-utils";

export default function TimeManagementPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [subjects, setSubjects] = useState<SubjectType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Stats for dashboard
  const [stats, setStats] = useState({
    completedTasks: 0,
    pendingTasks: 0,
    studyHours: 0,
    upcomingReminders: 0,
    dailyGoalProgress: 0,
    weeklyGoalProgress: 0,
    streakDays: 0,
    focusScore: 0
  });

  // Time tracker state
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

  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      const [scheduleRes, subjectsRes, tasksRes, studySessionsRes, remindersRes] = await Promise.all([
        fetch(`/api/schedule?userId=${userId}`),
        fetch(`/api/subjects?userId=${userId}`),
        fetch(`/api/tasks?userId=${userId}`),
        fetch(`/api/study-sessions?userId=${userId}`),
        fetch(`/api/reminders?userId=${userId}`),
      ]);

      const scheduleData = await scheduleRes.json();
      setSchedule(scheduleData);
      
      const subjectEnrollments: SubjectEnrollment[] = await subjectsRes.json();
      setSubjects(subjectEnrollments.map(s => s.subject));
      
      const tasksData = await tasksRes.json();
      setTasks(tasksData);
      
      const studySessionsData = await studySessionsRes.json();
      setStudySessions(studySessionsData);
      
      const remindersData = await remindersRes.json();
      setReminders(remindersData);
      
      // Calculate stats
      const completedTasks = tasksData.filter((t: Task) => t.status === 'COMPLETED').length;
      const pendingTasks = tasksData.filter((t: Task) => t.status === 'PENDING').length;
      const studyMinutes = studySessionsData.reduce((acc: number, session: StudySession) => acc + session.durationMin, 0);
      const studyHours = Math.round(studyMinutes / 60 * 10) / 10;
      
      const now = new Date();
      const upcomingReminders = remindersData.filter((r: Reminder) => {
        const remindDate = new Date(r.remindAt);
        return remindDate > now && remindDate < new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }).length;
      
      // Calculate goals (mock data for now)
      const dailyGoalProgress = Math.min(100, (studyMinutes / 180) * 100); // 3 hours daily goal
      const weeklyGoalProgress = Math.min(100, (studyMinutes / 1260) * 100); // 21 hours weekly goal
      
      // Calculate streak (simplified)
      const streakDays = Math.min(30, studySessionsData.length);
      
      // Calculate focus score (simplified)
      const focusScore = Math.min(100, Math.round((completedTasks / (tasksData.length || 1)) * 70 + (dailyGoalProgress / 100) * 30));
      
      setStats({
        completedTasks,
        pendingTasks,
        studyHours,
        upcomingReminders,
        dailyGoalProgress,
        weeklyGoalProgress,
        streakDays,
        focusScore
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    (async () => {
      const id = await ensureUser();
      setUserId(id);
    })();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, fetchData]);

  // Handle task updates
  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    
    // Update stats
    if (updatedTask.status === 'COMPLETED') {
      setStats(prev => ({
        ...prev,
        completedTasks: prev.completedTasks + 1,
        pendingTasks: prev.pendingTasks - 1
      }));
    }
  };

  // Handle new task creation
  const handleTaskCreate = (newTask: Task) => {
    setTasks(prev => [newTask, ...prev]);
    
    // Update stats
    if (newTask.status === 'PENDING') {
      setStats(prev => ({
        ...prev,
        pendingTasks: prev.pendingTasks + 1
      }));
    }
  };

  // Handle task deletion
  const handleTaskDelete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setTasks(prev => prev.filter(t => t.id !== taskId));
    
    // Update stats
    if (task.status === 'COMPLETED') {
      setStats(prev => ({
        ...prev,
        completedTasks: prev.completedTasks - 1
      }));
    } else if (task.status === 'PENDING') {
      setStats(prev => ({
        ...prev,
        pendingTasks: prev.pendingTasks - 1
      }));
    }
  };

  // Handle new study session
  const handleStudySessionCreate = (newSession: StudySession) => {
    setStudySessions(prev => [newSession, ...prev]);
    
    // Update stats
    const studyMinutes = studySessions.reduce((acc, session) => acc + session.durationMin, 0) + newSession.durationMin;
    const studyHours = Math.round(studyMinutes / 60 * 10) / 10;
    const dailyGoalProgress = Math.min(100, (studyMinutes / 180) * 100);
    const weeklyGoalProgress = Math.min(100, (studyMinutes / 1260) * 100);
    
    setStats(prev => ({
      ...prev,
      studyHours,
      dailyGoalProgress,
      weeklyGoalProgress
    }));
  };

  // Handle reminder updates
  const handleReminderUpdate = (updatedReminder: Reminder) => {
    setReminders(prev => prev.map(r => r.id === updatedReminder.id ? updatedReminder : r));
  };

  // Handle new reminder creation
  const handleReminderCreate = (newReminder: Reminder) => {
    setReminders(prev => [newReminder, ...prev]);
    
    // Update stats
    const now = new Date();
    const remindDate = new Date(newReminder.remindAt);
    if (remindDate > now && remindDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      setStats(prev => ({
        ...prev,
        upcomingReminders: prev.upcomingReminders + 1
      }));
    }
  };

  // Handle reminder deletion
  const handleReminderDelete = (reminderId: string) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;
    
    setReminders(prev => prev.filter(r => r.id !== reminderId));
    
    // Update stats
    const now = new Date();
    const remindDate = new Date(reminder.remindAt);
    if (remindDate > now && remindDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      setStats(prev => ({
        ...prev,
        upcomingReminders: prev.upcomingReminders - 1
      }));
    }
  };

  // Handle schedule updates
  const handleScheduleUpdate = (updatedSchedule: Schedule) => {
    setSchedule(updatedSchedule);
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
    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status || 'PENDING'
    }));
  };

  // Filtered data
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(taskSearch.toLowerCase()) || 
                           (task.description && task.description.toLowerCase().includes(taskSearch.toLowerCase()));
      
      const matchesFilter = taskFilter === "all" || 
                           (taskFilter === "pending" && task.status === "PENDING") ||
                           (taskFilter === "in_progress" && task.status === "IN_PROGRESS") ||
                           (taskFilter === "completed" && task.status === "COMPLETED");
      
      return matchesSearch && matchesFilter;
    });
  }, [tasks, taskSearch, taskFilter]);

  const filteredReminders = useMemo(() => {
    return reminders.filter(reminder => {
      const matchesSearch = reminder.title.toLowerCase().includes(reminderSearch.toLowerCase()) ||
                           (reminder.message && reminder.message.toLowerCase().includes(reminderSearch.toLowerCase()));
      
      const now = new Date();
      const remindDate = new Date(reminder.remindAt);
      const isUpcoming = remindDate > now;
      
      return matchesSearch && (!showUpcomingRemindersOnly || isUpcoming);
    });
  }, [reminders, reminderSearch, showUpcomingRemindersOnly]);

  const filteredSessions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    return studySessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      
      if (sessionFilter === "today") {
        return sessionDate >= today;
      } else if (sessionFilter === "week") {
        return sessionDate >= weekAgo;
      } else if (sessionFilter === "month") {
        return sessionDate >= monthAgo;
      }
      return true;
    });
  }, [studySessions, sessionFilter]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="flex items-center justify-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 rtl" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">لوحة تنظيم الوقت</h1>
          <p className="text-muted-foreground mt-1">إدارة وقتك بفعالية وتحقيق أهدافك الأكاديمية</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                مهمة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إنشاء مهمة جديدة</DialogTitle>
              </DialogHeader>
              <div className="py-4 text-center text-muted-foreground">
                <p>نموذج إنشاء المهام متوفر في علامة التبويب "إدارة المهام"</p>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={() => handleTimerToggle()} 
            className={`flex items-center gap-2 ${isTimerRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isTimerRunning ? (
              <>
                <Pause className="h-4 w-4" />
                إيقاف المؤقت
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                بدء المؤقت
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={fetchData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 md:gap-0">
          <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>
          <TabsTrigger value="schedule">الجدول الأسبوعي</TabsTrigger>
          <TabsTrigger value="tasks">إدارة المهام</TabsTrigger>
          <TabsTrigger value="tracker">مؤقت الوقت</TabsTrigger>
          <TabsTrigger value="history">سجل المذاكرة</TabsTrigger>
          <TabsTrigger value="reminders">التذكيرات</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("tasks")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">المهام المكتملة</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedTasks}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingTasks} مهام في الانتظار
                </p>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("history")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ساعات المذاكرة</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.studyHours}</div>
                <p className="text-xs text-muted-foreground">
                  هذا الأسبوع
                </p>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("reminders")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">التذكيرات القادمة</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcomingReminders}</div>
                <p className="text-xs text-muted-foreground">
                  خلال 24 ساعة
                </p>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("schedule")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">المواد الدراسية</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subjects.length}</div>
                <p className="text-xs text-muted-foreground">
                  مسجلة هذا الفصل
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="ml-2 h-5 w-5" />
                  الأداء والإحصائيات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>أهداف اليوم</span>
                      <span>{Math.round(stats.dailyGoalProgress)}%</span>
                    </div>
                    <Progress value={stats.dailyGoalProgress} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>أهداف الأسبوع</span>
                      <span>{Math.round(stats.weeklyGoalProgress)}%</span>
                    </div>
                    <Progress value={stats.weeklyGoalProgress} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>إكمال المهام</span>
                      <span>{tasks.length > 0 ? Math.round((stats.completedTasks / tasks.length) * 100) : 0}%</span>
                    </div>
                    <Progress value={tasks.length > 0 ? (stats.completedTasks / tasks.length) * 100 : 0} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>درجة التركيز</span>
                      <span>{stats.focusScore}%</span>
                    </div>
                    <Progress value={stats.focusScore} className="h-2" />
                  </div>
                </div>
                
                <div className="flex items-center justify-around p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 mx-auto mb-2">
                      <Flame className="h-6 w-6 text-orange-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">سلسلة الأيام</p>
                    <p className="text-xl font-bold">{stats.streakDays} أيام</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-2">
                      <Zap className="h-6 w-6 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">التركيز</p>
                    <p className="text-xl font-bold">{stats.focusScore}%</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mx-auto mb-2">
                      <Brain className="h-6 w-6 text-blue-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">المهام</p>
                    <p className="text-xl font-bold">{stats.completedTasks}</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mx-auto mb-2">
                      <Award className="h-6 w-6 text-purple-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">الإنجاز</p>
                    <p className="text-xl font-bold">{tasks.length > 0 ? Math.round((stats.completedTasks / tasks.length) * 100) : 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                  <CardTitle className="flex items-center">
                    <Bell className="ml-2 h-5 w-5" />
                    التذكيرات القادمة
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowUpcomingRemindersOnly(!showUpcomingRemindersOnly)}
                  >
                    {showUpcomingRemindersOnly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {filteredReminders
                      .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime())
                      .slice(0, 5)
                      .map(reminder => (
                        <div 
                          key={reminder.id} 
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => {
                            setActiveTab("reminders");
                          }}
                        >
                          <div>
                            <p className="font-medium">{reminder.title}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(reminder.remindAt).toLocaleString('ar-EG')}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {new Date(reminder.remindAt) > new Date() ? 'قادم' : 'منتهي'}
                          </Badge>
                        </div>
                      ))}
                    {filteredReminders.length === 0 && (
                      <p className="text-center text-gray-500 py-4">لا توجد تذكيرات</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                  <CardTitle className="flex items-center">
                    <BookOpen className="ml-2 h-5 w-5" />
                    المهام القادمة
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                  >
                    {showCompletedTasks ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {filteredTasks
                      .filter(task => showCompletedTasks || task.status !== 'COMPLETED')
                      .sort((a, b) => new Date(a.dueAt || '').getTime() - new Date(b.dueAt || '').getTime())
                      .slice(0, 5)
                      .map(task => (
                        <div 
                          key={task.id} 
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => {
                            setActiveTab("tasks");
                          }}
                        >
                          <div>
                            <p className="font-medium">{task.title}</p>
                            {task.dueAt && (
                              <p className="text-sm text-gray-500">
                                الموعد: {new Date(task.dueAt).toLocaleDateString('ar-EG')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={task.status === 'PENDING' ? 'secondary' : 'default'}>
                              {task.status === 'PENDING' ? 'في الانتظار' : 
                               task.status === 'IN_PROGRESS' ? 'قيد التنفيذ' : 'مكتمل'}
                            </Badge>
                            <Button 
                              size="sm" 
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTimerToggle(task.id);
                              }}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    {filteredTasks.filter(task => showCompletedTasks || task.status !== 'COMPLETED').length === 0 && (
                      <p className="text-center text-gray-500 py-4">لا توجد مهام قادمة</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold">الجدول الأسبوعي</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 ml-2" />
                إعدادات الجدول
              </Button>
            </div>
          </div>
          {userId && <WeeklySchedule schedule={schedule} subjects={subjects} userId={userId} onScheduleUpdate={handleScheduleUpdate} />}
        </TabsContent>

        <TabsContent value="tasks">
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold">إدارة المهام</h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في المهام..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="pl-8 w-full sm:w-40"
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
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 ml-2" />
                تصفية متقدمة
              </Button>
            </div>
          </div>
          {userId && (
            <TaskManagement 
              initialTasks={filteredTasks} 
              userId={userId} 
              subjects={subjects}
              onTaskUpdate={handleTaskUpdate}
              onTaskCreate={handleTaskCreate}
              onTaskDelete={handleTaskDelete}
            />
          )}
        </TabsContent>

        <TabsContent value="tracker">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold">مؤقت الوقت</h2>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleTimerToggle()} 
                className={`flex items-center gap-2 ${isTimerRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
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
            <TimeTracker 
              userId={userId}
              tasks={mapTasksForTimeTracker()}
              subjects={subjects}
              onStudySessionCreate={handleStudySessionCreate}
            />
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold">سجل المذاكرة</h2>
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
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 ml-2" />
                تحليل البيانات
              </Button>
            </div>
          </div>
          <StudySessionsHistory 
            sessions={filteredSessions} 
            subjects={subjects}
          />
        </TabsContent>

        <TabsContent value="reminders">
          <div className="mb-4 flex flex-col sm:flex-row justify بين items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold">التذكيرات</h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في التذكيرات..."
                  value={reminderSearch}
                  onChange={(e) => setReminderSearch(e.target.value)}
                  className="pl-8 w-full sm:w-40"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 ml-2" />
                تصفية متقدمة
              </Button>
            </div>
          </div>
          {userId && (
            <Reminders 
              initialReminders={filteredReminders} 
              userId={userId}
              onReminderUpdate={handleReminderUpdate}
              onReminderCreate={handleReminderCreate}
              onReminderDelete={handleReminderDelete}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
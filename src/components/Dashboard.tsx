import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Plus, Search, Filter, BarChart3, Clock, Target, Calendar, TrendingUp, Brain, Zap, Award, CheckCircle2, XCircle, AlertCircle, Star, BookOpen, Heart, Briefcase, Home, Coffee, FileText, Trash2, Edit2, Play, Pause, RotateCcw, Download, Upload, Share2, Bell, Settings, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import TodoItem from './TodoItem';
import TimeTracker from './TimeTracker';
import CalendarScheduler from './CalendarScheduler';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  timeSpent: number; // in seconds
}

interface TimeSession {
  id: string;
  taskId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  category: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: string;
  deadline?: Date;
  completed: boolean;
  createdAt: Date;
}

interface Habit {
  id: string;
  title: string;
  description: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  streak: number;
  completedDates: Date[];
  createdAt: Date;
}

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface PomodoroSession {
  id: string;
  taskId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  completed: boolean;
  breakTime: number; // in seconds
}

interface CategoryStats {
  name: string;
  taskCount: number;
  completedTasks: number;
  timeSpent: number; // in seconds
  avgTaskTime: number; // in seconds
}

interface ProductivityInsights {
  mostProductiveHour: number;
  mostProductiveDay: string;
  focusScore: number;
  avgTaskCompletionTime: number; // in hours
  categoryStats: CategoryStats[];
  weeklyTrend: number[]; // percentage change for each week
}

const Dashboard: React.FC = () => {
  // State for tasks
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'task-1',
      title: 'Complete project proposal',
      description: 'Finish the project proposal document and send it to the client',
      category: 'work',
      priority: 'high',
      dueDate: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      timeSpent: 3600, // 1 hour in seconds
    },
    {
      id: 'task-2',
      title: 'Prepare presentation',
      description: 'Create slides for the quarterly review meeting',
      category: 'work',
      priority: 'medium',
      dueDate: new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      timeSpent: 1800, // 30 minutes in seconds
    },
    {
      id: 'task-3',
      title: 'Morning workout',
      description: '30 minutes cardio and strength training',
      category: 'health',
      priority: 'medium',
      dueDate: new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      completed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      timeSpent: 1800, // 30 minutes in seconds
    },
  ]);

  // State for goals
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: 'goal-1',
      title: 'Complete 10 tasks this week',
      description: 'Finish at least 10 tasks before the end of the week',
      targetValue: 10,
      currentValue: 3,
      unit: 'tasks',
      category: 'productivity',
      deadline: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      completed: false,
      createdAt: new Date(),
    },
    {
      id: 'goal-2',
      title: 'Study React for 5 hours',
      description: 'Complete React course and practice for 5 hours this week',
      targetValue: 5,
      currentValue: 1.5,
      unit: 'hours',
      category: 'study',
      deadline: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      completed: false,
      createdAt: new Date(),
    },
  ]);

  // State for habits
  const [habits, setHabits] = useState<Habit[]>([
    {
      id: 'habit-1',
      title: 'Morning meditation',
      description: 'Meditate for 10 minutes every morning',
      category: 'health',
      frequency: 'daily',
      streak: 5,
      completedDates: [new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000), new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000), new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000), new Date(new Date().getTime() - 4 * 24 * 60 * 60 * 1000), new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000)],
      createdAt: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'habit-2',
      title: 'Read 20 pages',
      description: 'Read at least 20 pages of a book every day',
      category: 'personal',
      frequency: 'daily',
      streak: 3,
      completedDates: [new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000), new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000), new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000)],
      createdAt: new Date(new Date().getTime() - 15 * 24 * 60 * 60 * 1000),
    },
  ]);

  // State for notes
  const [notes, setNotes] = useState<Note[]>([
    {
      id: 'note-1',
      title: 'Meeting notes',
      content: 'Discussed project timeline and deliverables for the next quarter.\nKey points:\n- Focus on user experience improvements\n- Launch new features by end of month\n- Increase team capacity for upcoming projects',
      category: 'work',
      tags: ['meeting', 'project', 'q1'],
      createdAt: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'note-2',
      title: 'Book ideas',
      content: 'Ideas for my next book:\n1. Time management for creative professionals\n2. Building sustainable habits\n3. Productivity in the digital age',
      category: 'personal',
      tags: ['ideas', 'writing', 'book'],
      createdAt: new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  ]);

  // State for Pomodoro sessions
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([
    {
      id: 'pomodoro-1',
      taskId: 'task-1',
      startTime: new Date(new Date().getTime() - 25 * 60 * 1000), // 25 minutes ago
      endTime: new Date(),
      duration: 1500, // 25 minutes in seconds
      completed: true,
      breakTime: 300, // 5 minutes in seconds
    },
  ]);

  // State for productivity insights
  const [insights, setInsights] = useState<ProductivityInsights | null>(null);

  // State for UI controls
  const [activeTab, setActiveTab] = useState('tasks');
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [showGoalProgress, setShowGoalProgress] = useState(true);
  const [showHabitTracker, setShowHabitTracker] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showPomodoro, setShowPomodoro] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [sortBy, setSortBy] = useState('dueDate'); // dueDate, priority, title, createdAt
  const [sortOrder, setSortOrder] = useState('asc'); // asc or desc
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('work');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', type: 'task', title: 'Task due soon', message: 'Complete project proposal is due in 2 days', read: false, timestamp: new Date() },
    { id: '2', type: 'goal', title: 'Goal progress', message: 'You\'ve completed 30% of your weekly goal', read: false, timestamp: new Date(new Date().getTime() - 60 * 60 * 1000) },
  ]);

  // State for time tracking
  const [timeSessions, setTimeSessions] = useState<TimeSession[]>([
    {
      id: 'session-1',
      taskId: 'task-1',
      startTime: new Date(new Date().getTime() - 30 * 60 * 1000), // 30 minutes ago
      endTime: new Date(),
      duration: 1800, // 30 minutes in seconds
    },
  ]);

  // State for calendar events
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    {
      id: 'event-1',
      title: 'Team Meeting',
      description: 'Weekly team sync-up meeting',
      startTime: new Date(new Date().getTime() + 1 * 60 * 60 * 1000), // 1 hour from now
      endTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
      category: 'work',
      priority: 'medium',
      completed: false,
    },
    {
      id: 'event-2',
      title: 'Doctor Appointment',
      description: 'Annual health checkup',
      startTime: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      endTime: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour later
      category: 'health',
      priority: 'high',
      completed: false,
    },
  ]);

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || task.category === filterCategory;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'completed' && task.completed) ||
                         (filterStatus === 'active' && !task.completed);

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  // Task handlers
  const handleTaskToggle = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed, updatedAt: new Date() } : task
    ));
  };

  const handleTaskDelete = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const handleTaskEdit = (id: string, updatedData: Partial<Task>) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, ...updatedData, updatedAt: new Date() } : task
    ));
  };

  const handleTaskCreate = (newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const task: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      timeSpent: 0,
    };
    setTasks([...tasks, task]);
  };

  // Time tracking handlers
  const handleSessionStart = (taskId: string) => {
    setActiveTaskId(taskId);
    const newSession: TimeSession = {
      id: `session-${Date.now()}`,
      taskId,
      startTime: new Date(),
      duration: 0,
    };
    setTimeSessions([...timeSessions, newSession]);
  };

  const handleSessionEnd = (id: string) => {
    // يمكنك إضافة منطق إنهاء الجلسة هنا باستخدام معرف المهمة فقط
    setActiveTaskId(null);
  };

  // Calendar event handlers
  const handleEventCreate = (newEvent: Omit<CalendarEvent, 'id'>) => {
    const event: CalendarEvent = {
      ...newEvent,
      id: `event-${Date.now()}`,
    };
    setCalendarEvents([...calendarEvents, event]);
  };

  const handleEventUpdate = (id: string, updatedData: Partial<CalendarEvent>) => {
    setCalendarEvents(calendarEvents.map(event => 
      event.id === id ? { ...event, ...updatedData } : event
    ));
  };

  const handleEventDelete = (id: string) => {
    setCalendarEvents(calendarEvents.filter(event => event.id !== id));
  };

  // Calculate statistics
  const completedTasks = tasks.filter(task => task.completed).length;
  const activeTasks = tasks.filter(task => !task.completed).length;
  const totalTimeSpent = tasks.reduce((total, task) => total + task.timeSpent, 0);

  // Format time for display
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Management Dashboard</h1>
          <p className="text-gray-600">Organize your tasks, track your time, and achieve your goals</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.length}</div>
              <p className="text-xs text-muted-foreground">
                {completedTasks} completed, {activeTasks} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Tracked</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(totalTimeSpent)}</div>
              <p className="text-xs text-muted-foreground">
                Across all tasks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calendarEvents.length}</div>
              <p className="text-xs text-muted-foreground">
                Next 7 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="time">Time Tracking</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            {/* Task Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>My Tasks</span>
                  <Button onClick={() => {
                    const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
                      title: 'New Task',
                      description: 'Task description',
                      category: 'work',
                      priority: 'medium',
                      completed: false,
                      timeSpent: 0,
                    };
                    handleTaskCreate(newTask);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="study">Study</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Task List */}
            <div className="space-y-4">
              {filteredTasks.length > 0 ? (
                filteredTasks.map(task => (
                  <TodoItem
                    key={task.id}
                    id={task.id}
                    title={task.title}
                    description={task.description}
                    category={task.category}
                    priority={task.priority}
                    dueDate={task.dueDate}
                    completed={task.completed}
                    timeSpent={task.timeSpent}
                    onToggle={handleTaskToggle}
                    onDelete={handleTaskDelete}
                    onEdit={handleTaskEdit}
                    onStart={handleSessionStart}
                    onStop={handleSessionEnd}
                    isRunning={activeTaskId === task.id}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">No tasks found. Create a new task to get started!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Time Tracking Tab */}
          <TabsContent value="time" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TimeTracker
                  activeTaskId={activeTaskId || undefined}
                  onSessionStart={handleSessionStart}
                  onSessionEnd={handleSessionEnd}
                  sessions={timeSessions}
                />
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="mr-2 h-5 w-5" />
                      Productivity Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Task Completion Rate</span>
                        <span>{Math.round((completedTasks / tasks.length) * 100) || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.round((completedTasks / tasks.length) * 100) || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span>High Priority Tasks</span>
                        <span>{tasks.filter(t => t.priority === 'high').length}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${tasks.length ? Math.round((tasks.filter(t => t.priority === 'high').length / tasks.length) * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Time Efficiency</span>
                        <span>Good</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {timeSessions.slice(0, 5).map(session => (
                        <div key={session.id} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Task: {tasks.find(t => t.id === session.taskId)?.title || 'Unknown Task'}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(session.startTime).toLocaleString()} - {formatTime(session.duration)}
                            </p>
                          </div>
                          <Badge variant={session.duration > 3600 ? "default" : "secondary"}>
                            {formatTime(session.duration)}
                          </Badge>
                        </div>
                      ))}
                      {timeSessions.length === 0 && (
                        <p className="text-gray-500 text-sm">No time tracking sessions yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <CalendarScheduler
              events={calendarEvents}
              onEventCreate={handleEventCreate}
              onEventUpdate={handleEventUpdate}
              onEventDelete={handleEventDelete}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;

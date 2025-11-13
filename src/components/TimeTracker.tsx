'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/card';
import { Button } from '../shared/button';
import { Progress } from '../shared/progress';
import { Badge } from '../shared/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Square, BarChart3, Target, Clock } from 'lucide-react';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import { logger } from '@/lib/logger';

interface TimeSession {
  id: string;
  taskId?: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  subject?: string;
}

interface TimeTrackerProps {
  userId: string;
  tasks: Task[];
  subjects: string[];
  onStudySessionCreate?: (session: any) => void;
}

type Task = {
  id: string;
  title: string;
  status: string;
};

type SubjectType = string;

const TimeTracker: React.FC<TimeTrackerProps> = ({
  userId,
  tasks,
  subjects,
  onStudySessionCreate
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Using our new hook for safe localStorage access
  const [sessions, setSessions] = useLocalStorageState<TimeSession[]>(`study_sessions_${userId}`, []);
  const [todayGoal, setTodayGoal] = useLocalStorageState<number>('today_goal', 180); // 3 hours in minutes
  const [isLoading, setIsLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState({ totalSeconds: 0, taskStats: {} as Record<string, number> });
  const [weeklyStats, setWeeklyStats] = useState({ totalSeconds: 0, taskStats: {} as Record<string, number> });
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('work');
  const [goals, setGoals] = useLocalStorageState<any[]>('time_tracker_goals', [
    { id: '1', title: 'Complete math exercises', target: 120, progress: 45, category: 'Study' },
    { id: '2', title: 'Read 30 pages', target: 60, progress: 100, category: 'Reading' },
    { id: '3', title: 'Practice piano', target: 90, progress: 20, category: 'Music' },
  ]);

  // Handle loading state
  useEffect(() => {
    // We don't need to manually load from localStorage anymore since our hook handles it
    setIsLoading(false);
  }, []);

  // Timer effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isRunning) {
      intervalId = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const startTimer = () => {
    if (!selectedTaskId && !selectedSubject) {
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast({
          title: 'تنبيه',
          description: 'يرجى اختيار مهمة أو مادة لبدء المؤقت',
          variant: 'default'
        });
      }
      return;
    }
    
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const stopTimer = async () => {
    setIsRunning(false);
    
    if (currentTime > 0) {
      const newSession: TimeSession = {
        id: Date.now().toString(),
        taskId: selectedTaskId || undefined,
        startTime: new Date(Date.now() - currentTime * 1000),
        endTime: new Date(),
        duration: currentTime,
        subject: selectedSubject || undefined
      };

      // Add to local state
      setSessions(prev => [newSession, ...prev]);
      
      // Save to backend
      try {
        const response = await fetch('/api/study-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            taskId: selectedTaskId,
            durationMin: Math.floor(currentTime / 60),
            subject: selectedSubject
          })
        });

        if (response.ok) {
          const savedSession = await response.json();
          if (onStudySessionCreate) {
            onStudySessionCreate(savedSession);
          }
        }
      } catch (error) {
        logger.error("Error saving study session:", error);
      }
    }

    // Reset timer
    setCurrentTime(0);
    setSelectedTaskId(null);
    setSelectedSubject(null);
  };
  
  const addNewTask = () => {
    if (newTaskName.trim()) {
      // In a real app, this would call a function passed as a prop
      // to update the tasks in the parent component
      const newTask: any = {
        id: `task-${Date.now()}`,
        name: newTaskName,
        color: '#3b82f6',
        category: newTaskCategory
      };
      
      // This is a placeholder - in a real app, you would manage tasks at the parent level
      tasks.push(newTask as Task);
      
      // Reset form
      setNewTaskName('');
      setNewTaskCategory('work');
    }
  };
  
  const updateGoalProgress = (goalId: string, newProgress: number) => {
    setGoals(prevGoals => 
      prevGoals.map(goal => 
        goal.id === goalId 
          ? { ...goal, progress: Math.min(100, Math.max(0, newProgress)) } 
          : goal
      )
    );
  };

  // Calculate stats functions
  const calculateDailyStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySessions = sessions.filter(
      (session) =>
        session.startTime >= today &&
        (!session.endTime || session.endTime < tomorrow)
    );

    const totalSeconds = todaySessions.reduce(
      (total, session) => total + session.duration,
      0
    );

    const taskStats = todaySessions.reduce((acc, session) => {
      const taskId = session.taskId || 'unknown';
      if (!acc[taskId]) {
        acc[taskId] = 0;
      }
      acc[taskId] += session.duration;
      return acc;
    }, {} as Record<string, number>);

    return { totalSeconds, taskStats };
  };
  
  const calculateWeeklyStats = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const weeklySessions = sessions.filter(
      (session) =>
        session.startTime >= startOfWeek &&
        (!session.endTime || session.endTime < endOfWeek)
    );

    const totalSeconds = weeklySessions.reduce(
      (total, session) => total + session.duration,
      0
    );

    const taskStats = weeklySessions.reduce((acc, session) => {
      const taskId = session.taskId || 'unknown';
      if (!acc[taskId]) {
        acc[taskId] = 0;
      }
      acc[taskId] += session.duration;
      return acc;
    }, {} as Record<string, number>);

    return { totalSeconds, taskStats };
  };
  
  // Update stats when sessions change
  useEffect(() => {
    setDailyStats(calculateDailyStats());
    setWeeklyStats(calculateWeeklyStats());
  }, [sessions]);
  
  // Format functions

  const todayMinutes = sessions
    .filter(session => {
      const today = new Date();
      const sessionDate = new Date(session.startTime);
      return sessionDate.toDateString() === today.toDateString();
    })
    .reduce((total, session) => total + Math.floor(session.duration / 60), 0);

  const goalProgress = Math.min(100, (todayMinutes / todayGoal) * 100);

  return (
    <div className="space-y-6 rtl" dir="rtl">
      {/* Timer Display Card */}
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl">
            <Clock className="h-6 w-6 text-primary" />
            مؤقت الوقت
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Timer Display */}
          <div className="text-center space-y-4">
            <div className={`text-6xl md:text-7xl font-mono font-bold mb-6 transition-all ${
              isRunning ? 'text-primary animate-pulse' : 'text-foreground'
            }`}>
              {formatTime(currentTime)}
            </div>
            
            {/* Timer Controls */}
            <div className="flex justify-center gap-3">
              {!isRunning ? (
                <Button 
                  onClick={startTimer} 
                  size="lg"
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                  disabled={!selectedTaskId && !selectedSubject}
                >
                  <Play className="h-5 w-5" />
                  بدء
                </Button>
              ) : (
                <Button 
                  onClick={pauseTimer} 
                  variant="outline" 
                  size="lg"
                  className="flex items-center gap-2 px-8 py-6 text-lg border-2 border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                >
                  <Pause className="h-5 w-5" />
                  إيقاف مؤقت
                </Button>
              )}
              <Button 
                onClick={stopTimer} 
                variant="outline"
                size="lg"
                disabled={currentTime === 0}
                className="flex items-center gap-2 px-8 py-6 text-lg border-2 border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                <Square className="h-5 w-5" />
                إيقاف
              </Button>
            </div>
            
            {(!selectedTaskId && !selectedSubject) && (
              <p className="text-sm text-muted-foreground mt-2">
                يرجى اختيار مهمة أو مادة لبدء المؤقت
              </p>
            )}
          </div>

          {/* Task and Subject Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2">اختر المهمة</label>
              <Select 
                value={selectedTaskId || undefined} 
                onValueChange={(value) => {
                  setSelectedTaskId(value);
                  setSelectedSubject(null); // Clear subject when task is selected
                }}
                disabled={isRunning}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر مهمة للمتابعة" />
                </SelectTrigger>
                <SelectContent>
                  {tasks && tasks.length > 0
                    ? tasks
                        .filter(task => task.status !== 'COMPLETED')
                        .map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))
                    : <SelectItem value="no-tasks" disabled>لا توجد مهام متاحة</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2">أو اختر المادة</label>
              <Select 
                value={selectedSubject || undefined} 
                onValueChange={(value) => {
                  setSelectedSubject(value);
                  setSelectedTaskId(null); // Clear task when subject is selected
                }}
                disabled={isRunning}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر مادة للمتابعة" />
                </SelectTrigger>
                <SelectContent>
                  {subjects && subjects.length > 0
                    ? subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))
                    : <SelectItem value="no-subjects" disabled>لا توجد مواد متاحة</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goal Progress Card */}
      <Card className="border-2 border-primary/10">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            الهدف اليومي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-muted-foreground">الهدف: {todayGoal} دقيقة</span>
              <span className="font-semibold">{todayMinutes} دقيقة</span>
            </div>
            <Progress value={goalProgress} className="h-4" />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>{Math.round(goalProgress)}%</span>
              <span>{todayGoal - todayMinutes} دقيقة متبقية</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {[60, 120, 180].map(goal => (
              <Button
                key={goal}
                variant={todayGoal === goal ? "default" : "outline"}
                onClick={() => setTodayGoal(goal)}
                size="sm"
                className="transition-all"
              >
                {goal} دقيقة
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions Card */}
      <Card className="border-2 border-primary/10">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            الجلسات الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">لا توجد جلسات مذاكرة بعد</p>
              <p className="text-sm text-muted-foreground mt-1">ابدأ المؤقت لتسجيل جلسة مذاكرة</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {[...sessions].slice(0, 5).map(session => (
                <div 
                  key={session.id} 
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors border border-border"
                >
                  <div className="flex-1">
                    <div className="font-medium mb-1">
                      {session.taskId 
                        ? tasks.find(t => t.id === session.taskId)?.title 
                        : session.subject || 'جلسة مذاكرة'}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {formatTime(session.duration)} - {new Date(session.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-3">
                    {Math.floor(session.duration / 60)} د
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeTracker;
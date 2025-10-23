'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './shared/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Square, BarChart3, Target, Clock } from 'lucide-react';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';

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
      alert("Please select a task or subject to track");
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
        console.error("Error saving study session:", error);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-4xl font-mono mb-4">{formatTime(currentTime)}</div>
          
          <div className="flex justify-center gap-2">
            {!isRunning ? (
              <Button onClick={startTimer} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Start
              </Button>
            ) : (
              <Button onClick={pauseTimer} variant="outline" className="flex items-center gap-2">
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            <Button 
              onClick={stopTimer} 
              variant="outline"
              disabled={currentTime === 0}
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>

          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Task</label>
            <Select 
              value={selectedTaskId || undefined} 
              onValueChange={setSelectedTaskId}
              disabled={isRunning}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a task to track" />
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
                  : null}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Or Select Subject</label>
            <Select 
              value={selectedSubject || undefined} 
              onValueChange={setSelectedSubject}
              disabled={isRunning}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects && subjects.length > 0
                  ? subjects.map(subject => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))
                  : null}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" />
              Today's Goal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span>Target Time: {todayGoal} minutes</span>
                <span>{todayMinutes} minutes</span>
              </div>
              <Progress value={goalProgress} className="h-3" />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {[60, 120, 180].map(goal => (
                <Button
                  key={goal}
                  variant={todayGoal === goal ? "default" : "outline"}
                  onClick={() => setTodayGoal(goal)}
                  size="sm"
                >
                  {goal} min
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No study sessions yet</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {[...sessions].slice(0, 5).map(session => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium">
                        {session.taskId 
                          ? tasks.find(t => t.id === session.taskId)?.title 
                          : session.subject || 'Study Session'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTime(session.duration)} - {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {Math.floor(session.duration / 60)} min
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default TimeTracker;
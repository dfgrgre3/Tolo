'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Target, 
  TrendingUp, 
  Calendar,
  Timer,
  Coffee,
  Moon,
  Settings,
  Volume2
} from 'lucide-react';
import { formatTime, calculateFocusScore } from '../utils/timeUtils';  // Updated import
import type { Task as TaskType, StudySession, TimeTrackerTask } from '../types';
import { TimeSettingsData } from './TimeSettings';

interface TimeTrackerProps {
  userId: string;
  tasks: TimeTrackerTask[];
  subjects: string[];
  onStudySessionCreate: (session: StudySession) => void;
}

const TimeTracker = ({ userId, tasks, subjects, onStudySessionCreate }: TimeTrackerProps) => {
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [currentPomodoroState, setCurrentPomodoroState] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [goalCompletion, setGoalCompletion] = useState(0);
  
  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState<TimeSettingsData>(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('timeSettings');
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    }
    return {
      dailyGoalMinutes: 180,
      weeklyGoalMinutes: 1260,
      defaultSessionDuration: 30,
      breakDuration: 5,
      notificationsEnabled: true,
      soundEnabled: true,
      theme: 'auto',
      autoStartBreak: false,
      pomodoroEnabled: true, // Enable by default
      pomodoroWorkMinutes: 25,
      pomodoroBreakMinutes: 5
    };
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (settings.soundEnabled) {
      audioRef.current = new Audio('/sounds/notification.mp3'); // Default notification sound
    }
  }, [settings.soundEnabled]);

  // Pomodoro timer durations (in seconds)
  const WORK_DURATION = settings.pomodoroWorkMinutes * 60;
  const SHORT_BREAK = settings.pomodoroBreakMinutes * 60;
  const LONG_BREAK = 15 * 60; // Default long break to 15 minutes
  const GOAL_TARGET = 4; // Complete 4 pomodoros for a long break

  // Effect to handle the timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, settings]);

  const handleTimerComplete = () => {
    if (currentPomodoroState === 'work') {
      // Completed a work session
      const newPomodoroCount = pomodoroCount + 1;
      setPomodoroCount(newPomodoroCount);

      // Play notification sound
      if (settings.soundEnabled && audioRef.current) {
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      }

      // Create study session record
      if (activeTaskId) {
        const session: StudySession = {
          id: `session_${Date.now()}`,
          userId,
          taskId: activeTaskId,
          durationMin: Math.floor((WORK_DURATION - timeLeft) / 60),
          startTime: new Date(Date.now() - (WORK_DURATION - timeLeft) * 1000).toISOString(),
          endTime: new Date().toISOString(),
          subjectId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setSessions(prev => [session, ...prev]);
        onStudySessionCreate(session);
      }

      // Determine next state
      if (newPomodoroCount % GOAL_TARGET === 0) {
        setCurrentPomodoroState('longBreak');
        setTimeLeft(LONG_BREAK);
      } else {
        setCurrentPomodoroState('shortBreak');
        setTimeLeft(SHORT_BREAK);
      }
      
      // Auto start break if enabled
      if (settings.autoStartBreak) {
        setIsRunning(true);
      } else {
        setIsRunning(false);
      }
    } else {
      // Completed a break
      setCurrentPomodoroState('work');
      setTimeLeft(WORK_DURATION);
      
      // Auto start work if enabled
      if (settings.autoStartBreak) {
        setIsRunning(true);
      } else {
        setIsRunning(false);
      }
    }

    // Update goal completion
    const completion = Math.min(100, Math.floor((pomodoroCount / GOAL_TARGET) * 100));
    setGoalCompletion(completion);
  };

  const toggleTimer = () => {
    if (timeLeft === 0) {
      // Reset timer if completed
      resetTimer();
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (currentPomodoroState === 'work') {
      setTimeLeft(WORK_DURATION);
    } else if (currentPomodoroState === 'shortBreak') {
      setTimeLeft(SHORT_BREAK);
    } else {
      setTimeLeft(LONG_BREAK);
    }
  };

  const skipCurrentPhase = () => {
    if (currentPomodoroState === 'work') {
      // Skip to short break or long break depending on pomodoro count
      if ((pomodoroCount + 1) % GOAL_TARGET === 0) {
        setCurrentPomodoroState('longBreak');
        setTimeLeft(LONG_BREAK);
      } else {
        setCurrentPomodoroState('shortBreak');
        setTimeLeft(SHORT_BREAK);
      }
    } else {
      // Skip to work phase
      setCurrentPomodoroState('work');
      setTimeLeft(WORK_DURATION);
    }
    setIsRunning(false);
  };

  const selectTask = (taskId: string) => {
    if (!isRunning) {
      setActiveTaskId(taskId);
    }
  };

  const formatTimeDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerLabel = () => {
    switch (currentPomodoroState) {
      case 'work': return 'وقت الدراسة';
      case 'shortBreak': return 'استراحة قصيرة';
      case 'longBreak': return 'استراحة طويلة';
      default: return 'الوضع الحالي';
    }
  };

  const getTimerIcon = () => {
    switch (currentPomodoroState) {
      case 'work': return <Target className="h-4 w-4" />;
      case 'shortBreak': return <Coffee className="h-4 w-4" />;
      case 'longBreak': return <Moon className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {getTimerIcon()}
              <CardTitle className="text-2xl">متتبع الوقت</CardTitle>
            </div>
            <CardDescription>
              {getTimerLabel()} - {activeTaskId ? `المهمة: ${tasks.find(t => t.id === activeTaskId)?.title || 'غير محددة'}` : 'اختر مهمة للبدء'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6">
            <div className="text-5xl font-mono font-bold mb-6 tabular-nums">
              {formatTimeDisplay(timeLeft)}
            </div>
            
            <div className="w-full max-w-md mb-6">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>0%</span>
                <span>{Math.round(((currentPomodoroState === 'work' ? WORK_DURATION : 
                   currentPomodoroState === 'shortBreak' ? SHORT_BREAK : LONG_BREAK) - timeLeft) / 
                   (currentPomodoroState === 'work' ? WORK_DURATION : 
                   currentPomodoroState === 'shortBreak' ? SHORT_BREAK : LONG_BREAK) * 100)}%</span>
                <span>100%</span>
              </div>
              <Progress 
                value={100 - (timeLeft / (currentPomodoroState === 'work' ? WORK_DURATION : 
                           currentPomodoroState === 'shortBreak' ? SHORT_BREAK : LONG_BREAK) * 100)} 
                className="h-2.5" 
              />
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button 
                onClick={toggleTimer}
                size="lg"
                className={`px-8 py-6 text-lg ${
                  isRunning 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-5 w-5 ml-2" />
                    إيقاف
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 ml-2" />
                    تشغيل
                  </>
                )}
              </Button>
              
              <Button 
                onClick={resetTimer}
                variant="outline"
                size="lg"
                className="px-6"
              >
                <RotateCcw className="h-5 w-5 ml-2" />
                تعييد
              </Button>
              
              <Button 
                onClick={skipCurrentPhase}
                variant="outline"
                size="lg"
                className="px-6"
              >
                <Timer className="h-5 w-5 ml-2" />
                تخطي
              </Button>
            </div>
            
            <div className="mt-6 w-full max-w-md">
              <h3 className="font-medium mb-3">المهام النشطة:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tasks.slice(0, 4).map(task => (
                  <Button
                    key={task.id}
                    variant={activeTaskId === task.id ? "default" : "outline"}
                    className={`truncate ${
                      activeTaskId === task.id 
                        ? "ring-2 ring-primary ring-offset-2" 
                        : ""
                    }`}
                    onClick={() => selectTask(task.id)}
                    disabled={isRunning && activeTaskId !== task.id}
                  >
                    {task.title}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">الدروس المكتملة</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pomodoroCount}</div>
              <p className="text-xs text-muted-foreground">من {GOAL_TARGET} لتحقيق الاستراحة الطويلة</p>
              <Progress value={(pomodoroCount / GOAL_TARGET) * 100} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">نسبة التركيز</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculateFocusScore(pomodoroCount, settings.pomodoroWorkMinutes)}</div>
              <p className="text-xs text-muted-foreground">نقطة تركيز</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">الوضع الحالي</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {currentPomodoroState === 'work' ? 'دراسة' : 
                 currentPomodoroState === 'shortBreak' ? 'استراحة' : 'استراحة طويلة'}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentPomodoroState === 'work' ? 'ركز على المهمة' : 'خذ نفسك'} 
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              جلسات اليوم
            </CardTitle>
            <CardDescription>سجل جلسات الدراسة الحديثة</CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">لا توجد جلسات بعد</p>
            ) : (
              <div className="space-y-4">
                {sessions.slice(0, 5).map((session, index) => (
                  <div 
                    key={`${session.id}-${index}`} 
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors border border-border"
                  >
                    <div className="flex-1">
                      <div className="font-medium mb-1">
                        {session.taskId 
                          ? tasks.find(t => t.id === session.taskId)?.title 
                          : session.subjectId || 'جلسة مذاكرة'}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {formatTime(session.durationMin * 60)} - {new Date(session.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-3">
                      {Math.floor(session.durationMin)} د
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              إعدادات المؤقت
            </CardTitle>
            <CardDescription>تعديل إعدادات بومودورو</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">مدة العمل</span>
                <Badge variant="outline">{settings.pomodoroWorkMinutes} دقيقة</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">مدة الاستراحة</span>
                <Badge variant="outline">{settings.pomodoroBreakMinutes} دقيقة</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">الصوت</span>
                <Badge variant={settings.soundEnabled ? "default" : "outline"}>
                  {settings.soundEnabled ? 'مفعل' : 'معطل'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">البدء التلقائي</span>
                <Badge variant={settings.autoStartBreak ? "default" : "outline"}>
                  {settings.autoStartBreak ? 'مفعل' : 'معطل'}
                </Badge>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => {
                  // Open settings modal
                  if (typeof window !== 'undefined') {
                    document.dispatchEvent(new CustomEvent('open-time-settings'));
                  }
                }}
              >
                <Settings className="h-4 w-4 ml-2" />
                تعديل الإعدادات
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TimeTracker;
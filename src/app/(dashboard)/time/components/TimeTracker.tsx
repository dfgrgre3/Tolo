'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Target, 
  TrendingUp, 
  Timer,
  Coffee,
  Moon
} from 'lucide-react';
import { calculateFocusScore } from '../utils/timeUtils';
import type { StudySession, TimeTrackerTask } from '../types';
import { usePomodoroTimer } from '../hooks/usePomodoroTimer';
import { SessionsList } from './SessionsList';
import { TimerSettingsCard } from './TimerSettingsCard';
import { toast } from 'sonner';

interface TimeTrackerProps {
  userId: string;
  tasks: TimeTrackerTask[];
  subjects: string[];
  onStudySessionCreate: (session: StudySession) => void;
}

const TimeTracker = ({ userId, tasks, subjects, onStudySessionCreate }: TimeTrackerProps) => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const {
    isRunning,
    timeLeft,
    currentPomodoroState,
    pomodoroCount,
    sessions,
    settings,
    WORK_DURATION,
    SHORT_BREAK,
    LONG_BREAK,
    GOAL_TARGET,
    toggleTimer,
    resetTimer,
    skipCurrentPhase
  } = usePomodoroTimer(userId, (session) => {
    onStudySessionCreate(session);
    toast.success(`تم إكمال جلسة دراسة ${session.durationMin} دقيقة`);
  }, activeTaskId);

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

  const currentPhaseDuration = 
    currentPomodoroState === 'work' ? WORK_DURATION : 
    currentPomodoroState === 'shortBreak' ? SHORT_BREAK : LONG_BREAK;

  const currentProgress = 100 - (timeLeft / currentPhaseDuration * 100);

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
                <span>{Math.round(currentProgress)}%</span>
                <span>100%</span>
              </div>
              <Progress value={currentProgress} className="h-2.5" />
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
              
              <Button onClick={resetTimer} variant="outline" size="lg" className="px-6">
                <RotateCcw className="h-5 w-5 ml-2" />
                تعييد
              </Button>
              
              <Button onClick={skipCurrentPhase} variant="outline" size="lg" className="px-6">
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
        <SessionsList sessions={sessions} tasks={tasks} />
        <TimerSettingsCard settings={settings} />
      </div>
    </div>
  );
};

export default TimeTracker;

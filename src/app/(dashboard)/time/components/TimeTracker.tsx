'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
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

  const strokeDasharray = 2 * Math.PI * 120; // radius is 120
  const strokeDashoffset = strokeDasharray - (currentProgress / 100) * strokeDasharray;

  // Visual themes for states
  const stateThemes = {
    work: { color: "text-rose-500", shadow: "drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]", bg: "bg-rose-500", border: "border-rose-500/30" },
    shortBreak: { color: "text-teal-500", shadow: "drop-shadow-[0_0_20px_rgba(20,184,166,0.6)]", bg: "bg-teal-500", border: "border-teal-500/30" },
    longBreak: { color: "text-violet-500", shadow: "drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]", bg: "bg-violet-500", border: "border-violet-500/30" }
  };

  const currentTheme = stateThemes[currentPomodoroState] || { color: "text-primary", shadow: "drop-shadow-md", bg: "bg-primary", border: "border-primary/30" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className={`relative overflow-hidden bg-background/60 backdrop-blur-xl border ${currentTheme.border} shadow-2xl transition-colors duration-700`}>
          {/* Subtle background glow based on state */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 ${currentTheme.bg} rounded-full blur-[150px] opacity-10 pointer-events-none transition-all duration-1000`} />
          
          <CardHeader className="text-center pb-2 relative z-10">
            <motion.div 
              key={currentPomodoroState}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`flex items-center justify-center gap-2 mb-2 ${currentTheme.color}`}
            >
              {getTimerIcon()}
              <CardTitle className="text-2xl font-bold">متتبع الوقت</CardTitle>
            </motion.div>
            <CardDescription className="text-base font-medium">
              {getTimerLabel()}
              {activeTaskId && (
                <span className="block mt-1 text-foreground/80">
                  المهمة: {tasks.find(t => t.id === activeTaskId)?.title || 'غير محددة'}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-8 relative z-10">
            
            {/* Glowing Circular Timer */}
            <div className="relative flex items-center justify-center mb-10 mt-4 group">
              <svg width="280" height="280" className="-rotate-90 transform">
                {/* Background Track */}
                <circle 
                  cx="140" cy="140" r="120" 
                  fill="none" stroke="currentColor" 
                  strokeWidth="8" 
                  className="text-muted/30"
                />
                {/* Progress Ring */}
                <motion.circle 
                  cx="140" cy="140" r="120" 
                  fill="none" stroke="currentColor" 
                  strokeWidth="12" 
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className={`${currentTheme.color} ${currentTheme.shadow} transition-all duration-1000 ease-linear`}
                />
              </svg>
              {/* Inner Time Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-6xl font-mono font-black tabular-nums tracking-tighter ${currentTheme.color} ${currentTheme.shadow}`}>
                  {formatTimeDisplay(timeLeft)}
                </span>
                <span className="text-sm font-medium text-muted-foreground mt-2">
                  {Math.round(currentProgress)}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-4 sm:gap-6 w-full max-w-md">
              <Button onClick={resetTimer} variant="outline" size="icon" className="h-14 w-14 rounded-full bg-background/50 backdrop-blur hover:scale-110 active:scale-95 transition-all">
                <RotateCcw className="h-6 w-6" />
              </Button>
              
              <Button 
                onClick={toggleTimer}
                size="lg"
                className={`flex-1 h-16 rounded-2xl text-lg font-bold transition-all shadow-lg active:scale-95 hover:scale-105 hover:shadow-xl ${
                  isRunning 
                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-red-500/20 border border-red-500/30' 
                    : `bg-green-500/10 text-green-500 hover:bg-green-500/20 shadow-green-500/20 border border-green-500/30`
                }`}
              >
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={isRunning ? 'pause' : 'play'}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="flex items-center justify-center gap-2"
                  >
                    {isRunning ? (
                      <>
                        <Pause className="h-6 w-6 fill-current" />
                        إيقاف مؤقت
                      </>
                    ) : (
                      <>
                        <Play className="h-6 w-6 fill-current" />
                        بدء الجلسة
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </Button>
              
              <Button onClick={skipCurrentPhase} variant="outline" size="icon" className="h-14 w-14 rounded-full bg-background/50 backdrop-blur hover:scale-110 active:scale-95 transition-all">
                <Timer className="h-6 w-6" />
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

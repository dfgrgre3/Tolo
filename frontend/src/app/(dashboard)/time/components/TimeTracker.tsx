'use client';

import React, { useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Target,
  TrendingUp,
  Timer,
  Coffee,
  Moon,
  Clock,
  Zap,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTimeTrackerStore, type PomodoroState } from '@/hooks/use-time-tracker-store';
import type { TimeTrackerTask } from '../types';

interface TimeTrackerProps {
  userId: string;
  tasks: TimeTrackerTask[];
  subjects: string[];
  onStudySessionCreate?: (session: any) => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const stateThemes: Record<PomodoroState, {
  label: string;
  labelShort: string;
  icon: React.ReactNode;
  color: string;
  glow: string;
  stroke: string;
  bgGlow: string;
  playBg: string;
  stopBg: string;
  border: string;
}> = {
  work: {
    label: 'وقت الدراسة والتركيز',
    labelShort: 'دراسة',
    icon: <Target className="h-5 w-5" />,
    color: 'text-rose-400',
    glow: 'drop-shadow-[0_0_24px_rgba(244,63,94,0.7)]',
    stroke: 'stroke-rose-500',
    bgGlow: 'from-rose-600/25 via-rose-500/10 to-transparent',
    playBg: 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30',
    stopBg: 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30',
    border: 'border-rose-500/20',
  },
  shortBreak: {
    label: 'استراحة قصيرة - خذ نفسك',
    labelShort: 'استراحة',
    icon: <Coffee className="h-5 w-5" />,
    color: 'text-teal-400',
    glow: 'drop-shadow-[0_0_24px_rgba(20,184,166,0.7)]',
    stroke: 'stroke-teal-500',
    bgGlow: 'from-teal-600/25 via-teal-500/10 to-transparent',
    playBg: 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30',
    stopBg: 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30',
    border: 'border-teal-500/20',
  },
  longBreak: {
    label: 'استراحة طويلة - استرح جيداً',
    labelShort: 'استراحة طويلة',
    icon: <Moon className="h-5 w-5" />,
    color: 'text-violet-400',
    glow: 'drop-shadow-[0_0_24px_rgba(139,92,246,0.7)]',
    stroke: 'stroke-violet-500',
    bgGlow: 'from-violet-600/25 via-violet-500/10 to-transparent',
    playBg: 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30',
    stopBg: 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30',
    border: 'border-violet-500/20',
  },
};

interface TimerCircleProps {
  currentPomodoroState: PomodoroState;
  totalDuration: number;
  handleToggle: () => void;
  theme: any;
}

const TimerCircle = React.memo(({ currentPomodoroState, totalDuration, handleToggle, theme }: TimerCircleProps) => {
  const timeLeft = useTimeTrackerStore((state) => state.timeLeft);
  const isRunning = useTimeTrackerStore((state) => state.isRunning);

  const progress = Math.max(0, Math.min(100, 100 - (timeLeft / totalDuration) * 100));
  const R = 120;
  const circ = 2 * Math.PI * R;
  const offset = circ - (progress / 100) * circ;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center mb-10 cursor-pointer group transition-all duration-300",
        isRunning && "animate-[pulse_3s_infinite_ease-in-out] scale-[1.015]"
      )}
      onClick={handleToggle}
    >
      {/* Outer glow ring */}
      <div className={cn(
        'absolute inset-0 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500',
        currentPomodoroState === 'work' ? 'bg-rose-500' :
        currentPomodoroState === 'shortBreak' ? 'bg-teal-500' : 'bg-violet-500'
      )} />

      <svg width="280" height="280" className="-rotate-90">
        {/* Track */}
        <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        {/* Progress ring */}
        <circle
          cx="140" cy="140" r={R}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={cn(theme.stroke, theme.glow, "transition-[stroke-dashoffset] duration-1000 ease-out")}
        />
      </svg>

      {/* Inner content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
        <span className={cn('text-6xl font-mono font-black tabular-nums tracking-tighter', theme.color, theme.glow)}>
          {formatTime(timeLeft)}
        </span>
        <span className="text-sm font-medium text-white/40 mt-2">
          {Math.round(progress)}% مكتمل
        </span>
        <span className="text-xs text-white/25 mt-1">
          {isRunning ? 'اضغط للإيقاف' : 'اضغط للبدء'}
        </span>
      </div>
    </div>
  );
});

TimerCircle.displayName = 'TimerCircle';

export default function TimeTracker({ userId, tasks, onStudySessionCreate }: TimeTrackerProps) {
  const {
    isRunning,
    currentPomodoroState,
    pomodoroCount,
    activeTaskId,
    activeTaskTitle,
    activeCourseTitle,
    sessions,
    settings,
    startTimer,
    pauseTimer,
    resetTimer,
    skipPhase,
    selectTask,
    completeSession,
    completeSessionEarly,
  } = useTimeTrackerStore();

  const theme = stateThemes[currentPomodoroState];

  const totalDuration =
    currentPomodoroState === 'work'
      ? settings.pomodoroWorkMinutes * 60
      : currentPomodoroState === 'shortBreak'
      ? settings.pomodoroBreakMinutes * 60
      : settings.longBreakMinutes * 60;

  const handleToggle = useCallback(() => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isRunning, pauseTimer, startTimer]);

  const handleTaskSelect = (task: TimeTrackerTask) => {
    if (!isRunning || activeTaskId === task.id) {
      selectTask(task.id, task.title);
      if (!isRunning) {
        toast.info(`تم اختيار المهمة: ${task.title}`);
      }
    }
  };

  // Synchronize new sessions from Zustand store to page state
  const prevSessionsLength = React.useRef(sessions.length);
  React.useEffect(() => {
    if (sessions.length > prevSessionsLength.current) {
      const newSession = sessions[0];
      if (onStudySessionCreate && newSession) {
        onStudySessionCreate({
          id: newSession.id,
          userId: userId,
          durationMin: newSession.durationMin,
          focusScore: 100,
          startTime: newSession.startTime,
          endTime: newSession.endTime,
          subjectId: newSession.courseId,
          createdAt: newSession.endTime,
          taskId: newSession.taskId,
        });
      }
    }
    prevSessionsLength.current = sessions.length;
  }, [sessions, onStudySessionCreate, userId]);

  // Recent sessions
  const recentSessions = sessions.slice(0, 6);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 rtl" dir="rtl">
      {/* ── Main Timer Card ── */}
      <div className="xl:col-span-2">
        <div className={cn(
          'relative overflow-hidden rounded-3xl border bg-[#0a1628]/80 backdrop-blur-2xl',
          'shadow-[0_20px_80px_rgba(0,0,0,0.4)]',
          theme.border,
          'transition-colors duration-700'
        )}>
          {/* Background glow orb */}
          <div className={cn(
            'absolute inset-0 bg-radial-gradient pointer-events-none',
            `bg-[radial-gradient(ellipse_at_50%_30%,_var(--tw-gradient-stops))]`,
            theme.bgGlow
          )} />

          {/* Animated grid */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '30px 30px' }}
          />

          <div className="relative z-10 p-6 md:p-8 flex flex-col items-center">
            {/* Title row */}
            <div className={cn('flex items-center gap-2.5 mb-1 transition-all duration-300', theme.color)}>
              {theme.icon}
              <h2 className="text-xl font-bold text-white">متتبع الوقت</h2>
            </div>
            <p className={cn('text-sm font-medium mb-6 transition-all duration-300', theme.color)}>{theme.label}</p>

            {/* Context badge */}
            {(activeCourseTitle || activeTaskTitle) && (
              <div className="flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs transition-all duration-300">
                {activeCourseTitle
                  ? <><BookOpen className="h-3 w-3 text-blue-400 shrink-0" /><span>{activeCourseTitle}</span></>
                  : <><Zap className="h-3 w-3 text-amber-400 shrink-0" /><span>{activeTaskTitle}</span></>
                }
              </div>
            )}

            {/* Circular Timer (Isolated state subscription) */}
            <TimerCircle
              currentPomodoroState={currentPomodoroState}
              totalDuration={totalDuration}
              handleToggle={handleToggle}
              theme={theme}
            />

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 w-full max-w-sm mb-8">
              <Button
                onClick={resetTimer}
                variant="ghost"
                size="icon"
                className="h-13 w-13 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 hover:scale-110 active:scale-95 transition-all"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>

              <Button
                onClick={handleToggle}
                className={cn(
                  'flex-1 h-14 rounded-2xl text-base font-bold transition-all shadow-lg',
                  'hover:scale-105 active:scale-95',
                  isRunning ? theme.stopBg : theme.playBg
                )}
              >
                <div className="flex items-center gap-2">
                  {isRunning
                    ? <><Pause className="h-5 w-5 fill-current" />إيقاف مؤقت</>
                    : <><Play className="h-5 w-5 fill-current" />بدء الجلسة</>
                  }
                </div>
              </Button>

              <Button
                onClick={skipPhase}
                variant="ghost"
                size="icon"
                className="h-13 w-13 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 hover:scale-110 active:scale-95 transition-all"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>

            {/* Early completion button */}
            {isRunning && currentPomodoroState === 'work' && (
              <div className="mb-6 w-full max-w-sm overflow-hidden transition-all duration-300">
                <Button
                  onClick={completeSessionEarly}
                  className="w-full h-12 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-950/20"
                >
                  <Target className="h-4 w-4" />
                  إنهاء الجلسة وحفظ الدقائق المنقضية
                </Button>
              </div>
            )}

            {/* Pomodoro progress dots */}
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs text-white/30 ml-2">التقدم اليوم:</span>
              {Array.from({ length: settings.goalTarget }).map((_, i) => {
                const done = i < (pomodoroCount % settings.goalTarget);
                return (
                  <div
                    key={i}
                    className={cn(
                      'h-2.5 w-2.5 rounded-full transition-all duration-500',
                      done
                        ? currentPomodoroState === 'work' ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)] scale-110'
                          : currentPomodoroState === 'shortBreak' ? 'bg-teal-500 scale-110'
                          : 'bg-violet-500 scale-110'
                        : 'bg-white/10'
                    )}
                  />
                );
              })}
              <span className="text-xs text-white/30 mr-2">{pomodoroCount} جلسة</span>
            </div>

            {/* Task Selector */}
            {tasks.length > 0 && (
              <div className="w-full max-w-md">
                <p className="text-xs text-white/40 mb-2 text-center">اختر مهمة لتتبع وقتها</p>
                <div className="grid grid-cols-2 gap-2">
                  {tasks.slice(0, 6).map(task => (
                    <Button
                      key={task.id}
                      variant="ghost"
                      onClick={() => handleTaskSelect(task)}
                      disabled={isRunning && activeTaskId !== task.id}
                      className={cn(
                        'truncate text-xs h-9 rounded-xl transition-all',
                        'border',
                        activeTaskId === task.id
                          ? cn('border-opacity-60', theme.border, theme.color, 'bg-white/8')
                          : 'border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5'
                      )}
                    >
                      {task.title}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            {
              icon: <TrendingUp className="h-4 w-4" />,
              label: 'جلسات مكتملة',
              value: `${pomodoroCount}`,
              sub: `الهدف ${settings.goalTarget}`,
              progress: (pomodoroCount / settings.goalTarget) * 100
            },
            {
              icon: <Target className="h-4 w-4" />,
              label: 'نقاط التركيز',
              value: `${Math.min(100, Math.round(pomodoroCount * (settings.pomodoroWorkMinutes / 25) * 20))}`,
              sub: 'نقطة',
            },
            {
              icon: <Clock className="h-4 w-4" />,
              label: 'الوضع الحالي',
              value: theme.labelShort,
              sub: currentPomodoroState === 'work' ? 'ركز على المهمة' : 'استرح',
            }
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[#0a1628]/60 border border-white/8 backdrop-blur p-4 hover:border-white/15 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40">{stat.label}</span>
                <span className={cn('opacity-60', theme.color)}>{stat.icon}</span>
              </div>
              <div className={cn('text-2xl font-bold', theme.color)}>{stat.value}</div>
              <p className="text-[11px] text-white/30 mt-0.5">{stat.sub}</p>
              {stat.progress !== undefined && (
                <Progress value={Math.min(100, stat.progress)} className="mt-2 h-1.5 bg-white/10" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Column: Sessions History ── */}
      <div className="flex flex-col gap-4">
        <div className="rounded-3xl bg-[#0a1628]/60 border border-white/8 backdrop-blur-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Timer className={cn('h-4 w-4', theme.color)} />
            <h3 className="text-sm font-bold text-white">جلسات اليوم</h3>
          </div>

          {recentSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Timer className="h-10 w-10 text-white/15 mb-3" />
              <p className="text-sm text-white/40">لا توجد جلسات بعد</p>
              <p className="text-xs text-white/25 mt-1">ابدأ المؤقت لتسجيل جلسة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/4 hover:bg-white/7 transition-colors"
                >
                  <div className={cn(
                    'h-8 w-8 rounded-xl flex items-center justify-center shrink-0',
                    session.type === 'work' ? 'bg-rose-500/20 text-rose-400'
                      : session.type === 'shortBreak' ? 'bg-teal-500/20 text-teal-400'
                      : 'bg-violet-500/20 text-violet-400'
                  )}>
                    <Timer className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">
                      {session.courseTitle || session.taskTitle || 'جلسة دراسة'}
                    </p>
                    <p className="text-xs text-white/30">
                      {session.durationMin} دقيقة • {new Date(session.endTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings summary card */}
        <div className="rounded-3xl bg-[#0a1628]/60 border border-white/8 backdrop-blur-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Timer className="h-4 w-4 text-white/40" />
            <h3 className="text-sm font-bold text-white">إعدادات المؤقت</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'وقت الدراسة', value: `${settings.pomodoroWorkMinutes} دقيقة`, color: 'text-rose-400' },
              { label: 'استراحة قصيرة', value: `${settings.pomodoroBreakMinutes} دقيقة`, color: 'text-teal-400' },
              { label: 'استراحة طويلة', value: `${settings.longBreakMinutes} دقيقة`, color: 'text-violet-400' },
              { label: 'هدف الجلسات', value: `${settings.goalTarget} جلسات`, color: 'text-amber-400' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-white/40">{item.label}</span>
                <span className={cn('text-xs font-bold', item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

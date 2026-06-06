'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Coffee,
  Moon,
  Target,
  X,
  ChevronDown,
  BookOpen,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTimeTrackerStore, type PomodoroState } from '@/hooks/use-time-tracker-store';

/* ──────────────────────────────────────────── helpers */
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const stateConfig: Record<PomodoroState, { label: string; color: string; ring: string; bg: string; icon: React.ReactNode }> = {
  work: {
    label: 'وقت الدراسة',
    color: 'text-rose-400',
    ring: 'stroke-rose-500',
    bg: 'from-rose-500/20 to-rose-600/5',
    icon: <Target className="h-3.5 w-3.5" />,
  },
  shortBreak: {
    label: 'استراحة قصيرة',
    color: 'text-teal-400',
    ring: 'stroke-teal-500',
    bg: 'from-teal-500/20 to-teal-600/5',
    icon: <Coffee className="h-3.5 w-3.5" />,
  },
  longBreak: {
    label: 'استراحة طويلة',
    color: 'text-violet-400',
    ring: 'stroke-violet-500',
    bg: 'from-violet-500/20 to-violet-600/5',
    icon: <Moon className="h-3.5 w-3.5" />,
  },
};

/* ──────────────────────────────────────── mini circular progress */
function MiniCircle({ progress, state }: { progress: number; state: PomodoroState }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  const cfg = stateConfig[state];

  return (
    <svg width="36" height="36" className="-rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
      <m.circle
        cx="18" cy="18" r={r}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className={cfg.ring}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </svg>
  );
}

/* ──────────────────────────────── header pulse dot (collapsed) */
function PulseDot({ state, isRunning }: { state: PomodoroState; isRunning: boolean }) {
  const colors: Record<PomodoroState, string> = {
    work: 'bg-rose-500',
    shortBreak: 'bg-teal-500',
    longBreak: 'bg-violet-500',
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {isRunning && (
        <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', colors[state])} />
      )}
      <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', colors[state])} />
    </span>
  );
}

/* ──────────────────────────────── main widget */
export function TimeTrackerHeaderWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    isRunning,
    timeLeft,
    currentPomodoroState,
    pomodoroCount,
    activeTaskTitle,
    activeCourseTitle,
    settings,
    startTimer,
    pauseTimer,
    resetTimer,
    skipPhase,
  } = useTimeTrackerStore();

  // Only show the widget while the timer is running.
  if (!isRunning) return null;

  const totalDuration =
    currentPomodoroState === 'work'
      ? settings.pomodoroWorkMinutes * 60
      : currentPomodoroState === 'shortBreak'
      ? settings.pomodoroBreakMinutes * 60
      : settings.longBreakMinutes * 60;

  const progress = Math.max(0, Math.min(100, 100 - (timeLeft / totalDuration) * 100));
  const cfg = stateConfig[currentPomodoroState];

  // Close panel on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen]);

  const toggleTimer = () => {
    if (isRunning) pauseTimer();
    else startTimer();
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition-all duration-200',
          'bg-background/50 hover:bg-background/80 border border-white/10',
          'backdrop-blur-sm hover:scale-105 active:scale-95',
          isRunning && 'border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
        )}
        aria-label="متتبع الوقت"
      >
        <PulseDot state={currentPomodoroState} isRunning={isRunning} />
        <MiniCircle progress={progress} state={currentPomodoroState} />
        <div className="flex flex-col items-start leading-none">
          <span className={cn('text-xs font-mono font-bold tabular-nums', cfg.color)}>
            {formatTime(timeLeft)}
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:block">{cfg.label}</span>
        </div>
        <m.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </m.span>
      </button>

      {/* ── Dropdown Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'absolute left-0 top-full mt-2 z-[200]',
              'w-72 rounded-2xl overflow-hidden',
              'bg-[#0c1220]/95 backdrop-blur-2xl',
              'border border-white/10',
              'shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
            )}
            dir="rtl"
          >
            {/* Panel header */}
            <div className={cn('flex items-center justify-between px-4 py-3 bg-gradient-to-r', cfg.bg, 'border-b border-white/8')}>
              <div className="flex items-center gap-2">
                <span className={cn('flex items-center gap-1', cfg.color)}>
                  {cfg.icon}
                  <span className="text-sm font-bold">{cfg.label}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">{pomodoroCount} / {settings.goalTarget}</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/40 hover:text-white/80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Big circular timer display */}
            <div className="flex flex-col items-center py-6 px-4 gap-4">
              <div className="relative">
                {/* Glow behind */}
                <div className={cn(
                  'absolute inset-0 rounded-full blur-2xl opacity-30',
                  currentPomodoroState === 'work' ? 'bg-rose-500' :
                  currentPomodoroState === 'shortBreak' ? 'bg-teal-500' : 'bg-violet-500'
                )} />
                <svg width="140" height="140" className="-rotate-90 relative">
                  <circle cx="70" cy="70" r="60" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/8" />
                  <m.circle
                    cx="70" cy="70" r="60"
                    fill="none"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 - (progress / 100) * 2 * Math.PI * 60}
                    className={cfg.ring}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center" aria-live="assertive" aria-atomic="true">
                  <span className={cn('text-4xl font-mono font-black tabular-nums', cfg.color)}>
                    {formatTime(timeLeft)}
                  </span>
                  <span className="text-xs text-white/40 mt-0.5">{Math.round(progress)}%</span>
                </div>
              </div>

              {/* Context: task or course */}
              {(activeTaskTitle || activeCourseTitle) && (
                <div className="flex items-center gap-1.5 text-xs text-white/50 max-w-full">
                  {activeCourseTitle ? (
                    <><BookOpen className="h-3.5 w-3.5 shrink-0 text-blue-400" /><span className="truncate">{activeCourseTitle}</span></>
                  ) : (
                    <><Zap className="h-3.5 w-3.5 shrink-0 text-amber-400" /><span className="truncate">{activeTaskTitle}</span></>
                  )}
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-3 w-full justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetTimer}
                  className="h-9 w-9 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                <Button
                  onClick={toggleTimer}
                  className={cn(
                    'h-12 w-12 rounded-full font-bold transition-all shadow-lg',
                    'hover:scale-110 active:scale-95',
                    isRunning
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 shadow-red-500/20'
                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 shadow-emerald-500/20'
                  )}
                >
                  {isRunning
                    ? <Pause className="h-5 w-5 fill-current" />
                    : <Play className="h-5 w-5 fill-current mr-[-2px]" />
                  }
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipPhase}
                  className="h-9 w-9 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              {/* Pomodoro dots */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: settings.goalTarget }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-all duration-300',
                      i < pomodoroCount % settings.goalTarget || pomodoroCount >= settings.goalTarget
                        ? cfg.ring.replace('stroke-', 'bg-')
                        : 'bg-white/15'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Footer link */}
            <div className="border-t border-white/8 px-4 py-2.5 flex items-center justify-between">
              <span className="text-[11px] text-white/30">
                {pomodoroCount} جلسة مكتملة
              </span>
              <Link
                href="/time"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80 transition-colors"
              >
                <Timer className="h-3 w-3" />
                <span>فتح الصفحة الكاملة</span>
              </Link>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

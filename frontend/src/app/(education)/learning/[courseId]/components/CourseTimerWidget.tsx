'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import { Timer, Play, Pause, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTimeTrackerStore } from '@/hooks/use-time-tracker-store';
import { toast } from 'sonner';

interface CourseTimerWidgetProps {
  courseId: string;
  courseTitle: string;
}

const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Floating timer widget shown in the learning hub header area.
 * Automatically associates the active course with the global Pomodoro timer.
 */
export function CourseTimerWidget({ courseId, courseTitle }: CourseTimerWidgetProps) {
  const {
    isRunning,
    timeLeft,
    currentPomodoroState,
    activeCourseId,
    settings,
    selectCourse,
    startTimer,
    pauseTimer,
  } = useTimeTrackerStore();

  const [dismissed, setDismissed] = useState(false);

  // Bind this course to the global timer when the user enters
  useEffect(() => {
    selectCourse(courseId, courseTitle);
    return () => {
      // Don't clear course on unmount — let the timer keep running
    };
  }, [courseId, courseTitle, selectCourse]);

  const isMyCourse = activeCourseId === courseId;
  const totalDuration = settings.pomodoroWorkMinutes * 60;
  const progress = Math.max(0, Math.min(100, 100 - (timeLeft / totalDuration) * 100));
  const R = 16;
  const circ = 2 * Math.PI * R;
  const offset = circ - (progress / 100) * circ;

  const stateColors = {
    work: { text: 'text-rose-400', stroke: 'stroke-rose-500', border: 'border-rose-500/30' },
    shortBreak: { text: 'text-teal-400', stroke: 'stroke-teal-500', border: 'border-teal-500/30' },
    longBreak: { text: 'text-violet-400', stroke: 'stroke-violet-500', border: 'border-violet-500/30' },
  };
  const col = stateColors[currentPomodoroState];

  // Generate screen-reader friendly announcements at milestones to avoid spamming every second
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    if (!isRunning || !isMyCourse) {
      setAnnouncement('');
      return;
    }
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    if (timeLeft === totalDuration) {
      setAnnouncement(`بدأ مؤقت المذاكرة: ${settings.pomodoroWorkMinutes} دقيقة متبقية`);
    } else if (timeLeft === 0) {
      setAnnouncement('انتهت الجلسة');
    } else if (seconds === 0 && minutes % 5 === 0) {
      setAnnouncement(`الوقت المتبقي: ${minutes} دقائق`);
    } else if (timeLeft === 60) {
      setAnnouncement('دقيقة واحدة متبقية');
    } else if (timeLeft === 30) {
      setAnnouncement('30 ثانية متبقية');
    } else if (timeLeft <= 10 && timeLeft > 0) {
      setAnnouncement(`${timeLeft} ثوانٍ متبقية`);
    }
  }, [timeLeft, isRunning, isMyCourse, totalDuration, settings.pomodoroWorkMinutes]);

  const handleToggle = () => {
    if (isRunning) {
      pauseTimer();
      toast.info('تم إيقاف مؤقت المذاكرة');
    } else {
      startTimer();
      toast.success(`بدء تتبع وقت الدراسة في: ${courseTitle}`);
    }
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl',
          'bg-slate-950/90 dark:bg-white/5 backdrop-blur-md',
          'border',
          isRunning && isMyCourse ? col.border : 'border-white/10',
          'shadow-lg transition-all duration-300',
          isRunning && isMyCourse && 'shadow-[0_0_15px_rgba(244,63,94,0.2)]'
        )}
      >
        {/* Screen Reader Announcements */}
        <div className="sr-only" aria-live="assertive" aria-atomic="true">
          {announcement}
        </div>

        {/* Mini circle progress */}
        <div className="relative flex items-center justify-center">
          <svg width="38" height="38" className="-rotate-90">
            <circle cx="19" cy="19" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
            <circle
              cx="19" cy="19" r={R}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={isMyCourse ? offset : circ}
              className={col.stroke}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span className={cn('absolute text-[10px] font-mono font-black', col.text)}>
            {isMyCourse && isRunning ? '▶' : '⏸'}
          </span>
        </div>

        {/* Time display */}
        <div className="flex flex-col leading-none">
          <span className={cn('text-xs font-mono font-bold tabular-nums', col.text)}>
            {isMyCourse ? formatTime(timeLeft) : `${settings.pomodoroWorkMinutes}:00`}
          </span>
          <span className="text-[10px] text-white/40">
            {isRunning && isMyCourse ? 'يعمل الآن' : 'متتبع الوقت'}
          </span>
        </div>

        {/* Play/Pause */}
        <Button
          size="icon"
          onClick={handleToggle}
          className={cn(
            'h-7 w-7 rounded-lg transition-all hover:scale-110 active:scale-95',
            isRunning && isMyCourse
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
          )}
        >
          {isRunning && isMyCourse
            ? <Pause className="h-3.5 w-3.5 fill-current" />
            : <Play className="h-3.5 w-3.5 fill-current" />
          }
        </Button>

        {/* Link to time page */}
        <Link href="/time" title="فتح صفحة متتبع الوقت">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/8">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="text-white/20 hover:text-white/50 transition-colors ml-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </m.div>
    </AnimatePresence>
  );
}

'use client';

/**
 * Lockout Countdown Timer Component
 * Shows remaining lockout time with visual countdown
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Lock, AlertTriangle } from 'lucide-react';

interface LockoutCountdownProps {
  /** Lockout end time (Unix timestamp in ms or ISO string) */
  lockedUntil: number | string;
  /** Number of failed attempts */
  attempts?: number;
  /** Callback when lockout expires */
  onLockoutEnd?: () => void;
  /** Additional CSS classes */
  className?: string;
}

interface TimeRemaining {
  minutes: number;
  seconds: number;
  total: number;
}

function formatTime(minutes: number, seconds: number): string {
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');
  return `${m}:${s}`;
}

function calculateTimeRemaining(lockedUntil: number): TimeRemaining {
  const now = Date.now();
  const total = Math.max(0, lockedUntil - now);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  return { minutes, seconds, total };
}

export function LockoutCountdown({
  lockedUntil,
  attempts = 0,
  onLockoutEnd,
  className = '',
}: LockoutCountdownProps) {
  // Convert to timestamp if ISO string
  const lockoutTimestamp = typeof lockedUntil === 'string' 
    ? new Date(lockedUntil).getTime() 
    : lockedUntil;

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => 
    calculateTimeRemaining(lockoutTimestamp)
  );

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      const newTime = calculateTimeRemaining(lockoutTimestamp);
      setTimeRemaining(newTime);

      if (newTime.total <= 0) {
        clearInterval(interval);
        onLockoutEnd?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutTimestamp, onLockoutEnd]);

  // Don't render if no lockout
  if (timeRemaining.total <= 0) {
    return null;
  }

  // Calculate progress (0 to 100)
  const initialDuration = 60 * 60 * 1000; // 60 minutes default
  const progress = Math.max(0, Math.min(100, (timeRemaining.total / initialDuration) * 100));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className={`rounded-2xl border border-red-500/30 bg-red-500/10 p-4 backdrop-blur ${className}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 text-red-400 mb-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <Lock className="h-5 w-5" />
          </motion.div>
          <span className="font-semibold text-sm">تم تعليق محاولات تسجيل الدخول</span>
        </div>

        {/* Timer Display */}
        <div className="flex items-center justify-center gap-4 my-4">
          <Clock className="h-6 w-6 text-red-300" />
          <motion.span
            key={`${timeRemaining.minutes}:${timeRemaining.seconds}`}
            initial={{ scale: 1.1, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-bold text-white font-mono tracking-wider"
          >
            {formatTime(timeRemaining.minutes, timeRemaining.seconds)}
          </motion.span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-red-900/30 rounded-full overflow-hidden mb-3">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
          />
        </div>

        {/* Info Text */}
        <div className="flex items-start gap-2 text-xs text-slate-300">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-right">
            <p>تم تعليق تسجيل الدخول بسبب محاولات متكررة فاشلة.</p>
            {attempts > 0 && (
              <p className="mt-1 text-slate-400">
                عدد المحاولات الفاشلة: <span className="text-red-400">{attempts}</span>
              </p>
            )}
            <p className="mt-1 text-slate-400">
              يمكنك المحاولة مرة أخرى بعد انتهاء العد التنازلي.
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default LockoutCountdown;

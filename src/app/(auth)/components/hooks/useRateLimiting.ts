'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function useRateLimiting() {
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const isFormLocked = lockoutSeconds !== null && lockoutSeconds > 0;

  const formatLockoutTime = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isFormLocked) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev === null) return prev;
        return prev <= 1 ? 0 : prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isFormLocked]);

  useEffect(() => {
    if (lockoutSeconds === 0) {
      setLockoutSeconds(null);
      toast.info('يمكنك المحاولة الآن.');
    }
  }, [lockoutSeconds]);

  const setLockout = (seconds: number) => {
    const safeRetrySeconds = Number.isFinite(seconds)
      ? Math.max(1, Math.round(seconds))
      : 60;
    setLockoutSeconds(safeRetrySeconds);
    const formattedCountdown = formatLockoutTime(safeRetrySeconds);
    return formattedCountdown;
  };

  const incrementFailedAttempts = () => {
    setFailedAttempts((prev) => prev + 1);
  };

  const resetFailedAttempts = () => {
    setFailedAttempts(0);
  };

  return {
    lockoutSeconds,
    failedAttempts,
    isFormLocked,
    formatLockoutTime,
    setLockout,
    incrementFailedAttempts,
    resetFailedAttempts,
  };
}


'use client';

import { useEffect } from 'react';
import { startGlobalTimerInterval, stopGlobalTimerInterval } from '@/hooks/use-time-tracker-store';

/**
 * Mounts the global timer interval once at the top of the app.
 * Must be a client component inside GlobalProviders.
 */
export function TimerBootstrap() {
  useEffect(() => {
    startGlobalTimerInterval();
    return () => stopGlobalTimerInterval();
  }, []);

  return null;
}

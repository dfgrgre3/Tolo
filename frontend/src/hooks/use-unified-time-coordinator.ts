'use client';

/**
 * useUnifiedTimeCoordinator
 *
 * Resolves the "Double Counting" conflict between two independent time-tracking systems:
 *  1. CourseVideoPlayer → `incrementWatchSeconds` in settings-store (video watch time)
 *  2. TimeTracker → `tick()` in use-time-tracker-store (Pomodoro study time)
 *
 * The Problem:
 * When a student starts a Pomodoro work session AND watches a video simultaneously,
 * both systems count time independently. This corrupts analytics (double minutes logged)
 * and risks sending two concurrent POST requests to `/api/study-sessions`.
 *
 * The Solution:
 * When a video is actively playing during a Pomodoro WORK session, the global Pomodoro
 * timer interval is suspended — because video watch time already counts as focused study.
 * When the video pauses or stops, the Pomodoro timer resumes (if it was running).
 *
 * This hook should be mounted ONCE at the layout level that encompasses both the
 * Dashboard (TimeTracker) and the Course/Video pages (CourseVideoPlayer).
 * Recommended placement: `src/providers/TimeCoordinatorProvider.tsx` or the root layout.
 *
 * @example
 * // In a shared layout or provider:
 * export function TimeCoordinatorProvider({ children }: { children: React.ReactNode }) {
 *   useUnifiedTimeCoordinator();
 *   return <>{children}</>;
 * }
 */

import { useEffect } from 'react';
import { usePlaybackStore } from '@/components/video/player/stores/playback-store';
import {
  useTimeTrackerStore,
  startGlobalTimerInterval,
  stopGlobalTimerInterval,
} from '@/hooks/use-time-tracker-store';

export function useUnifiedTimeCoordinator() {
  useEffect(() => {
    /**
     * Subscribe to video playback state changes.
     * `subscribeWithSelector` is enabled on playback-store so this is efficient —
     * callback fires ONLY when `isPlaying` changes, not on every currentTime update.
     */
    const unsubscribePlayback = usePlaybackStore.subscribe(
      (state) => state.isPlaying,
      (isVideoPlaying) => {
        const trackerState = useTimeTrackerStore.getState();
        const isPomodoroRunning = trackerState.isRunning;
        const isWorkSession = trackerState.currentPomodoroState === 'work';

        if (isVideoPlaying && isPomodoroRunning && isWorkSession) {
          // Both systems are running: video is playing AND Pomodoro work session is active.
          // Suspend the Pomodoro tick to prevent double-counting study minutes.
          // The video watch time in settings-store will count as the study time.
          stopGlobalTimerInterval();
        } else if (!isVideoPlaying && isPomodoroRunning) {
          // Video paused/stopped while Pomodoro is still active → resume ticking.
          // Guard: only restart if the interval isn't already running (startGlobalTimerInterval
          // is idempotent — it checks internally if an interval exists before creating one).
          startGlobalTimerInterval();
        }
        // If Pomodoro is not running, no action needed — don't start the timer here.
      }
    );

    /**
     * Also subscribe to Pomodoro running state.
     * If a student starts a Pomodoro while a video is already playing, immediately
     * suspend the Pomodoro ticker to avoid starting double-counting mid-session.
     */
    const unsubscribeTracker = useTimeTrackerStore.subscribe(
      (state) => state.isRunning,
      (isPomodoroRunning) => {
        if (!isPomodoroRunning) return; // Timer was paused/stopped — no action needed

        const isVideoPlaying = usePlaybackStore.getState().isPlaying;
        const trackerState = useTimeTrackerStore.getState();
        const isWorkSession = trackerState.currentPomodoroState === 'work';

        if (isVideoPlaying && isWorkSession) {
          // Pomodoro just started while video is already playing — suspend immediately
          stopGlobalTimerInterval();
        }
      }
    );

    return () => {
      unsubscribePlayback();
      unsubscribeTracker();
    };
  }, []);
}

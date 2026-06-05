'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner';

export type PomodoroState = 'work' | 'shortBreak' | 'longBreak';

export interface TimerSession {
  id: string;
  taskId?: string;
  taskTitle?: string;
  courseId?: string;
  courseTitle?: string;
  durationMin: number;
  startTime: string;
  endTime: string;
  type: PomodoroState;
}

export interface TimerSettings {
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  longBreakMinutes: number;
  goalTarget: number;
  soundEnabled: boolean;
  autoStartBreak: boolean;
}

interface TimeTrackerState {
  // Timer state
  isRunning: boolean;
  timeLeft: number;
  currentPomodoroState: PomodoroState;
  pomodoroCount: number;
  sessionStartTime: string | null;
  userId: string | null;

  // Context
  activeTaskId: string | null;
  activeTaskTitle: string | null;
  activeCourseId: string | null;
  activeCourseTitle: string | null;

  // Sessions history
  sessions: TimerSession[];

  // Settings
  settings: TimerSettings;

  // Actions
  setUserId: (userId: string | null) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  skipPhase: () => void;
  selectTask: (taskId: string | null, taskTitle?: string | null) => void;
  selectCourse: (courseId: string | null, courseTitle?: string | null) => void;
  updateSettings: (settings: Partial<TimerSettings>) => void;
  completeSession: (customDurationMin?: number) => void;
  completeSessionEarly: () => void;
  clearSessions: () => void;
}

const DEFAULT_SETTINGS: TimerSettings = {
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  longBreakMinutes: 15,
  goalTarget: 4,
  soundEnabled: true,
  autoStartBreak: false,
};

const getDuration = (state: PomodoroState, settings: TimerSettings): number => {
  switch (state) {
    case 'work': return settings.pomodoroWorkMinutes * 60;
    case 'shortBreak': return settings.pomodoroBreakMinutes * 60;
    case 'longBreak': return settings.longBreakMinutes * 60;
  }
};

export const useTimeTrackerStore = create<TimeTrackerState>()(
  persist(
    (set, get) => ({
      isRunning: false,
      timeLeft: DEFAULT_SETTINGS.pomodoroWorkMinutes * 60,
      currentPomodoroState: 'work',
      pomodoroCount: 0,
      sessionStartTime: null,
      userId: null,
      activeTaskId: null,
      activeTaskTitle: null,
      activeCourseId: null,
      activeCourseTitle: null,
      sessions: [],
      settings: DEFAULT_SETTINGS,

      setUserId: (userId) => {
        set({ userId });
      },

      startTimer: () => {
        const state = get();
        set({
          isRunning: true,
          sessionStartTime: state.sessionStartTime || new Date().toISOString(),
        });
      },

      pauseTimer: () => {
        set({ isRunning: false });
      },

      resetTimer: () => {
        const { currentPomodoroState, settings } = get();
        set({
          isRunning: false,
          timeLeft: getDuration(currentPomodoroState, settings),
          sessionStartTime: null,
        });
      },

      tick: () => {
        const state = get();
        if (!state.isRunning) return;

        const newTimeLeft = state.timeLeft - 1;

        if (newTimeLeft <= 0) {
          // Complete the current session
          get().completeSession();
        } else {
          set({ timeLeft: newTimeLeft });
        }
      },

      completeSession: (customDurationMin) => {
        const {
          currentPomodoroState,
          pomodoroCount,
          settings,
          activeTaskId,
          activeTaskTitle,
          activeCourseId,
          activeCourseTitle,
          sessionStartTime,
          userId,
        } = get();

        // Save session if it was a work session
        if (currentPomodoroState === 'work') {
          const durationVal = customDurationMin !== undefined ? customDurationMin : settings.pomodoroWorkMinutes;
          const startTimeVal = customDurationMin !== undefined
            ? new Date(Date.now() - durationVal * 60 * 1000).toISOString()
            : (sessionStartTime || new Date(Date.now() - settings.pomodoroWorkMinutes * 60 * 1000).toISOString());
          const endTimeVal = new Date().toISOString();

          const newSession: TimerSession = {
            id: `session_${Date.now()}`,
            taskId: activeTaskId || undefined,
            taskTitle: activeTaskTitle || undefined,
            courseId: activeCourseId || undefined,
            courseTitle: activeCourseTitle || undefined,
            durationMin: durationVal,
            startTime: startTimeVal,
            endTime: endTimeVal,
            type: 'work',
          };

          // If user is authenticated, sync session to database
          if (userId) {
            fetch(`/api/study-sessions?userId=${encodeURIComponent(userId)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                durationMin: durationVal,
                startTime: startTimeVal,
                endTime: endTimeVal,
                focusScore: 100, // Default full focus
                subjectId: activeCourseId || undefined,
              }),
            })
              .then((res) => {
                if (!res.ok) console.warn('Failed to sync study session to database:', res.statusText);
              })
              .catch((err) => console.warn('Failed to sync study session to database:', err));

            // Sync the actual time to the active task
            if (activeTaskId) {
              fetch(`/api/tasks/${activeTaskId}?userId=${encodeURIComponent(userId)}`)
                .then((res) => {
                  if (res.ok) return res.json();
                  throw new Error('Failed to fetch task details');
                })
                .then((task) => {
                  const updatedTask = {
                    ...task,
                    actualTime: (task.actualTime || 0) + durationVal,
                  };
                  return fetch(`/api/tasks/${activeTaskId}?userId=${encodeURIComponent(userId)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedTask),
                  });
                })
                .then((res) => {
                  if (!res.ok) console.warn('Failed to update task actual time:', res.statusText);
                })
                .catch((err) => console.warn('Failed to update task actual time:', err));
            }
          }

          const isCustom = customDurationMin !== undefined;
          const newCount = pomodoroCount + (isCustom ? 0 : 1);
          const nextState: PomodoroState = newCount % settings.goalTarget === 0 ? 'longBreak' : 'shortBreak';

          set({
            pomodoroCount: newCount,
            currentPomodoroState: isCustom ? 'work' : nextState,
            timeLeft: getDuration(isCustom ? 'work' : nextState, settings),
            isRunning: isCustom ? false : settings.autoStartBreak,
            sessionStartTime: (isCustom ? false : settings.autoStartBreak) ? new Date().toISOString() : null,
            sessions: [newSession, ...get().sessions].slice(0, 100),
          });
        } else {
          // Break is done → go back to work
          set({
            currentPomodoroState: 'work',
            timeLeft: getDuration('work', settings),
            isRunning: settings.autoStartBreak,
            sessionStartTime: settings.autoStartBreak ? new Date().toISOString() : null,
          });
        }
      },

      completeSessionEarly: () => {
        const { isRunning, timeLeft, currentPomodoroState, settings } = get();
        if (!isRunning || currentPomodoroState !== 'work') return;

        const totalDuration = getDuration('work', settings);
        const secondsElapsed = totalDuration - timeLeft;
        const durationMin = Math.round(secondsElapsed / 60);

        if (durationMin >= 1) {
          get().completeSession(durationMin);
          toast.success(`تم حفظ ${durationMin} دقيقة من المذاكرة بنجاح`);
        } else {
          get().resetTimer();
          toast.info('تم إلغاء الجلسة لقصر مدتها (أقل من دقيقة)');
        }
      },

      skipPhase: () => {
        const { currentPomodoroState, pomodoroCount, settings } = get();
        let nextState: PomodoroState;

        if (currentPomodoroState === 'work') {
          nextState = (pomodoroCount + 1) % settings.goalTarget === 0 ? 'longBreak' : 'shortBreak';
        } else {
          nextState = 'work';
        }

        set({
          currentPomodoroState: nextState,
          timeLeft: getDuration(nextState, settings),
          isRunning: false,
          sessionStartTime: null,
        });
      },

      selectTask: (taskId, taskTitle = null) => {
        const state = get();
        if (!state.isRunning) {
          set({ activeTaskId: taskId, activeTaskTitle: taskTitle });
        }
      },

      selectCourse: (courseId, courseTitle = null) => {
        set({ activeCourseId: courseId, activeCourseTitle: courseTitle });
      },

      updateSettings: (newSettings) => {
        const { settings, currentPomodoroState, isRunning } = get();
        const merged = { ...settings, ...newSettings };
        const updates: Partial<TimeTrackerState> = { settings: merged };

        // If timer is not running, update timeLeft too
        if (!isRunning) {
          updates.timeLeft = getDuration(currentPomodoroState, merged);
        }

        set(updates);
      },

      clearSessions: () => {
        set({ sessions: [] });
      },
    }),
    {
      name: 'time-tracker-store',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} })),
      // Only persist these fields
      partialize: (state) => ({
        timeLeft: state.timeLeft,
        currentPomodoroState: state.currentPomodoroState,
        pomodoroCount: state.pomodoroCount,
        activeTaskId: state.activeTaskId,
        activeTaskTitle: state.activeTaskTitle,
        activeCourseId: state.activeCourseId,
        activeCourseTitle: state.activeCourseTitle,
        sessions: state.sessions,
        settings: state.settings,
        userId: state.userId,
        // Don't persist isRunning — always start paused after refresh
        isRunning: false,
        sessionStartTime: null,
      }),
    }
  )
);

// Timer interval manager — singleton that drives the store tick
let timerInterval: ReturnType<typeof setInterval> | null = null;

export function startGlobalTimerInterval() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    const state = useTimeTrackerStore.getState();
    if (state.isRunning) {
      state.tick();
    }
  }, 1000);
}

export function stopGlobalTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

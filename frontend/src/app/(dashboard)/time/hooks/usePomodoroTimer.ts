import { useState, useEffect, useRef, useCallback } from 'react';
import type { StudySession } from '../types';
import { TimeSettingsData } from '../_components/TimeSettings';
import { logger } from '@/lib/logger';

export function usePomodoroTimer(
  userId: string,
  onStudySessionCreate: (session: StudySession) => void,
  activeTaskId: string | null
) {
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [currentPomodoroState, setCurrentPomodoroState] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [pomodoroCount, setPomodoroCount] = useState(0);

  // Load settings from localStorage or use defaults
  const [settings] = useState<TimeSettingsData>(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('timeSettings');
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    }
    return {
      dailyGoalMinutes: 180,
      weeklyGoalMinutes: 1260,
      defaultSessionDuration: 30,
      breakDuration: 5,
      notificationsEnabled: true,
      soundEnabled: true,
      theme: 'auto',
      autoStartBreak: false,
      pomodoroEnabled: true,
      pomodoroWorkMinutes: 25,
      pomodoroBreakMinutes: 5
    };
  });

  const WORK_DURATION = settings.pomodoroWorkMinutes * 60;
  const SHORT_BREAK = settings.pomodoroBreakMinutes * 60;
  const LONG_BREAK = 15 * 60; 
  const GOAL_TARGET = 4;

  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);

  // References to keep state values updated without re-triggering effects
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const activeTaskIdRef = useRef(activeTaskId);
  activeTaskIdRef.current = activeTaskId;
  const currentPomodoroStateRef = useRef(currentPomodoroState);
  currentPomodoroStateRef.current = currentPomodoroState;
  const pomodoroCountRef = useRef(pomodoroCount);
  pomodoroCountRef.current = pomodoroCount;
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  const sessionStartTimeRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (settings.soundEnabled) {
      audioRef.current = new Audio('/sounds/notification.mp3');
    }
  }, [settings.soundEnabled]);

  // Track the actual start time when work starts
  useEffect(() => {
    if (isRunning && !sessionStartTimeRef.current && currentPomodoroState === 'work') {
      sessionStartTimeRef.current = new Date().toISOString();
    }
  }, [isRunning, currentPomodoroState]);

  const handleTimerComplete = useCallback(() => {
    const currentState = currentPomodoroStateRef.current;
    const currentCount = pomodoroCountRef.current;
    const currentTaskId = activeTaskIdRef.current;
    const currentSettings = settingsRef.current;

    if (currentState === 'work') {
      const newPomodoroCount = currentCount + 1;
      setPomodoroCount(newPomodoroCount);

      if (currentSettings.soundEnabled && audioRef.current) {
        audioRef.current.play().catch(e => logger.info("Audio play failed:", e));
      }

      if (currentTaskId) {
        const session: StudySession = {
          id: `session_${Date.now()}`,
          userId,
          taskId: currentTaskId,
          durationMin: Math.floor(WORK_DURATION / 60),
          startTime: sessionStartTimeRef.current || new Date(Date.now() - WORK_DURATION * 1000).toISOString(),
          endTime: new Date().toISOString(),
          subjectId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setSessions(prev => [session, ...prev]);
        onStudySessionCreate(session);
      }

      sessionStartTimeRef.current = null; // reset for next work session

      if (newPomodoroCount % GOAL_TARGET === 0) {
        setCurrentPomodoroState('longBreak');
        setTimeLeft(LONG_BREAK);
      } else {
        setCurrentPomodoroState('shortBreak');
        setTimeLeft(SHORT_BREAK);
      }
      setIsRunning(currentSettings.autoStartBreak);
    } else {
      setCurrentPomodoroState('work');
      setTimeLeft(WORK_DURATION);
      setIsRunning(currentSettings.autoStartBreak);
    }
  }, [userId, onStudySessionCreate, WORK_DURATION, LONG_BREAK, SHORT_BREAK, GOAL_TARGET]);

  // Keep a stable ref to handleTimerComplete for the useEffect timer
  const handleTimerCompleteRef = useRef(handleTimerComplete);
  handleTimerCompleteRef.current = handleTimerComplete;

  // Accurate timer using delta time tracking
  useEffect(() => {
    if (!isRunning) return;

    const startTime = Date.now();
    const durationMs = timeLeftRef.current * 1000;
    const targetTime = startTime + durationMs;

    const tick = () => {
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.round((targetTime - now) / 1000));
      
      setTimeLeft(diffSeconds);

      if (diffSeconds <= 0) {
        handleTimerCompleteRef.current();
      } else {
        timeoutId = setTimeout(tick, 1000);
      }
    };

    let timeoutId = setTimeout(tick, 1000);
    return () => clearTimeout(timeoutId);
  }, [isRunning]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    sessionStartTimeRef.current = null;
    const currentState = currentPomodoroStateRef.current;
    if (currentState === 'work') setTimeLeft(WORK_DURATION);
    else if (currentState === 'shortBreak') setTimeLeft(SHORT_BREAK);
    else setTimeLeft(LONG_BREAK);
  }, [WORK_DURATION, SHORT_BREAK, LONG_BREAK]);

  const toggleTimer = useCallback(() => {
    if (timeLeftRef.current === 0) {
      resetTimer();
    }
    setIsRunning(prev => !prev);
  }, [resetTimer]);

  const skipCurrentPhase = useCallback(() => {
    const currentState = currentPomodoroStateRef.current;
    const currentCount = pomodoroCountRef.current;
    sessionStartTimeRef.current = null;

    if (currentState === 'work') {
      if ((currentCount + 1) % GOAL_TARGET === 0) {
        setCurrentPomodoroState('longBreak');
        setTimeLeft(LONG_BREAK);
      } else {
        setCurrentPomodoroState('shortBreak');
        setTimeLeft(SHORT_BREAK);
      }
    } else {
      setCurrentPomodoroState('work');
      setTimeLeft(WORK_DURATION);
    }
    setIsRunning(false);
  }, [GOAL_TARGET, LONG_BREAK, SHORT_BREAK, WORK_DURATION]);

  return {
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
  };
}

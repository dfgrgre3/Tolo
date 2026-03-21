import { useState, useEffect, useRef, useCallback } from 'react';
import type { StudySession } from '../types';
import { TimeSettingsData } from '../components/TimeSettings';

export function usePomodoroTimer(
  userId: string,
  onStudySessionCreate: (session: StudySession) => void,
  activeTaskId: string | null
) {
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [currentPomodoroState, setCurrentPomodoroState] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds

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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (settings.soundEnabled) {
      audioRef.current = new Audio('/sounds/notification.mp3');
    }
  }, [settings.soundEnabled]);

  const WORK_DURATION = settings.pomodoroWorkMinutes * 60;
  const SHORT_BREAK = settings.pomodoroBreakMinutes * 60;
  const LONG_BREAK = 15 * 60; 
  const GOAL_TARGET = 4;

  const handleTimerComplete = useCallback(() => {
    if (currentPomodoroState === 'work') {
      const newPomodoroCount = pomodoroCount + 1;
      setPomodoroCount(newPomodoroCount);

      if (settings.soundEnabled && audioRef.current) {
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      }

      if (activeTaskId) {
        const session: StudySession = {
          id: `session_${Date.now()}`,
          userId,
          taskId: activeTaskId,
          durationMin: Math.floor(WORK_DURATION / 60),
          startTime: new Date(Date.now() - WORK_DURATION * 1000).toISOString(),
          endTime: new Date().toISOString(),
          subjectId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setSessions(prev => [session, ...prev]);
        onStudySessionCreate(session);
      }

      if (newPomodoroCount % GOAL_TARGET === 0) {
        setCurrentPomodoroState('longBreak');
        setTimeLeft(LONG_BREAK);
      } else {
        setCurrentPomodoroState('shortBreak');
        setTimeLeft(SHORT_BREAK);
      }
      
      setIsRunning(settings.autoStartBreak);
    } else {
      setCurrentPomodoroState('work');
      setTimeLeft(WORK_DURATION);
      setIsRunning(settings.autoStartBreak);
    }

  }, [currentPomodoroState, pomodoroCount, activeTaskId, WORK_DURATION, settings, userId, onStudySessionCreate, LONG_BREAK, SHORT_BREAK]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, handleTimerComplete]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    if (currentPomodoroState === 'work') setTimeLeft(WORK_DURATION);
    else if (currentPomodoroState === 'shortBreak') setTimeLeft(SHORT_BREAK);
    else setTimeLeft(LONG_BREAK);
  }, [currentPomodoroState, WORK_DURATION, SHORT_BREAK, LONG_BREAK]);

  const toggleTimer = useCallback(() => {
    if (timeLeft === 0) resetTimer();
    setIsRunning(prev => !prev);
  }, [timeLeft, resetTimer]);

  const skipCurrentPhase = useCallback(() => {
    if (currentPomodoroState === 'work') {
      if ((pomodoroCount + 1) % GOAL_TARGET === 0) {
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
  }, [currentPomodoroState, pomodoroCount, GOAL_TARGET, LONG_BREAK, SHORT_BREAK, WORK_DURATION]);

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

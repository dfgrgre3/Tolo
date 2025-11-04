import { useState, useCallback, useEffect } from 'react';
import type { Task, StudySession, Reminder, TimeStats } from '../types';

interface UseTimeStatsProps {
  tasks: Task[];
  studySessions: StudySession[];
  reminders: Reminder[];
}

export function useTimeStats({ tasks, studySessions, reminders }: UseTimeStatsProps) {
  const [stats, setStats] = useState<TimeStats>({
    completedTasks: 0,
    pendingTasks: 0,
    studyHours: 0,
    upcomingReminders: 0,
    dailyGoalProgress: 0,
    weeklyGoalProgress: 0,
    streakDays: 0,
    focusScore: 0
  });

  const calculateStats = useCallback(() => {
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = tasks.filter(t => t.status === 'PENDING').length;
    const studyMinutes = studySessions.reduce((acc, session) => acc + session.durationMin, 0);
    const studyHours = Math.round(studyMinutes / 60 * 10) / 10;
    
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcomingReminders = reminders.filter(r => {
      const remindDate = new Date(r.remindAt);
      return remindDate > now && remindDate < next24Hours;
    }).length;
    
    const DAILY_GOAL_MINUTES = 180;
    const WEEKLY_GOAL_MINUTES = 1260;
    const dailyGoalProgress = Math.min(100, (studyMinutes / DAILY_GOAL_MINUTES) * 100);
    const weeklyGoalProgress = Math.min(100, (studyMinutes / WEEKLY_GOAL_MINUTES) * 100);
    
    const uniqueDays = new Set(
      studySessions.map(s => new Date(s.startTime).toDateString())
    ).size;
    const streakDays = Math.min(30, uniqueDays);
    
    const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
    const focusScore = Math.min(100, Math.round(completionRate * 0.7 + dailyGoalProgress * 0.3));
    
    setStats({
      completedTasks,
      pendingTasks,
      studyHours,
      upcomingReminders,
      dailyGoalProgress,
      weeklyGoalProgress,
      streakDays,
      focusScore
    });
  }, [tasks, studySessions, reminders]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const updateStatsOnTaskChange = useCallback((oldTask: Task | undefined, newTask: Task) => {
    if (!oldTask || oldTask.status === newTask.status) return;
    
    setStats(prevStats => {
      let newCompleted = prevStats.completedTasks;
      let newPending = prevStats.pendingTasks;
      
      if (oldTask.status === 'COMPLETED' && newTask.status !== 'COMPLETED') {
        newCompleted = Math.max(0, newCompleted - 1);
        if (newTask.status === 'PENDING') newPending++;
      } else if (oldTask.status !== 'COMPLETED' && newTask.status === 'COMPLETED') {
        newCompleted++;
        if (oldTask.status === 'PENDING') newPending = Math.max(0, newPending - 1);
      } else if (oldTask.status === 'PENDING' && newTask.status !== 'PENDING') {
        newPending = Math.max(0, newPending - 1);
      } else if (oldTask.status !== 'PENDING' && newTask.status === 'PENDING') {
        newPending++;
      }
      
      return {
        ...prevStats,
        completedTasks: newCompleted,
        pendingTasks: newPending
      };
    });
  }, []);

  const updateStatsOnTaskCreate = useCallback((task: Task) => {
    if (task.status === 'PENDING') {
      setStats(prev => ({
        ...prev,
        pendingTasks: prev.pendingTasks + 1
      }));
    }
  }, []);

  const updateStatsOnTaskDelete = useCallback((task: Task) => {
    if (task.status === 'COMPLETED') {
      setStats(prev => ({
        ...prev,
        completedTasks: prev.completedTasks - 1
      }));
    } else if (task.status === 'PENDING') {
      setStats(prev => ({
        ...prev,
        pendingTasks: prev.pendingTasks - 1
      }));
    }
  }, []);

  const updateStatsOnSessionCreate = useCallback((session: StudySession) => {
    setStats(prevStats => {
      const updatedSessions = [...studySessions, session];
      const studyMinutes = updatedSessions.reduce((acc, s) => acc + s.durationMin, 0);
      const studyHours = Math.round(studyMinutes / 60 * 10) / 10;
      const dailyGoalProgress = Math.min(100, (studyMinutes / 180) * 100);
      const weeklyGoalProgress = Math.min(100, (studyMinutes / 1260) * 100);
      
      return {
        ...prevStats,
        studyHours,
        dailyGoalProgress,
        weeklyGoalProgress
      };
    });
  }, [studySessions]);

  const updateStatsOnReminderCreate = useCallback((reminder: Reminder) => {
    const now = new Date();
    const remindDate = new Date(reminder.remindAt);
    if (remindDate > now && remindDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      setStats(prev => ({
        ...prev,
        upcomingReminders: prev.upcomingReminders + 1
      }));
    }
  }, []);

  const updateStatsOnReminderDelete = useCallback((reminder: Reminder) => {
    const now = new Date();
    const remindDate = new Date(reminder.remindAt);
    if (remindDate > now && remindDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      setStats(prev => ({
        ...prev,
        upcomingReminders: prev.upcomingReminders - 1
      }));
    }
  }, []);

  return {
    stats,
    updateStatsOnTaskChange,
    updateStatsOnTaskCreate,
    updateStatsOnTaskDelete,
    updateStatsOnSessionCreate,
    updateStatsOnReminderCreate,
    updateStatsOnReminderDelete
  };
}


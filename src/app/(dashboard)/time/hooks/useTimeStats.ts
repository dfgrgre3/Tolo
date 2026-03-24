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
    focusScore: 0,
    pomodoroSessions: 0,
    studyEfficiency: 0,
    disciplineScore: 0,
    masteryScore: 0
  });

  const calculateStats = useCallback(() => {
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const pendingTasks = tasks.filter((t) => t.status === 'PENDING').length;

    // Calculate study hours for current week only
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const weeklySessions = studySessions.filter((session) =>
    new Date(session.startTime) >= startOfWeek
    );
    const todaySessions = studySessions.filter((session) =>
    new Date(session.startTime) >= startOfToday
    );

    const weeklyMinutes = weeklySessions.reduce((acc, session) => acc + session.durationMin, 0);
    const dailyMinutes = todaySessions.reduce((acc, session) => acc + session.durationMin, 0);
    const studyHours = Math.round(weeklyMinutes / 60 * 10) / 10;

    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcomingReminders = reminders.filter((r) => {
      const remindDate = new Date(r.remindAt);
      return remindDate > now && remindDate < next24Hours;
    }).length;

    const DAILY_GOAL_MINUTES = 180;
    const WEEKLY_GOAL_MINUTES = 1260;
    const dailyGoalProgress = Math.min(100, dailyMinutes / DAILY_GOAL_MINUTES * 100);
    const weeklyGoalProgress = Math.min(100, weeklyMinutes / WEEKLY_GOAL_MINUTES * 100);

    // Calculate streak days - consecutive days with study sessions
    const sessionDays = studySessions.
    map((s) => new Date(s.startTime).toDateString()).
    sort().
    filter((day, index, arr) => arr.indexOf(day) === index); // unique days

    let streakDays = 0;
    const _today = new Date().toDateString();
    let currentDate = new Date();

    // Count backwards from today
    for (let i = 0; i < 30; i++) {
      const dateStr = currentDate.toDateString();
      if (sessionDays.includes(dateStr)) {
        streakDays++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate pomodoro sessions (sessions of approximately 25 minutes)
    const pomodoroSessions = studySessions.filter((session) =>
    session.durationMin >= 20 && session.durationMin <= 30
    ).length;

    // Calculate study efficiency based on actual vs planned time
    let studyEfficiency = 0;
    if (studySessions.length > 0) {
      const totalActualTime = studySessions.reduce((sum, session) => sum + session.durationMin, 0);
      const totalEstimatedTime = tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);
      if (totalEstimatedTime > 0) {
        studyEfficiency = Math.min(100, Math.round(totalActualTime / totalEstimatedTime * 100));
      }
    }

    // Calculate discipline score based on task completion rate
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks * 100 : 0;
    const disciplineScore = Math.min(100, Math.round(
      completionRate * 0.4 + // 40% weight to completion rate
      streakDays / 30 * 100 * 0.3 + // 30% weight to streak consistency
      weeklyGoalProgress * 0.3 // 30% weight to goal achievement
    ));

    // Calculate mastery score based on subject performance
    const masteryScore = Math.min(100, Math.round(
      completionRate * 0.5 + // 50% weight to completion rate
      pomodoroSessions / Math.max(1, studySessions.length) * 100 * 0.3 + // 30% weight to focused study
      dailyGoalProgress * 0.2 // 20% weight to daily consistency
    ));

    const focusScore = Math.min(100, Math.round(completionRate * 0.7 + dailyGoalProgress * 0.3));

    setStats({
      completedTasks,
      pendingTasks,
      studyHours,
      upcomingReminders,
      dailyGoalProgress,
      weeklyGoalProgress,
      streakDays,
      focusScore,
      pomodoroSessions,
      studyEfficiency,
      disciplineScore,
      masteryScore
    });
  }, [tasks, studySessions, reminders]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const updateStatsOnTaskChange = useCallback((oldTask: Task | undefined, newTask: Task) => {
    if (!oldTask || oldTask.status === newTask.status) return;

    setStats((prevStats) => {
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

      // Recalculate scores when tasks change
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? newCompleted / totalTasks * 100 : 0;
      const focusScore = Math.min(100, Math.round(completionRate * 0.7 + prevStats.dailyGoalProgress * 0.3));

      return {
        ...prevStats,
        completedTasks: newCompleted,
        pendingTasks: newPending,
        focusScore
      };
    });
  }, [tasks.length]);

  const updateStatsOnTaskCreate = useCallback((task: Task) => {
    if (task.status === 'PENDING') {
      setStats((prev) => ({
        ...prev,
        pendingTasks: prev.pendingTasks + 1
      }));
    }
  }, []);

  const updateStatsOnTaskDelete = useCallback((task: Task) => {
    if (task.status === 'COMPLETED') {
      setStats((prev) => ({
        ...prev,
        completedTasks: prev.completedTasks - 1
      }));
    } else if (task.status === 'PENDING') {
      setStats((prev) => ({
        ...prev,
        pendingTasks: prev.pendingTasks - 1
      }));
    }
  }, []);

  const updateStatsOnSessionCreate = useCallback((session: StudySession) => {
    setStats((prevStats) => {
      // Get session date
      const sessionDate = new Date(session.startTime);
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      // Calculate if session is in current week
      const isWeekly = sessionDate >= startOfWeek;
      const isDaily = sessionDate >= startOfToday;

      // Calculate new totals
      const currentWeeklyMinutes = prevStats.studyHours * 60;
      const newWeeklyMinutes = isWeekly ? currentWeeklyMinutes + session.durationMin : currentWeeklyMinutes;
      const studyHours = Math.round(newWeeklyMinutes / 60 * 10) / 10;

      // For daily progress, we need to estimate based on current progress
      // This is an approximation - full recalculation happens on next calculateStats call
      const currentDailyProgress = prevStats.dailyGoalProgress;
      const estimatedDailyMinutes = currentDailyProgress / 100 * 180;
      const newDailyMinutes = isDaily ? estimatedDailyMinutes + session.durationMin : estimatedDailyMinutes;
      const dailyGoalProgress = Math.min(100, newDailyMinutes / 180 * 100);

      const weeklyGoalProgress = Math.min(100, newWeeklyMinutes / 1260 * 100);

      // Update pomodoro sessions if this session is close to 25 minutes
      const isPomodoro = session.durationMin >= 20 && session.durationMin <= 30;
      const newPomodoroSessions = isPomodoro ? prevStats.pomodoroSessions + 1 : prevStats.pomodoroSessions;

      return {
        ...prevStats,
        studyHours,
        dailyGoalProgress,
        weeklyGoalProgress,
        pomodoroSessions: newPomodoroSessions
      };
    });
  }, []);

  const updateStatsOnReminderCreate = useCallback((reminder: Reminder) => {
    const now = new Date();
    const remindDate = new Date(reminder.remindAt);
    if (remindDate > now && remindDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      setStats((prev) => ({
        ...prev,
        upcomingReminders: prev.upcomingReminders + 1
      }));
    }
  }, []);

  const updateStatsOnReminderDelete = useCallback((reminder: Reminder) => {
    const now = new Date();
    const remindDate = new Date(reminder.remindAt);
    if (remindDate > now && remindDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      setStats((prev) => ({
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
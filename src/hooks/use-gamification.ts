"use client";

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { UserProgress, Achievement, LeaderboardEntry, CustomGoal } from '@/services/gamification-service';
export type { CustomGoal };
import * as gamificationApi from '@/lib/api/gamification-client';

interface UseGamificationOptions {
  userId: string;
  enableNotifications?: boolean;
}

interface GamificationState {
  userProgress: UserProgress | null;
  achievements: Achievement[];
  leaderboard: LeaderboardEntry[];
  currentAchievement: {
    key: string;
    title: string;
    description: string;
    icon: string;
    xpReward: number;
  } | null;
  isLoading: boolean;
  error: string | null;
}

export function useGamification({
  userId,
  enableNotifications = true
}: UseGamificationOptions) {
  const [state, setState] = useState<GamificationState>({
    userProgress: null,
    achievements: [],
    leaderboard: [],
    currentAchievement: null,
    isLoading: true,
    error: null
  });

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!userId) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const [userProgress, achievements, leaderboard] = await Promise.all([
        gamificationApi.fetchUserProgress(userId).catch(err => {
          logger.error('Error fetching user progress:', err);
          return null;
        }),
        gamificationApi.fetchAchievements().catch(err => {
          logger.error('Error fetching achievements:', err);
          return [] as Achievement[];
        }),
        gamificationApi.fetchLeaderboard('global', 50).catch(err => {
          logger.error('Error fetching leaderboard:', err);
          return [] as LeaderboardEntry[];
        })
      ]);

      setState(prev => ({
        ...prev,
        userProgress,
        achievements,
        leaderboard,
        isLoading: false
      }));

    } catch (error) {
      logger.error('Error loading gamification data:', error);
      setState(prev => ({
        ...prev,
        error: 'فشل في تحميل بيانات نظام النقاط',
        isLoading: false
      }));
    }
  }, [userId]);

  // Handle periodic refresh (Optional for "real-lite" updates)
  useEffect(() => {
    if (!userId) return;
    
    // Refresh leaderboard and progress every minute to keep it fresh
    const interval = setInterval(() => {
      loadInitialData();
    }, 60000);

    return () => clearInterval(interval);
  }, [userId, loadInitialData]);

  // Load initial data when userId changes
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Update user progress
  const updateProgress = useCallback(async (
    action: string,
    data?: Record<string, any>
  ): Promise<UserProgress | null> => {
    if (!userId) return null;

    try {
      const updatedProgress = await gamificationApi.updateUserProgress(userId, action, data);

      setState(prev => ({
        ...prev,
        userProgress: updatedProgress
      }));

      return updatedProgress;
    } catch (error) {
      logger.error('Error updating progress:', error);
      setState(prev => ({
        ...prev,
        error: 'فشل في تحديث التقدم'
      }));
      return null;
    }
  }, [userId]);

  // Create custom goal
  const createCustomGoal = useCallback(async (
    goalData: Omit<CustomGoal, 'id' | 'userId' | 'isCompleted' | 'createdAt' | 'completedAt'>
  ): Promise<CustomGoal | null> => {
    if (!userId) return null;

    try {
      const newGoal = await gamificationApi.createCustomGoal(userId, goalData);

      setState(prev => {
        if (!prev.userProgress) return prev;
        return {
          ...prev,
          userProgress: {
            ...prev.userProgress,
            customGoals: [...prev.userProgress.customGoals, newGoal]
          }
        };
      });

      return newGoal;
    } catch (error) {
      logger.error('Error creating custom goal:', error);
      setState(prev => ({
        ...prev,
        error: 'فشل في إنشاء الهدف'
      }));
      return null;
    }
  }, [userId]);

  // Update custom goal
  const updateCustomGoal = useCallback(async (
    goalId: string,
    currentValue: number
  ): Promise<CustomGoal | null> => {
    try {
      const updatedGoal = await gamificationApi.updateCustomGoal(goalId, currentValue);

      setState(prev => {
        if (!prev.userProgress) return prev;
        return {
          ...prev,
          userProgress: {
            ...prev.userProgress,
            customGoals: prev.userProgress.customGoals.map(g =>
              g.id === goalId ? updatedGoal : g
            )
          }
        };
      });

      return updatedGoal;
    } catch (error) {
      logger.error('Error updating custom goal:', error);
      setState(prev => ({
        ...prev,
        error: 'فشل في تحديث الهدف'
      }));
      return null;
    }
  }, []);

  // Clear achievement notification
  const clearAchievementNotification = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentAchievement: null
    }));
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    await loadInitialData();
  }, [loadInitialData]);

  return {
    // State
    ...state,

    // Actions
    updateProgress,
    createCustomGoal,
    updateCustomGoal,
    clearAchievementNotification,
    refreshData,

    // Utilities
    getUserRank: () => {
      if (!state.userProgress || !Array.isArray(state.leaderboard)) return null;
      const userEntry = state.leaderboard.find(entry => entry.userId === userId);
      return userEntry?.rank || null;
    },

    getEarnedAchievements: () => {
      if (!state.userProgress) return [];
      return state.achievements.filter(achievement =>
        state.userProgress!.achievements.includes(achievement.key)
      );
    },

    getAvailableAchievements: () => {
      if (!state.userProgress) return [];
      return state.achievements.filter(achievement =>
        !state.userProgress!.achievements.includes(achievement.key)
      );
    },

    getAchievementsByCategory: (category: string) => {
      return state.achievements.filter(achievement => achievement.category === category);
    },

    getUserLevelProgress: () => {
      if (!state.userProgress) return { currentLevel: 1, currentLevelXP: 0, nextLevelXP: 100 };

      const currentLevel = state.userProgress.level;
      const currentLevelXP = state.userProgress.totalXP;
      const nextLevelXP = currentLevel * 100; // Simple calculation for demo

      return {
        currentLevel,
        currentLevelXP,
        nextLevelXP,
        progressPercentage: Math.min((currentLevelXP / nextLevelXP) * 100, 100)
      };
    }
  };
}

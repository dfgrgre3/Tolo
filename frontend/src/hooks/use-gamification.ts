"use client";

import { useState, useCallback } from 'react';
import { useGamificationQuery } from './use-gamification-query';
import { useAuth } from '@/hooks/use-auth';
import { CustomGoal } from '@/types/gamification';
export type { CustomGoal };

/**
 * Session-scoped gamification hook. There is no userId option: identity is
 * resolved server-side from the JWT. The only client-side user id used here
 * is the session user (from /auth/me), and only to locate the caller's own
 * row in the public leaderboard — never sent to the API.
 */
interface UseGamificationOptions {
  enableNotifications?: boolean;
  enableRealTime?: boolean;
  includeAchievements?: boolean;
  includeLeaderboard?: boolean;
}

export function useGamification({
  includeAchievements = false,
  includeLeaderboard = false,
}: UseGamificationOptions = {}) {
  const { user } = useAuth();
  const query = useGamificationQuery({
    includeAchievements,
    includeLeaderboard,
  });

  // Maintain local currentAchievement state for notification modals
  const [currentAchievement, setCurrentAchievement] = useState<{
    key: string;
    title: string;
    description: string;
    icon: string;
    xpReward: number;
  } | null>(null);

  const clearAchievementNotification = useCallback(() => {
    setCurrentAchievement(null);
  }, []);

  const createCustomGoal = useCallback(async (
    goalData: Omit<CustomGoal, 'id' | 'userId' | 'isCompleted' | 'createdAt' | 'completedAt'>
  ): Promise<CustomGoal | null> => {
    try {
      const newGoal = await query.createCustomGoal(goalData);
      return newGoal;
    } catch {
      return null;
    }
  }, [query]);

  const updateCustomGoal = useCallback(async (
    goalId: string,
    currentValue: number
  ): Promise<CustomGoal | null> => {
    try {
      const updatedGoal = await query.updateCustomGoal({ goalId, currentValue });
      return updatedGoal;
    } catch {
      return null;
    }
  }, [query]);

  const getUserRank = useCallback(() => {
    if (!query.userProgress || !Array.isArray(query.leaderboard)) return null;
    const userEntry = query.leaderboard.find(entry => entry.userId === user?.id);
    return userEntry?.rank || null;
  }, [query.userProgress, query.leaderboard, user?.id]);

  const getEarnedAchievements = useCallback(() => {
    if (!query.userProgress) return [];
    return query.achievements.filter(achievement =>
      query.userProgress!.achievements.includes(achievement.key)
    );
  }, [query.userProgress, query.achievements]);

  const getAvailableAchievements = useCallback(() => {
    if (!query.userProgress) return [];
    return query.achievements.filter(achievement =>
      !query.userProgress!.achievements.includes(achievement.key)
    );
  }, [query.userProgress, query.achievements]);

  const getAchievementsByCategory = useCallback((category: string) => {
    return query.achievements.filter(achievement => achievement.category === category);
  }, [query.achievements]);

  const getUserLevelProgress = useCallback(() => {
    const progress = query.userProgress;
    if (!progress) {
      return {
        currentLevel: 1,
        currentLevelXP: 0,
        nextLevelXP: 0,
        xpIntoLevel: 0,
        xpToNextLevel: 0,
        progressPercentage: 0
      };
    }

    // Thresholds are computed by the backend; the client only renders them.
    const currentLevelXP = progress.currentLevelXP ?? 0;
    const nextLevelXP = progress.nextLevelXP ?? 0;
    const xpIntoLevel = progress.xpIntoLevel ?? 0;
    const levelSpan = nextLevelXP - currentLevelXP;

    return {
      currentLevel: progress.level,
      currentLevelXP,
      nextLevelXP,
      xpIntoLevel,
      xpToNextLevel: progress.xpToNextLevel ?? 0,
      progressPercentage: levelSpan > 0 ? Math.min((xpIntoLevel / levelSpan) * 100, 100) : 0
    };
  }, [query.userProgress]);

  return {
    // State
    userProgress: query.userProgress,
    achievements: query.achievements,
    leaderboard: query.leaderboard,
    currentAchievement,
    isLoading: query.isLoading,
    error: query.error,

    // Actions
    createCustomGoal,
    updateCustomGoal,
    clearAchievementNotification,
    refreshData: query.refreshData,

    // Utilities
    getUserRank,
    getEarnedAchievements,
    getAvailableAchievements,
    getAchievementsByCategory,
    getUserLevelProgress
  };
}

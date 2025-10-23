"use client";

import { useState, useEffect, useCallback } from 'react';
import { firestoreService, FirestoreUserProgress, FirestoreLeaderboardEntry } from '@/lib/firestore-service';
import { gamificationService, UserProgress, Achievement, LeaderboardEntry, CustomGoal } from '@/lib/gamification-service';

interface UseGamificationOptions {
  userId: string;
  enableRealTime?: boolean;
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
  enableRealTime = true,
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

      // Load user progress
      const userProgress = await gamificationService.getUserProgress(userId);

      // Load all achievements
      const achievements = gamificationService.getAllAchievements();

      // Load leaderboard
      const leaderboard = await gamificationService.getLeaderboard('global', 50);

      setState(prev => ({
        ...prev,
        userProgress,
        achievements,
        leaderboard,
        isLoading: false
      }));

    } catch (error) {
      console.error('Error loading gamification data:', error);
      setState(prev => ({
        ...prev,
        error: 'فشل في تحميل بيانات نظام النقاط',
        isLoading: false
      }));
    }
  }, [userId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!userId || !enableRealTime) return;

    let unsubscribeProgress: (() => void) | null = null;
    let unsubscribeLeaderboard: (() => void) | null = null;
    let unsubscribeNotifications: (() => void) | null = null;

    const setupSubscriptions = async () => {
      try {
        // Subscribe to user progress updates
        unsubscribeProgress = await firestoreService.subscribeToUserProgress(
          userId,
          (progress: FirestoreUserProgress) => {
            setState(prev => ({
              ...prev,
              userProgress: {
                userId: progress.userId,
                totalXP: progress.totalXP,
                level: progress.level,
                currentStreak: progress.currentStreak,
                longestStreak: progress.longestStreak,
                totalStudyTime: progress.totalStudyTime,
                tasksCompleted: progress.tasksCompleted,
                examsPassed: progress.examsPassed,
                achievements: progress.achievements,
                customGoals: prev.userProgress?.customGoals || []
              }
            }));
          }
        );

        // Subscribe to leaderboard updates
        unsubscribeLeaderboard = await firestoreService.subscribeToLeaderboard(
          'global',
          50,
          (leaderboard: FirestoreLeaderboardEntry[]) => {
            setState(prev => ({
              ...prev,
              leaderboard: leaderboard.map(entry => ({
                userId: entry.userId,
                username: entry.username,
                totalXP: entry.totalXP,
                level: entry.level,
                rank: entry.rank,
                avatar: entry.avatar
              }))
            }));
          }
        );

        // Subscribe to achievement notifications
        if (enableNotifications) {
          unsubscribeNotifications = await firestoreService.subscribeToAchievementNotifications(
            userId,
            (achievement) => {
              setState(prev => ({
                ...prev,
                currentAchievement: achievement
              }));

              // Auto-clear achievement notification after 5 seconds
              setTimeout(() => {
                setState(prev => ({
                  ...prev,
                  currentAchievement: null
                }));
              }, 5000);
            }
          );
        }
      } catch (error) {
        console.error('Error setting up real-time subscriptions:', error);
      }
    };

    setupSubscriptions();

    // Cleanup function
    return () => {
      if (unsubscribeProgress) {
        firestoreService.cleanupListener(`userProgress:${userId}`);
      }
      if (unsubscribeLeaderboard) {
        firestoreService.cleanupListener(`leaderboard:global:50`);
      }
      if (unsubscribeNotifications) {
        firestoreService.cleanupListener(`notifications:${userId}`);
      }
    };
  }, [userId, enableRealTime, enableNotifications]);

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
      const updatedProgress = await gamificationService.updateUserProgress(userId, action, data);

      // Update Firestore
      await firestoreService.updateUserProgress(userId, {
        totalXP: updatedProgress.totalXP,
        level: updatedProgress.level,
        currentStreak: updatedProgress.currentStreak,
        longestStreak: updatedProgress.longestStreak,
        totalStudyTime: updatedProgress.totalStudyTime,
        tasksCompleted: updatedProgress.tasksCompleted,
        examsPassed: updatedProgress.examsPassed,
        achievements: updatedProgress.achievements
      });

      setState(prev => ({
        ...prev,
        userProgress: updatedProgress
      }));

      return updatedProgress;
    } catch (error) {
      console.error('Error updating progress:', error);
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
      const newGoal = await gamificationService.createCustomGoal(userId, goalData);

      // Refresh user progress to include the new goal
      await loadInitialData();

      return newGoal;
    } catch (error) {
      console.error('Error creating custom goal:', error);
      setState(prev => ({
        ...prev,
        error: 'فشل في إنشاء الهدف'
      }));
      return null;
    }
  }, [userId, loadInitialData]);

  // Update custom goal
  const updateCustomGoal = useCallback(async (
    goalId: string,
    currentValue: number
  ): Promise<CustomGoal | null> => {
    try {
      const updatedGoal = await gamificationService.updateCustomGoal(goalId, currentValue);

      // Refresh user progress to reflect the updated goal
      await loadInitialData();

      return updatedGoal;
    } catch (error) {
      console.error('Error updating custom goal:', error);
      setState(prev => ({
        ...prev,
        error: 'فشل في تحديث الهدف'
      }));
      return null;
    }
  }, [loadInitialData]);

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
      if (!state.userProgress) return null;
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

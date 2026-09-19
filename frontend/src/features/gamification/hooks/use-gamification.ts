"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryProfiles } from "@/lib/query/query-profiles";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import * as gamificationApi from "../api/gamification-gateway";
import type {
  UserProgress,
  Achievement,
  LeaderboardEntry,
  CustomGoal,
} from "@/types/gamification";

// ─── مفاتيح الـ Query ─────────────────────────────────────────────

export const gamificationKeys = {
  progress: () => ["gamification", "progress", "me"] as const,
  achievements: () => ["gamification", "achievements"] as const,
  leaderboard: (type: string) => ["gamification", "leaderboard", type] as const,
};

export interface GamificationQueryOptions {
  includeAchievements?: boolean;
  includeLeaderboard?: boolean;
  /** @deprecated not used; kept for backward compatibility */
  enableNotifications?: boolean;
  /** @deprecated not used; kept for backward compatibility */
  enableRealTime?: boolean;
}

// ─── Hook: التقدم ─────────────────────────────────────────────────

export function useGamificationProgress() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gamificationKeys.progress(),
    queryFn: gamificationApi.fetchMyProgress,
    enabled: isAuthenticated,
    ...queryProfiles.progress,
  });
}

// ─── Hook: الإنجازات ──────────────────────────────────────────────

export function useAchievements(enabled = false) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gamificationKeys.achievements(),
    queryFn: gamificationApi.fetchAchievements,
    enabled: isAuthenticated && enabled,
    ...queryProfiles.static,
  });
}

// ─── Hook: لوحة المتصدرين ─────────────────────────────────────────

export function useLeaderboard(
  type: "global" | "friends" = "global",
  enabled = false,
) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: gamificationKeys.leaderboard(type),
    queryFn: () => gamificationApi.fetchLeaderboard(type, 50),
    enabled: isAuthenticated && enabled,
    ...queryProfiles.dashboard,
  });
}

// ─── Mutations ────────────────────────────────────────────────────

export function useCreateGoalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      goalData: Omit<
        CustomGoal,
        "id" | "userId" | "isCompleted" | "createdAt" | "completedAt"
      >,
    ) => gamificationApi.createCustomGoal(goalData),
    onSuccess: (newGoal) => {
      queryClient.setQueryData<UserProgress | null>(
        gamificationKeys.progress(),
        (oldProgress) => {
          if (!oldProgress) return null;
          return {
            ...oldProgress,
            customGoals: [...(oldProgress.customGoals || []), newGoal],
          };
        },
      );
      toast.success("تم إنشاء الهدف بنجاح");
    },
    onError: () => {
      toast.error("فشل في إنشاء الهدف");
    },
  });
}

export function useUpdateGoalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId,
      currentValue,
    }: {
      goalId: string;
      currentValue: number;
    }) => gamificationApi.updateCustomGoal(goalId, currentValue),
    onSuccess: (updatedGoal) => {
      queryClient.setQueryData<UserProgress | null>(
        gamificationKeys.progress(),
        (oldProgress) => {
          if (!oldProgress) return null;
          return {
            ...oldProgress,
            customGoals: (oldProgress.customGoals || []).map((g) =>
              g.id === updatedGoal.id ? updatedGoal : g,
            ),
          };
        },
      );
      toast.success("تم تحديث الهدف");
    },
    onError: () => {
      toast.error("فشل في تحديث الهدف");
    },
  });
}

/**
 * Hook شامل يجمع كل بيانات التلعيب مع utility methods.
 * Session-scoped — identity resolved server-side from JWT.
 */
export function useGamification(options: GamificationQueryOptions = {}) {
  const { user } = useAuth();
  const progressQuery = useGamificationProgress();
  const achievementsQuery = useAchievements(!!options.includeAchievements);
  const leaderboardQuery = useLeaderboard("global", !!options.includeLeaderboard);

  const createGoalMutation = useCreateGoalMutation();
  const updateGoalMutation = useUpdateGoalMutation();

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

  const createCustomGoal = useCallback(
    async (
      goalData: Omit<
        CustomGoal,
        "id" | "userId" | "isCompleted" | "createdAt" | "completedAt"
      >,
    ): Promise<CustomGoal | null> => {
      try {
        return await createGoalMutation.mutateAsync(goalData);
      } catch {
        return null;
      }
    },
    [createGoalMutation],
  );

  const updateCustomGoal = useCallback(
    async (goalId: string, currentValue: number): Promise<CustomGoal | null> => {
      try {
        return await updateGoalMutation.mutateAsync({ goalId, currentValue });
      } catch {
        return null;
      }
    },
    [updateGoalMutation],
  );

  const getUserRank = useCallback(() => {
    if (!progressQuery.data || !Array.isArray(leaderboardQuery.data)) return null;
    const userEntry = (leaderboardQuery.data as LeaderboardEntry[]).find(
      (entry) => entry.userId === user?.id,
    );
    return userEntry?.rank || null;
  }, [progressQuery.data, leaderboardQuery.data, user?.id]);

  const getEarnedAchievements = useCallback(() => {
    if (!progressQuery.data) return [];
    return (achievementsQuery.data ?? []).filter((achievement: Achievement) =>
      progressQuery.data!.achievements.includes(achievement.key),
    );
  }, [progressQuery.data, achievementsQuery.data]);

  const getAvailableAchievements = useCallback(() => {
    if (!progressQuery.data) return [];
    return (achievementsQuery.data ?? []).filter(
      (achievement: Achievement) =>
        !progressQuery.data!.achievements.includes(achievement.key),
    );
  }, [progressQuery.data, achievementsQuery.data]);

  const getUserLevelProgress = useCallback(() => {
    const progress = progressQuery.data;
    if (!progress) {
      return {
        currentLevel: 1,
        currentLevelXP: 0,
        nextLevelXP: 0,
        xpIntoLevel: 0,
        xpToNextLevel: 0,
        progressPercentage: 0,
      };
    }
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
      progressPercentage:
        levelSpan > 0 ? Math.min((xpIntoLevel / levelSpan) * 100, 100) : 0,
    };
  }, [progressQuery.data]);

  return {
    // State
    userProgress: progressQuery.data ?? null,
    achievements: achievementsQuery.data ?? [],
    leaderboard: leaderboardQuery.data ?? [],
    currentAchievement,
    isLoading:
      progressQuery.isLoading ||
      achievementsQuery.isLoading ||
      leaderboardQuery.isLoading,
    error:
      progressQuery.error || achievementsQuery.error || leaderboardQuery.error
        ? "فشل في تحميل بيانات نظام النقاط"
        : null,

    // Actions
    createCustomGoal,
    updateCustomGoal,
    clearAchievementNotification,
    refreshData: async () => {
      await Promise.all([
        progressQuery.refetch(),
        achievementsQuery.refetch(),
        leaderboardQuery.refetch(),
      ]);
    },

    // Utilities
    getUserRank,
    getEarnedAchievements,
    getAvailableAchievements,
    getUserLevelProgress,
  };
}

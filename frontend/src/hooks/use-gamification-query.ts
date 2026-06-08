"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as gamificationApi from "@/lib/api/gamification-client";
import { UserProgress, Achievement, LeaderboardEntry, CustomGoal } from "@/types/gamification";
import { toast } from "sonner";

export function useGamificationQuery(userId: string) {
  const queryClient = useQueryClient();

  const progressQuery = useQuery({
    queryKey: ["gamification", "progress", userId],
    queryFn: async () => {
      if (!userId) return null;
      return gamificationApi.fetchUserProgress(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes stale time for passive refetches
  });

  const achievementsQuery = useQuery({
    queryKey: ["gamification", "achievements"],
    queryFn: () => gamificationApi.fetchAchievements(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const leaderboardQuery = useQuery({
    queryKey: ["gamification", "leaderboard", "global"],
    queryFn: () => gamificationApi.fetchLeaderboard("global", 50),
    staleTime: 1000 * 60 * 5,
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ action, data }: { action: string; data?: Record<string, unknown> }) => {
      if (!userId) throw new Error("User ID is required");
      return gamificationApi.updateUserProgress(userId, action, data);
    },
    onSuccess: (updatedProgress) => {
      queryClient.setQueryData(["gamification", "progress", userId], updatedProgress);
      // Invalidate leaderboard to refresh rankings
      queryClient.invalidateQueries({ queryKey: ["gamification", "leaderboard"] });
    },
    onError: (error) => {
      console.error("Failed to update progress:", error);
      toast.error("فشل في تحديث التقدم");
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goalData: Omit<CustomGoal, "id" | "userId" | "isCompleted" | "createdAt" | "completedAt">) => {
      if (!userId) throw new Error("User ID is required");
      return gamificationApi.createCustomGoal(userId, goalData);
    },
    onSuccess: (newGoal) => {
      queryClient.setQueryData<UserProgress | null>(
        ["gamification", "progress", userId],
        (oldProgress) => {
          if (!oldProgress) return null;
          return {
            ...oldProgress,
            customGoals: [...(oldProgress.customGoals || []), newGoal],
          };
        }
      );
      toast.success("تم إنشاء الهدف بنجاح");
    },
    onError: (error) => {
      console.error("Failed to create goal:", error);
      toast.error("فشل في إنشاء الهدف");
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ goalId, currentValue }: { goalId: string; currentValue: number }) => {
      return gamificationApi.updateCustomGoal(goalId, currentValue);
    },
    onSuccess: (updatedGoal) => {
      queryClient.setQueryData<UserProgress | null>(
        ["gamification", "progress", userId],
        (oldProgress) => {
          if (!oldProgress) return null;
          return {
            ...oldProgress,
            customGoals: (oldProgress.customGoals || []).map((g) =>
              g.id === updatedGoal.id ? updatedGoal : g
            ),
          };
        }
      );
      toast.success("تم تحديث الهدف");
    },
    onError: (error) => {
      console.error("Failed to update custom goal:", error);
      toast.error("فشل في تحديث الهدف");
    },
  });

  return {
    // Queries
    userProgress: progressQuery.data ?? null,
    achievements: achievementsQuery.data ?? [],
    leaderboard: leaderboardQuery.data ?? [],
    isLoading: progressQuery.isLoading || achievementsQuery.isLoading || leaderboardQuery.isLoading,
    error: progressQuery.error || achievementsQuery.error || leaderboardQuery.error ? "فشل في تحميل بيانات نظام النقاط" : null,

    // Mutations
    updateProgress: updateProgressMutation.mutateAsync,
    createCustomGoal: createGoalMutation.mutateAsync,
    updateCustomGoal: updateGoalMutation.mutateAsync,
    refreshData: async () => {
      await Promise.all([
        progressQuery.refetch(),
        achievementsQuery.refetch(),
        leaderboardQuery.refetch(),
      ]);
    },
  };
}

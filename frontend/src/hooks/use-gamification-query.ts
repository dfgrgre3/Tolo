"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as gamificationApi from "@/lib/api/gamification-client";
import { UserProgress, CustomGoal } from "@/types/gamification";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface GamificationQueryOptions {
  includeAchievements?: boolean;
  includeLeaderboard?: boolean;
}

/**
 * Session-scoped gamification queries. Identity is never passed to the API —
 * the backend resolves it from the JWT — so there is no userId parameter.
 * Queries are simply disabled until a session exists.
 */
export function useGamificationQuery(options?: GamificationQueryOptions) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const progressQuery = useQuery({
    queryKey: ["gamification", "progress", "me"],
    queryFn: () => gamificationApi.fetchMyProgress(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes stale time for passive refetches
  });

  const achievementsQuery = useQuery({
    queryKey: ["gamification", "achievements"],
    queryFn: () => gamificationApi.fetchAchievements(),
    enabled: isAuthenticated && !!options?.includeAchievements,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const leaderboardQuery = useQuery({
    queryKey: ["gamification", "leaderboard", "global"],
    queryFn: () => gamificationApi.fetchLeaderboard("global", 50),
    enabled: isAuthenticated && !!options?.includeLeaderboard,
    staleTime: 1000 * 60 * 5,
  });

  const createGoalMutation = useMutation({
    mutationFn: (goalData: Omit<CustomGoal, "id" | "userId" | "isCompleted" | "createdAt" | "completedAt">) => {
      return gamificationApi.createCustomGoal(goalData);
    },
    onSuccess: (newGoal) => {
      queryClient.setQueryData<UserProgress | null>(
        ["gamification", "progress", "me"],
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
    mutationFn: ({ goalId, currentValue }: { goalId: string; currentValue: number }) => {
      return gamificationApi.updateCustomGoal(goalId, currentValue);
    },
    onSuccess: (updatedGoal) => {
      queryClient.setQueryData<UserProgress | null>(
        ["gamification", "progress", "me"],
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

/**
 * @deprecated
 * هذا الملف أصبح facade للتوافق الرجعي فقط.
 * الاستخدام الصحيح: استورد مباشرة من `@/features/gamification`
 */
"use client";

import { useGamificationProgress, useAchievements, useLeaderboard, useCreateGoalMutation, useUpdateGoalMutation } from "@/features/gamification";
import type { GamificationQueryOptions } from "@/features/gamification";

export type { GamificationQueryOptions };

/**
 * @deprecated استخدم `useGamification` من `@/features/gamification` بدلاً من هذا.
 */
export function useGamificationQuery(options?: GamificationQueryOptions) {
  const progressQuery = useGamificationProgress();
  const achievementsQuery = useAchievements(!!options?.includeAchievements);
  const leaderboardQuery = useLeaderboard("global", !!options?.includeLeaderboard);
  const createGoalMutation = useCreateGoalMutation();
  const updateGoalMutation = useUpdateGoalMutation();

  return {
    userProgress: progressQuery.data ?? null,
    achievements: achievementsQuery.data ?? [],
    leaderboard: leaderboardQuery.data ?? [],
    isLoading: progressQuery.isLoading || achievementsQuery.isLoading || leaderboardQuery.isLoading,
    error: progressQuery.error || achievementsQuery.error || leaderboardQuery.error
      ? "فشل في تحميل بيانات نظام النقاط"
      : null,
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

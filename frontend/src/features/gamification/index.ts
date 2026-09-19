/**
 * Gamification Feature — Public API
 *
 * الواجهة العامة لنطاق التلعيب والتقدم والإنجازات.
 * استورد دائماً من هنا بدلاً من المسارات الداخلية.
 */

// Domain types (re-export from existing types)
export type {
  UserProgress,
  Achievement,
  LeaderboardEntry,
  CustomGoal,
  ProgressSummary,
} from "@/types/gamification";

// API gateway (wraps existing gamification-client)
export {
  fetchMyProgress,
  fetchAchievements,
  fetchLeaderboard,
  createCustomGoal,
  updateCustomGoal,
} from "./api/gamification-gateway";

// Hooks
export {
  gamificationKeys,
  useGamificationProgress,
  useAchievements,
  useLeaderboard,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useGamification,
} from "./hooks/use-gamification";

export type { GamificationQueryOptions } from "./hooks/use-gamification";

/**
 * Gamification API Gateway
 *
 * يعيد تصدير دوال gamification-client الموجودة مع احتفاظه
 * بالسلوك الصحيح (session-scoped, no userId passed to API).
 */

export {
  fetchMyProgress,
  fetchAchievements,
  fetchLeaderboard,
  createCustomGoal,
  updateCustomGoal,
} from "@/lib/api/gamification-client";

/**
 * Gamification API Gateway
 *
 * يعيد تصدير دوال gamification-client الموجودة مع احتفاظه
 * بالسلوك الصحيح (session-scoped, no userId passed to API).
 */

import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

export {
  fetchMyProgress,
  fetchAchievements,
  fetchLeaderboard,
  createCustomGoal,
  updateCustomGoal,
} from "@/lib/api/gamification-client";

type RequestOptions = { signal?: AbortSignal; retries?: number };

// ─── مرايا النقل الخام (حد ترحيل الواجهات F-018) ─────────────────────
// 1:1 mirrors — نفس المسار والخيارات (signal/retries)، والحمولة الخام.

export function fetchGamificationProgressRaw<T>(options?: RequestOptions): Promise<T> {
  return apiClient.get<T>(apiRoutes.gamification.progress, options);
}

export function fetchGamificationAchievementsRaw<T>(options?: RequestOptions): Promise<T> {
  return apiClient.get<T>(apiRoutes.gamification.achievements, options);
}

export function fetchProgressSummaryRaw<T>(options?: RequestOptions): Promise<T> {
  return apiClient.get<T>(apiRoutes.progress.summary, options);
}

// ─── تحليلات لوحة المتابعة ───────────────────────────────────────────

export function fetchAnalyticsWeeklyRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.analytics.weekly);
}

export function fetchAnalyticsPredictionsRaw<T>(): Promise<T> {
  return apiClient.get<T>(apiRoutes.analytics.predictions);
}

export function fetchAnalyticsPerformanceRaw<T>(query: string): Promise<T> {
  return apiClient.get<T>(`${apiRoutes.analytics.performance}${query}`);
}

"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardResource } from "./useDashboardResource";
import { apiRoutes } from "@/lib/api/routes";
import type {
  PerformanceMetric,
  Prediction,
  Recommendation,
  Tip,
  CourseProgress,
} from "../shared/types";

/** Centralized API endpoints to avoid magic strings and improve maintainability.
 * NOTE: GET /api/ai/tips does not exist on the backend (only POST for generation).
 * TIPS is intentionally omitted until the backend ships a GET feed — see useTips below. */
const API_ENDPOINTS = {
  PERFORMANCE: "/api/analytics/performance",
  PREDICTIONS: "/api/analytics/predictions",
  RECOMMENDATIONS: apiRoutes.ai.recommendations,
  COURSE_PROGRESS: "/api/users/progress/courses",
} as const;

type PerformanceResponse = { metrics: PerformanceMetric[] };
type PredictionsResponse = { predictions: Prediction[] };
type RecommendationsResponse = { recommendations: Recommendation[] };
type CourseProgressResponse = {
  courses: CourseProgress[];
  totalCourses: number;
  completed: number;
  inProgress: number;
  averagePercent: number;
};

// Referentially stable empty arrays using 'as const' for type safety without runtime overhead
const EMPTY_METRICS = [] as const satisfies readonly PerformanceMetric[];
const EMPTY_PREDICTIONS = [] as const satisfies readonly Prediction[];
const EMPTY_RECOMMENDATIONS = [] as const satisfies readonly Recommendation[];
// An annotated empty array, not "[] as const": the literal empty-tuple type has
// no element type, so .map() in TipsSection would infer its item as `never`.
// The other empties are always unioned with the real response type below, which
// supplies the element type; this one is returned on its own.
const EMPTY_TIPS: readonly Tip[] = [];
const EMPTY_COURSES = [] as const satisfies readonly CourseProgress[];

/**
 * Returns the API path only when the user is authenticated and auth state is resolved.
 * No useMemo needed as the operation is trivial and dependencies are primitive.
 */
function useAuthedUrl(path: string): string | null {
  const { isAuthenticated, isLoading } = useAuth();
  return isAuthenticated && !isLoading ? path : null;
}

/**
 * Custom hook combining auth check with dashboard resource fetching.
 * Properly named as a hook to satisfy ESLint rules-of-hooks.
 */
function useAuthenticatedResource<T>(path: string, resourceName: string) {
  const url = useAuthedUrl(path);
  return useDashboardResource<T>(url, resourceName);
}

/** Measured performance metrics for the trailing 7 days. */
export function usePerformanceMetrics() {
  const { data, loading, error, refetch } = useAuthenticatedResource<PerformanceResponse>(
    API_ENDPOINTS.PERFORMANCE,
    "مؤشرات الأداء"
  );

  return useMemo(
    () => ({
      metrics: data?.metrics ?? EMPTY_METRICS,
      loading,
      error,
      refetch,
    }),
    [data?.metrics, loading, error, refetch]
  );
}

/** Score projections for the 30/60/90 day horizons. */
export function usePredictions() {
  const { data, loading, error, refetch } = useAuthenticatedResource<PredictionsResponse>(
    API_ENDPOINTS.PREDICTIONS,
    "التوقعات"
  );

  return useMemo(
    () => ({
      predictions: data?.predictions ?? EMPTY_PREDICTIONS,
      loading,
      error,
      refetch,
    }),
    [data?.predictions, loading, error, refetch]
  );
}

/** Evidence-based study recommendations. */
export function useRecommendations() {
  const { data, loading, error, refetch } = useAuthenticatedResource<RecommendationsResponse>(
    API_ENDPOINTS.RECOMMENDATIONS,
    "التوصيات"
  );

  return useMemo(
    () => ({
      recommendations: data?.recommendations ?? EMPTY_RECOMMENDATIONS,
      loading,
      error,
      refetch,
    }),
    [data?.recommendations, loading, error, refetch]
  );
}

/** Study tips personalized from the learner's own habits.
 * The backend currently only exposes POST /api/ai/tips (on-demand generation
 * via TipsGenerator). There is no GET feed, so a GET here 404s through the
 * /api/[...path] proxy on every dashboard visit. Return a stable empty state
 * (the "سجّل جلسات مذاكرة" empty UI) without any network request until the
 * backend ships `GET /api/ai/tips`. */
export function useTips() {
  return useMemo(
    () => ({
      tips: EMPTY_TIPS,
      loading: false as boolean,
      error: null as string | null,
      refetch: () => {},
    }),
    []
  );
}

/** Enrolled courses with lesson-level completion. */
export function useCourseProgress() {
  const { data, loading, error, refetch } = useAuthenticatedResource<CourseProgressResponse>(
    API_ENDPOINTS.COURSE_PROGRESS,
    "تقدم الكورسات"
  );

  return useMemo(
    () => ({
      courses: data?.courses ?? EMPTY_COURSES,
      totalCourses: data?.totalCourses ?? 0,
      completed: data?.completed ?? 0,
      inProgress: data?.inProgress ?? 0,
      averagePercent: data?.averagePercent ?? 0,
      loading,
      error,
      refetch,
    }),
    [
      data?.courses,
      data?.totalCourses,
      data?.completed,
      data?.inProgress,
      data?.averagePercent,
      loading,
      error,
      refetch,
    ]
  );
}
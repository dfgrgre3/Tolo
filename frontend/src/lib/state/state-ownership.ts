/**
 * State Ownership Architecture Standard (P0-5).
 *
 * Enforces the Single Source of Truth matrix across the frontend:
 *
 * ┌───────────────────────────────┬────────────────────────────────────────────┐
 * │ State Classification          │ Authoritative Owner                        │
 * ├───────────────────────────────┼────────────────────────────────────────────┤
 * │ Server Data (Courses/Progress)│ React Query (TanStack Query Cache)         │
 * │ Auth & Session Identity       │ Auth Context (`useAuth`) / Server Session │
 * │ Ephemeral UI State            │ Zustand / Component local state            │
 * │ Form State                    │ React Hook Form                            │
 * │ Offline Pending Mutations     │ Dedicated Outbox (localStorage queue)      │
 * │ Playback / Media Head State   │ Player-scoped Zustand Store                │
 * └───────────────────────────────┴────────────────────────────────────────────┘
 */

import type { QueryClient } from "@tanstack/react-query";

/**
 * Centralized query key factory for course, learning hub, and progress queries.
 */
export const courseProgressKeys = {
  all: ["courses"] as const,
  lists: () => [...courseProgressKeys.all, "list"] as const,
  detail: (courseId: string) => [...courseProgressKeys.all, "detail", courseId] as const,
  curriculum: (courseId: string) => [...courseProgressKeys.all, "curriculum", courseId] as const,
  learningHub: (courseId: string) => [...courseProgressKeys.all, "learning-hub", courseId] as const,
  lessonProgress: (lessonId: string) => ["lesson-progress", lessonId] as const,
};

export interface ProgressReconciliationInput {
  lessonId: string;
  courseProgress?: number;
  lessonProgress?: number;
  isCompleted?: boolean;
  isCourseComplete?: boolean;
  certificateEligible?: boolean;
}

/**
 * Reconciles authoritative progress from a server response into the React Query cache.
 * Prevents race conditions between optimistic local updates and delayed server heartbeats.
 */
export function reconcileCourseProgress(
  queryClient: QueryClient,
  courseId: string,
  progress: ProgressReconciliationInput
) {
  // 1. Invalidate or update lesson-level progress cache
  if (progress.lessonId) {
    queryClient.setQueryData(
      courseProgressKeys.lessonProgress(progress.lessonId),
      (prev: unknown) => {
        const base =
          typeof prev === "object" && prev !== null
            ? (prev as { progress?: number; completed?: boolean })
            : {};
        return {
          ...base,
          progress: progress.lessonProgress ?? base.progress ?? (progress.isCompleted ? 100 : 0),
          completed: progress.isCompleted ?? base.completed ?? false,
        };
      }
    );
  }

  // 2. Reconcile course-level completion data if present
  if (typeof progress.courseProgress === "number" || progress.isCourseComplete !== undefined) {
    queryClient.setQueriesData(
      { queryKey: courseProgressKeys.detail(courseId) },
      (oldCourse: unknown) => {
        if (typeof oldCourse !== "object" || oldCourse === null) return oldCourse;
        const base = oldCourse as {
          progress?: unknown;
          completion?: { progress?: unknown; isComplete?: unknown; certificateEligible?: unknown } | null;
        };
        return {
          ...base,
          progress: progress.courseProgress ?? base.progress,
          completion: {
            ...base.completion,
            progress: progress.courseProgress ?? base.completion?.progress,
            isComplete: progress.isCourseComplete ?? base.completion?.isComplete,
            certificateEligible: progress.certificateEligible ?? base.completion?.certificateEligible,
          },
        };
      }
    );

    // Also update any active learning-hub query cache
    queryClient.setQueriesData(
      { queryKey: courseProgressKeys.learningHub(courseId) },
      (oldHub: unknown) => {
        if (typeof oldHub !== "object" || oldHub === null) return oldHub;
        const base = oldHub as {
          completion?: { progress?: unknown; isComplete?: unknown; certificateEligible?: unknown } | null;
        };
        return {
          ...base,
          completion: {
            ...base.completion,
            progress: progress.courseProgress ?? base.completion?.progress,
            isComplete: progress.isCourseComplete ?? base.completion?.isComplete,
            certificateEligible: progress.certificateEligible ?? base.completion?.certificateEligible,
          },
        };
      }
    );
  }

  // 3. Mark stale for background sync
  queryClient.invalidateQueries({ queryKey: courseProgressKeys.detail(courseId) });
  queryClient.invalidateQueries({ queryKey: courseProgressKeys.learningHub(courseId) });
}

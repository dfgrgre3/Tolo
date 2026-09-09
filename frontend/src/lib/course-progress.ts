import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import type { LessonProgressResponse } from "@/types/domain/mappers";

export type LessonProgressInput = {
  completed?: boolean;
  lastWatchedPosition?: number;
  timeSpentDeltaSeconds?: number;
  status?: "IN_PROGRESS" | "NOT_STARTED";
};

/**
 * The single client boundary for lesson progress mutations.
 * Completion and playback progress must use the same server command so the
 * backend remains the source of truth for course completion and certificates.
 */
export function updateLessonProgress(
  lessonId: string,
  input: LessonProgressInput,
  options?: { keepalive?: boolean },
): Promise<LessonProgressResponse> {
  return apiClient.post<LessonProgressResponse>(
    apiRoutes.courses.lessonProgress(lessonId),
    input,
    options,
  );
}

export function readLessonProgress(lessonId: string) {
  return apiClient.get<{
    lastWatchedPosition?: number;
    lastVideoPosition?: number;
    updatedAt?: string;
  }>(apiRoutes.courses.lessonProgress(lessonId));
}

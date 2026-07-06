/**
 * Enrollment Repository — enrollment status, progress, and course progression.
 */
import { apiClient } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';
import type {
  SubjectEnrollment,
  LessonProgress,
  CourseProgressSummary,
  EnrollmentStatusResponse,
} from '@/types/enrollment';

// ────────────────────────────────────────────────────────────
// Repository
// ────────────────────────────────────────────────────────────

export const enrollmentRepository = {
  /** GET /api/courses/:id/enrollment-status */
  getStatus: (courseId: string) =>
    apiClient.get<EnrollmentStatusResponse>(
      apiRoutes.courses.enrollmentStatus(courseId)
    ),

  /** POST /api/courses/:id/enroll */
  enroll: (courseId: string) =>
    apiClient.post<SubjectEnrollment>(apiRoutes.courses.enroll(courseId), {}),

  /** DELETE /api/courses/:id/enroll */
  unenroll: (courseId: string) =>
    apiClient.delete<void>(apiRoutes.courses.unenroll(courseId)),

  /** POST /api/courses/:id/complete */
  completeCourse: (courseId: string) =>
    apiClient.post<void>(apiRoutes.courses.complete(courseId), {}),

  /** GET /api/progress/summary */
  getProgressSummary: () =>
    apiClient.get<{ courses: CourseProgressSummary[]; totalTime: number }>(
      apiRoutes.progress.summary
    ),

  /** GET /api/users/progress/courses */
  getUserCoursesProgress: () =>
    apiClient.get<CourseProgressSummary[]>(apiRoutes.progress.courses),

  /** GET /api/users/progress/time */
  getUserTimeProgress: () =>
    apiClient.get<unknown>(apiRoutes.progress.time),

  /** GET /api/users/progress/achievements */
  getUserAchievementsProgress: () =>
    apiClient.get<unknown>(apiRoutes.progress.achievements),

  /** POST /api/courses/lessons/:id/progress */
  updateLessonProgress: (
    lessonId: string,
    payload: {
      status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
      timeSpentSeconds?: number;
      lastWatchedPosition?: number;
      completed?: boolean;
    }
  ) =>
    apiClient.post<LessonProgress>(
      apiRoutes.courses.lessonProgress(lessonId),
      payload
    ),
};

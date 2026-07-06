import 'server-only';
/**
 * Subject / Course Repository — public & protected course API calls.
 * Covers: GET courses, curriculum, reviews, lessons, notes, and progress.
 */
import { apiClient } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';
import type { Subject, Topic, SubTopic, CourseReview } from '@/types/subject';
import type { PaginatedResponse, SearchParams } from '@/types/api/responses';

// ────────────────────────────────────────────────────────────
// Request / Response types
// ────────────────────────────────────────────────────────────

export interface GetCoursesParams extends SearchParams {
  category?: string;
  level?: string;
  language?: string;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface CreateReviewPayload {
  rating: number;
  comment: string;
}

export interface LessonNote {
  id: string;
  lessonId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotePayload {
  content: string;
}

export interface UpdateLessonProgressPayload {
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  timeSpentSeconds?: number;
  lastWatchedPosition?: number;
  completed?: boolean;
}

// ────────────────────────────────────────────────────────────
// Repository
// ────────────────────────────────────────────────────────────

export const subjectRepository = {
  // ── Public endpoints ──

  /** GET /api/courses — paginated list */
  getCourses: (params?: GetCoursesParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.set(k, String(v));
        }
      });
    }
    const qs = searchParams.toString();
    const url = qs ? `${apiRoutes.courses.list}?${qs}` : apiRoutes.courses.list;
    return apiClient.get<PaginatedResponse<Subject> | Subject[]>(url);
  },

  /** GET /api/courses/popular */
  getPopularCourses: () =>
    apiClient.get<Subject[]>(apiRoutes.courses.popular),

  /** GET /api/courses/:id */
  getCourse: (id: string) =>
    apiClient.get<Subject>(apiRoutes.courses.byId(id)),

  /** GET /api/courses/:id/lessons */
  getCourseLessons: (id: string) =>
    apiClient.get<Topic[]>(apiRoutes.courses.lessons(id)),

  /** GET /api/courses/:id/reviews */
  getCourseReviews: (id: string) =>
    apiClient.get<CourseReview[]>(apiRoutes.courses.reviews(id)),

  /** GET /api/categories */
  getCategories: () =>
    apiClient.get<unknown[]>(apiRoutes.categories),

  /** GET /api/teachers */
  getTeachers: () =>
    apiClient.get<unknown[]>(apiRoutes.teachers),

  // ── Protected endpoints ──

  /** POST /api/courses/:id/enroll */
  enroll: (id: string) =>
    apiClient.post<void>(apiRoutes.courses.enroll(id), {}),

  /** DELETE /api/courses/:id/enroll */
  unenroll: (id: string) =>
    apiClient.delete<void>(apiRoutes.courses.unenroll(id)),

  /** GET /api/courses/:id/enrollment-status */
  getEnrollmentStatus: (id: string) =>
    apiClient.get<{ enrolled: boolean; enrollment?: unknown }>(
      apiRoutes.courses.enrollmentStatus(id)
    ),

  /** GET /api/courses/:id/curriculum */
  getCurriculum: (id: string) =>
    apiClient.get<{ topics: Topic[] }>(apiRoutes.courses.curriculum(id)),

  /** POST /api/courses/:id/reviews */
  createReview: (id: string, payload: CreateReviewPayload) =>
    apiClient.post<CourseReview>(apiRoutes.courses.createReview(id), payload),

  /** POST /api/courses/lessons/:id/progress */
  updateLessonProgress: (lessonId: string, payload: UpdateLessonProgressPayload) =>
    apiClient.post<void>(apiRoutes.courses.lessonProgress(lessonId), payload),

  /** GET /api/courses/lessons/:id/notes */
  getLessonNotes: (lessonId: string) =>
    apiClient.get<LessonNote[]>(apiRoutes.courses.lessonNotes(lessonId)),

  /** POST /api/courses/lessons/:id/notes */
  createLessonNote: (lessonId: string, payload: CreateNotePayload) =>
    apiClient.post<LessonNote>(apiRoutes.courses.createNote(lessonId), payload),

  /** POST /api/courses/:id/complete */
  completeCourse: (id: string) =>
    apiClient.post<void>(apiRoutes.courses.complete(id), {}),

  /** POST /api/courses/:id/checkout */
  checkoutCourse: (id: string, payload?: Record<string, unknown>) =>
    apiClient.post<unknown>(apiRoutes.courses.checkout(id), payload ?? {}),

  /** GET /api/subjects — user's enrolled subjects */
  getUserSubjects: () =>
    apiClient.get<Subject[]>(apiRoutes.subjects.list),

  /** GET /api/my-courses */
  getMyCourses: () =>
    apiClient.get<Subject[]>(apiRoutes.subjects.myCourses),
};

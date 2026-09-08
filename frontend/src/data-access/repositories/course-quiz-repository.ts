/**
 * Course quiz repository — REST implementation over apiClient + apiRoutes.
 *
 * NOTE (reconstruction): the original module in this path was untracked work
 * that was lost during the dead-code cleanup sweep (2026-08-27). It was
 * rebuilt from its sole live consumer (`src/hooks/use-course-quizzes.ts`)
 * against the live REST endpoints registered in `src/lib/api/routes.ts`
 * (`courses.quizzes` / `courses.quiz` / `courses.submitQuiz` /
 * `courses.quizResults`). Unlike the deleted gRPC/Connect layer this file
 * used to sit in, it depends only on the standard API stack.
 */
import { apiClient } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';
import type {
  CourseQuiz,
  CreateQuizPayload,
  QuizResult,
  QuizResultsSummary,
  SubmitQuizPayload,
  StartQuizResponse,
} from '@/types/course-quiz';

export const courseQuizRepository = {
  /** List all quizzes for a course. Lesson filtering belongs to getLessonQuizzes. */
  async getCourseQuizzes(courseId: string): Promise<CourseQuiz[]> {
    return apiClient.get<CourseQuiz[]>(apiRoutes.courses.quizzes(courseId));
  },

  /**
   * Fetch the quizzes attached to one lesson of a course.
   * Returns an array for transport compatibility; the domain invariant is
   * at most one quiz per lesson and the backend enforces it.
   */
  async getLessonQuizzes(courseId: string, lessonId: string): Promise<CourseQuiz[]> {
    return apiClient.get<CourseQuiz[]>(apiRoutes.courses.lessonQuizzes(courseId, lessonId));
  },

  /** Fetch a single quiz by id via the dedicated endpoint. */
  async getQuiz(courseId: string, quizId: string): Promise<CourseQuiz> {
    return apiClient.get<CourseQuiz>(apiRoutes.courses.quiz(courseId, quizId));
  },

  /** Fetch the current user's results for a quiz. */
  async getQuizResults(courseId: string, quizId: string): Promise<QuizResultsSummary> {
    return apiClient.get<QuizResultsSummary>(apiRoutes.courses.quizResults(courseId, quizId));
  },

  /** Create a quiz (teacher/admin). */
  async createQuiz(courseId: string, payload: CreateQuizPayload): Promise<CourseQuiz> {
    return apiClient.postJson<CourseQuiz>(apiRoutes.courses.quizzes(courseId), payload);
  },

  /** Update quiz configuration/questions (teacher/admin). */
  async updateQuiz(courseId: string, quizId: string, payload: Partial<CreateQuizPayload>): Promise<CourseQuiz> {
    return apiClient.patch<CourseQuiz>(apiRoutes.courses.quiz(courseId, quizId), payload);
  },

  /** Submit a quiz attempt; returns the graded result. */
  async submitQuiz(courseId: string, quizId: string, payload: SubmitQuizPayload): Promise<QuizResult> {
    return apiClient.postJson<QuizResult>(apiRoutes.courses.submitQuiz(courseId, quizId), payload);
  },

  async startQuiz(courseId: string, quizId: string): Promise<StartQuizResponse> {
    return apiClient.postJson<StartQuizResponse>(apiRoutes.courses.startQuiz(courseId, quizId), {});
  },
};

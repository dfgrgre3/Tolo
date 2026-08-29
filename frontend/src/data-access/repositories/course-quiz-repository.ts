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
  SubmitQuizPayload,
} from '@/types/course-quiz';

export const courseQuizRepository = {
  /** List quizzes for a course, optionally scoped to one lesson. */
  async getCourseQuizzes(courseId: string, lessonId?: string): Promise<CourseQuiz[]> {
    const quizzes = await apiClient.get<CourseQuiz[]>(apiRoutes.courses.quizzes(courseId));
    if (lessonId === undefined) return quizzes;
    return quizzes.filter((quiz) => quiz.lessonId === lessonId);
  },

  /**
   * Fetch the quizzes attached to one lesson of a course.
   * Returns an array (consumers take the first quiz of the lesson).
   */
  async getQuiz(courseId: string, lessonId: string): Promise<CourseQuiz[]> {
    const quizzes = await apiClient.get<CourseQuiz[]>(apiRoutes.courses.quizzes(courseId));
    return quizzes.filter((quiz) => quiz.lessonId === lessonId);
  },

  /** Fetch the current user's results for a quiz. */
  async getQuizResults(courseId: string, quizId: string): Promise<QuizResult[]> {
    return apiClient.get<QuizResult[]>(apiRoutes.courses.quizResults(courseId, quizId));
  },

  /** Create a quiz (teacher/admin). */
  async createQuiz(courseId: string, payload: CreateQuizPayload): Promise<CourseQuiz> {
    return apiClient.post<CourseQuiz>(apiRoutes.courses.quizzes(courseId), payload);
  },

  /** Submit a quiz attempt; returns the graded result. */
  async submitQuiz(courseId: string, quizId: string, payload: SubmitQuizPayload): Promise<QuizResult> {
    return apiClient.post<QuizResult>(apiRoutes.courses.submitQuiz(courseId, quizId), payload);
  },
};

/**
 * Exam Repository — fetch exams, submit answers, and retrieve results.
 * Synced with backend exam.go model.
 */
import { apiClient } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';
import type { Exam, ExamResult, SubmitExamPayload, SubmitExamResponse } from '@/types/exam';
import type { PaginatedResponse } from '@/types/api/responses';

// ────────────────────────────────────────────────────────────
// Repository
// ────────────────────────────────────────────────────────────

export const examRepository = {
  /** GET /api/exams — public list */
  getExams: (subjectId?: string) => {
    const url = subjectId
      ? `${apiRoutes.exams.list}?subjectId=${subjectId}`
      : apiRoutes.exams.list;
    return apiClient.get<PaginatedResponse<Exam> | Exam[]>(url);
  },

  /** GET /api/exams/results — user's exam results */
  getResults: (examId?: string) => {
    const url = examId
      ? `${apiRoutes.exams.results}?examId=${examId}`
      : apiRoutes.exams.results;
    return apiClient.get<ExamResult[]>(url);
  },

  /** POST /api/exams/:id/submit */
  submitExam: (id: string, payload: SubmitExamPayload) =>
    apiClient.post<SubmitExamResponse>(apiRoutes.exams.submit(id), payload),
};

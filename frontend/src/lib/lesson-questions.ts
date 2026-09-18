import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import type {
  InteractiveQuestion,
  QuestionAttemptRequest,
  QuestionAttemptVerdict,
} from "@/components/video/player/types";

/**
 * Server-validated interactive-question attempts (P0 server-trust fix).
 *
 * Protocol:
 *   Client answer (+ attemptId, lessonId, timestamp)
 *     → POST /api/courses/lessons/:lessonId/questions/:questionId/answer
 *     → Backend validates, records { attempt, answer, correctness, score,
 *       timestamp }, returns the authoritative verdict.
 *
 * Idempotency: `attemptId` is generated ONCE per presented question
 * (crypto.randomUUID) and sent both in the body and as the `Idempotency-Key`
 * header, so retry / reconnect / double-submit can never double-count.
 * The header form additionally opts the POST into api-client's retry path
 * (see retry-policy canRetryMethod).
 *
 * Backend contract required:
 * - MUST NOT return `correctOptionIndex` for unanswered server-mode questions.
 * - MUST validate (questionId, lessonId) ownership server-side; never trust
 *   the client's correctness claim.
 * - MUST dedupe on the idempotency key and replay the original verdict.
 */
export async function submitInteractiveAnswer(
  attempt: QuestionAttemptRequest,
): Promise<QuestionAttemptVerdict> {
  return apiClient.postJson<QuestionAttemptVerdict, Record<string, unknown>>(
    apiRoutes.courses.answerLessonQuestion(attempt.lessonId, attempt.questionId),
    {
      selectedOptionIndex: attempt.selectedOptionIndex,
      attemptId: attempt.attemptId,
      answeredAt: attempt.answeredAt,
    },
    {
      headers: { "Idempotency-Key": attempt.attemptId },
    },
  );
}

/** One attempt identity per question presentation — created when the overlay opens. */
export function newQuestionAttemptId(): string {
  return crypto.randomUUID();
}

/**
 * Student question list — answer key NEVER leaves the server.
 * Returns questions without `correctOptionIndex`, so the player resolves
 * them to server-validated mode automatically (see resolveQuestionValidation).
 * Throws when the backend does not implement the endpoint yet — callers must
 * fall back to embedded props questions instead of bricking playback.
 */
export async function fetchLessonQuestions(
  lessonId: string,
): Promise<InteractiveQuestion[]> {
  const data = await apiClient.get<unknown>(
    apiRoutes.courses.lessonInteractiveQuestions(lessonId),
  );
  const list = Array.isArray(data)
    ? data
    : (data as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) return [];
  return sanitizeQuestions(list as InteractiveQuestion[]);
}

/**
 * Defense in depth for embedded (props/payload) questions: any question that
 * is not EXPLICITLY formative loses its answer key client-side, forcing
 * server-validated mode. A leaked key in a payload can therefore never
 * silently become a locally-graded gate.
 */
export function sanitizeQuestions(
  questions: InteractiveQuestion[],
): InteractiveQuestion[] {
  return (questions ?? []).map((q) => {
    if (!q || typeof q !== "object") return q;
    if (q.validation === "formative") return q;
    if (q.correctOptionIndex === undefined) return q;
    const { correctOptionIndex: _dropped, ...rest } = q;
    return rest as InteractiveQuestion;
  });
}

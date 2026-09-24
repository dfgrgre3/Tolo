/**
 * Screening-question rules shared by the employer editor and the apply form.
 *
 * The constants mirror common.Job.validateQuestions exactly — the server stays
 * the authority, these exist so both forms fail fast with in-field feedback
 * instead of a rejected round-trip. If the backend limits move, move these.
 */
import type { JobQuestion } from '@/types/job';

export const JOB_QUESTIONS_MAX = 10;
export const JOB_QUESTION_PROMPT_MIN = 5;
export const JOB_QUESTION_PROMPT_MAX = 300;

/** Why a question row fails validation. The UI maps the key to a label. */
export type QuestionDraftError = 'tooShort' | 'tooLong' | 'duplicateId';

/**
 * Validates the employer's draft question set.
 *
 * Returns per-row errors keyed by row index (an empty object means the set is
 * submittable). Prompt length is measured after trimming, like the backend's
 * utf8 rune count — close enough for pre-submit feedback, and Arabic text
 * counts characters rather than bytes on both sides.
 */
export function validateQuestionDrafts(
  questions: readonly JobQuestion[]
): Record<number, QuestionDraftError> {
  const errors: Record<number, QuestionDraftError> = {};
  const seen = new Set<string>();

  questions.forEach((question, index) => {
    const promptLength = question.prompt.trim().length;
    if (promptLength < JOB_QUESTION_PROMPT_MIN) {
      errors[index] = 'tooShort';
      return;
    }
    if (promptLength > JOB_QUESTION_PROMPT_MAX) {
      errors[index] = 'tooLong';
      return;
    }
    if (seen.has(question.id)) {
      errors[index] = 'duplicateId';
      return;
    }
    seen.add(question.id);
  });

  return errors;
}

/**
 * Ids of required questions whose answer is missing or blank. The apply form
 * blocks on a non-empty result; optional questions are never reported.
 */
export function findMissingRequiredAnswers(
  questions: readonly JobQuestion[],
  answers: Record<string, string>
): string[] {
  return questions
    .filter((question) => question.required && !(answers[question.id] ?? '').trim())
    .map((question) => question.id);
}

/**
 * Builds the `answers` payload for the apply request: one trimmed entry per
 * question the seeker actually answered, keyed by question id.
 *
 * Only ids present in the job's current question set are collected — a stray
 * key in local state (e.g. a question the employer deleted while the form was
 * open) is dropped rather than stored as an orphan the employer can never
 * label.
 */
export function collectAnswers(
  questions: readonly JobQuestion[],
  answers: Record<string, string>
): Record<string, string> {
  const collected: Record<string, string> = {};
  for (const question of questions) {
    const value = (answers[question.id] ?? '').trim();
    if (value) collected[question.id] = value;
  }
  return collected;
}

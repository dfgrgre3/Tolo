import type {
  QuizSubmissionAnswer,
  QuizQuestion,
} from '@/types/course-quiz';

/**
 * Client-side answer helpers for the course quiz engine.
 * NOTE: no local grading. Objective questions are graded by the backend;
 * the client only prepares/normalizes questions and answers for submission.
 */

export function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** Options are automatically re-keyed per quiz attempt to avoid leaking correct answers. */
export function prepareQuestionForAttempt(
  question: QuizQuestion,
  shuffleOptions: boolean
): QuizQuestion {
  if (!question.options || question.options.length === 0) return question;
  const options = shuffleOptions ? shuffleArray(question.options) : [...question.options];
  // Re-key ids deterministically from the shuffled order so answers map correctly.
  const idMap = new Map<string, string>();
  const newOptions = options.map((opt, i) => {
    const newId = `${question.id}-opt-${i}`;
    idMap.set(opt.id, newId);
    return { ...opt, id: newId };
  });
  return { ...question, options: newOptions };
}

export function canAutoGrade(question: QuizQuestion): boolean {
  if (question.gradingMethod === 'manual') return false;
  if (question.type === 'ESSAY') return false;
  if (question.type === 'SHORT_ANSWER' && !question.referenceAnswer) return false;
  return true;
}

export function computeTotalPoints(questions: Pick<QuizQuestion, 'points'>[]): number {
  return questions.reduce((sum, q) => sum + (q.points || 0), 0);
}

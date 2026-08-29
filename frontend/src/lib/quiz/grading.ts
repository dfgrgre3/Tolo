import type {
  QuizAnswer,
  QuizQuestion,
} from '@/types/course-quiz';

/**
 * Client-side auto-grading for the course quiz engine.
 * Handles all objective question types. Essay/assignment questions are
 * flagged for manual / AI grading by the backend.
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

export function gradeQuestion(
  question: QuizQuestion,
  answer?: QuizAnswer
): { isCorrect: boolean; pointsEarned: number; feedback?: string } {
  if (!answer) {
    return { isCorrect: false, pointsEarned: 0 };
  }

  switch (question.type) {
    case 'MCQ_SINGLE':
    case 'TRUE_FALSE': {
      const selected = answer.selectedOptionIds?.[0];
      const correct = question.options.find((o) => o.isCorrect);
      if (!selected) return { isCorrect: false, pointsEarned: 0 };
      const isCorrect = !!correct && selected === correct.id;
      return {
        isCorrect,
        pointsEarned: isCorrect ? question.points : 0,
        feedback: isCorrect ? question.explanation : question.explanation,
      };
    }

    case 'MCQ_MULTIPLE': {
      const selected = new Set(answer.selectedOptionIds ?? []);
      const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
      const allCorrect =
        correctIds.length > 0 &&
        correctIds.every((id) => selected.has(id)) &&
        selected.size === correctIds.length;
      if (allCorrect) {
        return { isCorrect: true, pointsEarned: question.points, feedback: question.explanation };
      }
      // Partial credit
      if (question.partialCredit && correctIds.length > 0) {
        const matched = correctIds.filter((id) => selected.has(id)).length;
        const earned = Math.round((matched / correctIds.length) * question.points * 100) / 100;
        return { isCorrect: false, pointsEarned: earned, feedback: question.explanation };
      }
      return { isCorrect: false, pointsEarned: 0, feedback: question.explanation };
    }

    case 'MATCHING': {
      const matches = answer.matches ?? {};
      const pairs = question.matchPairs ?? [];
      if (pairs.length === 0) return { isCorrect: false, pointsEarned: 0 };
      // leftId `left-i` must map to its matching rightId `right-i`
      let correct = 0;
      for (let i = 0; i < pairs.length; i++) {
        const leftId = `${question.id}-left-${i}`;
        const rightId = `${question.id}-right-${i}`;
        if (matches[leftId] === rightId) correct++;
      }
      if (correct === pairs.length) {
        return { isCorrect: true, pointsEarned: question.points, feedback: question.explanation };
      }
      if (question.partialCredit) {
        const earned = Math.round((correct / pairs.length) * question.points * 100) / 100;
        return { isCorrect: false, pointsEarned: earned, feedback: question.explanation };
      }
      return { isCorrect: false, pointsEarned: 0, feedback: question.explanation };
    }

    case 'ORDERING': {
      const selected = answer.orderedItemIds ?? [];
      const items = question.orderItems ?? [];
      if (items.length === 0) return { isCorrect: false, pointsEarned: 0 };
      let correct = 0;
      for (let i = 0; i < items.length; i++) {
        if (selected[i] === items[i]) correct++;
      }
      if (correct === items.length) {
        return { isCorrect: true, pointsEarned: question.points, feedback: question.explanation };
      }
      if (question.partialCredit) {
        const earned = Math.round((correct / items.length) * question.points * 100) / 100;
        return { isCorrect: false, pointsEarned: earned, feedback: question.explanation };
      }
      return { isCorrect: false, pointsEarned: 0, feedback: question.explanation };
    }

    case 'FILL_BLANK': {
      const blanks = question.blanks ?? [];
      const answers = answer.blankAnswers ?? {};
      if (blanks.length === 0) return { isCorrect: false, pointsEarned: 0 };
      let correct = 0;
      for (let i = 0; i < blanks.length; i++) {
        const expected = blanks[i]!.trim().toLowerCase();
        const given = (answers[i] ?? '').trim().toLowerCase();
        if (question.caseSensitive) {
          if ((answers[i] ?? '').trim() === blanks[i]!.trim()) correct++;
        } else if (expected === given) {
          correct++;
        }
      }
      if (correct === blanks.length) {
        return { isCorrect: true, pointsEarned: question.points, feedback: question.explanation };
      }
      if (question.partialCredit) {
        const earned = Math.round((correct / blanks.length) * question.points * 100) / 100;
        return { isCorrect: false, pointsEarned: earned, feedback: question.explanation };
      }
      return { isCorrect: false, pointsEarned: 0, feedback: question.explanation };
    }

    case 'SHORT_ANSWER': {
      // Exact-match grading when there is a reference answer, otherwise manual/AI.
      const given = (answer.textAnswer ?? '').trim();
      const reference = (question.referenceAnswer ?? '').trim();
      if (reference) {
        const isCorrect =
          reference.toLowerCase() === given.toLowerCase();
        return {
          isCorrect,
          pointsEarned: isCorrect ? question.points : 0,
          feedback: question.explanation,
        };
      }
      return { isCorrect: false, pointsEarned: 0, feedback: question.explanation };
    }

    case 'ESSAY':
    default:
      // Requires manual / AI grading
      return { isCorrect: false, pointsEarned: 0, feedback: question.explanation };
  }
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

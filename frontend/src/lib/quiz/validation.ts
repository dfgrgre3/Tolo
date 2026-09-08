import type { QuizQuestion } from "@/types/course-quiz";

export type QuizValidationIssue = { questionId: string; message: string };

/** Validate the shape required by the course-quiz API before persistence. */
export function validateQuizQuestions(questions: QuizQuestion[]): QuizValidationIssue[] {
  const issues: QuizValidationIssue[] = [];
  for (const question of questions) {
    const fail = (message: string) => issues.push({ questionId: question.id, message });
    const options = question.options ?? [];
    const correctOptions = options.filter((option) => option.isCorrect);

    switch (question.type) {
      case "MCQ_SINGLE":
        if (options.length < 2) fail("MCQ_SINGLE يحتاج خيارين على الأقل");
        if (correctOptions.length !== 1) fail("MCQ_SINGLE يجب أن يحتوي إجابة صحيحة واحدة فقط");
        break;
      case "MCQ_MULTIPLE":
        if (options.length < 2) fail("MCQ_MULTIPLE يحتاج خيارين على الأقل");
        if (correctOptions.length < 1) fail("MCQ_MULTIPLE يحتاج إجابة صحيحة واحدة على الأقل");
        break;
      case "TRUE_FALSE":
        if (options.length !== 2) fail("TRUE_FALSE يجب أن يحتوي خيارين بالضبط");
        if (correctOptions.length !== 1) fail("TRUE_FALSE يجب أن يحتوي إجابة صحيحة واحدة فقط");
        break;
      case "FILL_BLANK": {
        const blankCount = (question.text.match(/___+/g) ?? []).length;
        if (!question.blanks?.length || question.blanks.length !== blankCount) {
          fail("عدد إجابات FILL_BLANK يجب أن يطابق عدد الفراغات");
        }
        break;
      }
      case "ORDERING": {
        const items = question.orderItems ?? [];
        if (items.length < 2 || new Set(items).size !== items.length) {
          fail("ORDERING يحتاج عناصر مرتبة وفريدة");
        }
        break;
      }
      case "MATCHING":
        if (!question.matchPairs?.length || question.matchPairs.some((pair) => !pair.left.trim() || !pair.right.trim())) {
          fail("MATCHING يحتاج أزواج ربط صالحة");
        }
        break;
      case "SHORT_ANSWER":
        if (question.gradingMethod !== "manual" && !question.referenceAnswer?.trim()) {
          fail("SHORT_ANSWER يحتاج referenceAnswer للتصحيح الآلي");
        }
        break;
      case "ESSAY":
        if (!question.text.trim()) fail("ESSAY يحتاج نص السؤال");
        break;
    }
  }
  return issues;
}

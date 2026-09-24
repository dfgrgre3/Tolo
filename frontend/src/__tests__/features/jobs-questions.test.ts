import { describe, it, expect } from 'vitest';
import {
  JOB_QUESTION_PROMPT_MAX,
  collectAnswers,
  findMissingRequiredAnswers,
  validateQuestionDrafts,
} from '@/features/jobs/questions';
import type { JobQuestion } from '@/types/job';

/**
 * قواعد أسئلة التقديم — تطابق validateQuestions في الخادم حرفيًا لأن أي فجوة
 * بينهما تعني إما حفظًا مرفوضًا فاجأ صاحب العمل، أو طلبًا مرفوضًا فاجأ
 * المتقدم.
 */

const question = (overrides: Partial<JobQuestion> = {}): JobQuestion => ({
  id: 'q1',
  prompt: 'سؤال صالح يتجاوز الحد الأدنى',
  ...overrides,
});

describe('validateQuestionDrafts', () => {
  it('يقبل مجموعة فارغة ومجموعة صالحة', () => {
    expect(validateQuestionDrafts([])).toEqual({});
    expect(validateQuestionDrafts([question()])).toEqual({});
  });

  it('يرفض نصًا يقل عن خمسة أحرف بعد التهذيب', () => {
    expect(validateQuestionDrafts([question({ prompt: '  قصير  ' })])).toEqual({
      0: 'tooShort',
    });
    expect(validateQuestionDrafts([question({ prompt: '     ' })])).toEqual({
      0: 'tooShort',
    });
  });

  it('يرفض نصًا يتجاوز الحد الأقصى ويقبل الحد نفسه', () => {
    const tooLong = question({ prompt: 'س'.repeat(JOB_QUESTION_PROMPT_MAX + 1) });
    const atLimit = question({ prompt: 'س'.repeat(JOB_QUESTION_PROMPT_MAX) });
    expect(validateQuestionDrafts([tooLong])).toEqual({ 0: 'tooLong' });
    expect(validateQuestionDrafts([atLimit])).toEqual({});
  });

  it('يرفض تكرار المعرّف لأن الإجابات تُخزَّن بمفتاحه', () => {
    const rows = [question({ id: 'same' }), question({ id: 'same' })];
    expect(validateQuestionDrafts(rows)).toEqual({ 1: 'duplicateId' });
  });

  it('يحدد الصف المخالف بالفهرس دون غيره', () => {
    const rows = [question({ id: 'a' }), question({ id: 'b', prompt: 'قص' })];
    expect(validateQuestionDrafts(rows)).toEqual({ 1: 'tooShort' });
  });
});

describe('findMissingRequiredAnswers', () => {
  const questions = [
    question({ id: 'req', required: true }),
    question({ id: 'opt', required: false }),
  ];

  it('يُبلغ عن الإلزامية الفارغة فقط', () => {
    expect(findMissingRequiredAnswers(questions, {})).toEqual(['req']);
    expect(findMissingRequiredAnswers(questions, { req: '  ' })).toEqual(['req']);
  });

  it('يقبل الإجابة المهذّبة ولا يبالي بالاختيارية الفارغة', () => {
    expect(
      findMissingRequiredAnswers(questions, { req: '  خمس سنوات  ' })
    ).toEqual([]);
  });
});

describe('collectAnswers', () => {
  it('يهذب الإجابات ويسقط الفارغ منها', () => {
    const questions = [question({ id: 'a' }), question({ id: 'b' })];
    expect(collectAnswers(questions, { a: '  نص  ', b: '   ' })).toEqual({ a: 'نص' });
  });

  it('يسقط المفاتيح التي لم تعد أسئلة في الوظيفة', () => {
    // سؤال حذفه صاحب العمل والنموذج ما زال مفتوحًا لا يجب أن يُخزَّن يتيمًا.
    const questions = [question({ id: 'a' })];
    expect(collectAnswers(questions, { a: 'موجود', ghost: 'محذوف' })).toEqual({
      a: 'موجود',
    });
  });

  it('يعيد خريطة فارغة عندما لا توجد إجابات', () => {
    expect(collectAnswers([question({ id: 'a' })], {})).toEqual({});
  });
});

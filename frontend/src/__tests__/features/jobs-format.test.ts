import { describe, it, expect } from 'vitest';
import {
  formatAnswerValue,
  formatApplicationAnswers,
  formatLocation,
  formatMatchScore,
  formatSalary,
} from '@/features/jobs/format';
import { isTerminalApplicationStatus, APPLICATION_TIMELINE } from '@/types/job';
import type { Job } from '@/types/job';

/**
 * اختبارات وحدة الوظائف — التركيز على القواعد التي لو انكسرت لعرضت
 * معلومات خاطئة للمستخدم (الراتب، الموقع، حالة الطلب).
 */

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    companyId: 'company-1',
    title: 'Frontend Engineer',
    slug: 'frontend-engineer',
    description: '',
    skills: [],
    employmentType: 'FULL_TIME',
    workplaceType: 'REMOTE',
    experienceLevel: 'MID',
    salaryCurrency: 'EGP',
    salaryPeriod: 'MONTHLY',
    isSalaryVisible: true,
    status: 'PUBLISHED',
    isFeatured: false,
    viewCount: 0,
    applicationCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isSaved: false,
    hasApplied: false,
    isApplyOpen: true,
    ...overrides,
  };
}

describe('formatSalary', () => {
  it('يُخفي الراتب عندما يختار صاحب العمل عدم إعلانه', () => {
    // حتى لو كانت القيم موجودة في الصف، احترام isSalaryVisible إلزامي:
    // كشفها هنا يسرّب بيانات اختار صاحب العمل إخفاءها.
    const job = makeJob({ isSalaryVisible: false, salaryMin: 10000, salaryMax: 20000 });
    expect(formatSalary(job)).toBeNull();
  });

  it('يعيد null عندما لا يوجد راتب مُسجّل', () => {
    expect(formatSalary(makeJob({ salaryMin: null, salaryMax: null }))).toBeNull();
  });

  it('يعرض نطاقًا عند وجود حدّين مختلفين', () => {
    const result = formatSalary(makeJob({ salaryMin: 10000, salaryMax: 20000 }));
    expect(result).toBeTruthy();
    expect(result).toContain('–');
  });

  it('يعرض قيمة واحدة عندما يتساوى الحدّان', () => {
    const result = formatSalary(makeJob({ salaryMin: 15000, salaryMax: 15000 }));
    expect(result).toBeTruthy();
    expect(result).not.toContain('–');
  });

  it('يتعامل مع القيم النصية القادمة من numeric في قاعدة البيانات', () => {
    // نوع numeric(19,4) في Postgres يصل أحيانًا كنص لا كرقم.
    const result = formatSalary(makeJob({ salaryMin: '12000.0000', salaryMax: null }));
    expect(result).toBeTruthy();
    expect(result).toContain('من');
  });

  it('لا ينهار مع رمز عملة غير معروف لدى Intl', () => {
    const result = formatSalary(
      makeJob({ salaryMin: 5000, salaryMax: null, salaryCurrency: 'XYZ' })
    );
    expect(result).toBeTruthy();
    expect(result).toContain('XYZ');
  });
});

describe('formatLocation', () => {
  it('يدمج المدينة والدولة', () => {
    expect(formatLocation({ city: 'القاهرة', country: 'مصر' })).toBe('القاهرة، مصر');
  });

  it('يتجاهل الجزء المفقود بدل ترك فاصلة معلّقة', () => {
    expect(formatLocation({ city: null, country: 'مصر' })).toBe('مصر');
    expect(formatLocation({ city: 'القاهرة', country: null })).toBe('القاهرة');
  });

  it('يعيد null عندما لا يوجد موقع', () => {
    expect(formatLocation({ city: null, country: null })).toBeNull();
  });
});

describe('حالات الطلب النهائية', () => {
  it('تمنع السحب بعد التعيين أو الرفض أو السحب المسبق', () => {
    expect(isTerminalApplicationStatus('HIRED')).toBe(true);
    expect(isTerminalApplicationStatus('REJECTED')).toBe(true);
    expect(isTerminalApplicationStatus('WITHDRAWN')).toBe(true);
  });

  it('تسمح بالسحب أثناء مراحل المعالجة', () => {
    expect(isTerminalApplicationStatus('APPLIED')).toBe(false);
    expect(isTerminalApplicationStatus('INTERVIEW')).toBe(false);
    expect(isTerminalApplicationStatus('OFFER')).toBe(false);
  });

  it('لا يحتوي المسار الزمني على الحالات النهائية السلبية', () => {
    // REJECTED / WITHDRAWN ينهيان المسار ولا يمثّلان خطوة داخله.
    expect(APPLICATION_TIMELINE).not.toContain('REJECTED');
    expect(APPLICATION_TIMELINE).not.toContain('WITHDRAWN');
    expect(APPLICATION_TIMELINE[0]).toBe('APPLIED');
  });
});

describe('formatMatchScore', () => {
  it('لا يعرض شيئًا عندما لا يوجد تقييم', () => {
    // الخادم يرسل النسبة للمسجّلين فقط؛ الغياب ليس "صفر توافق".
    expect(formatMatchScore(undefined)).toBeNull();
    expect(formatMatchScore(null)).toBeNull();
  });

  it('لا يعرض صفرًا لأنها ليست إشارة توافق', () => {
    expect(formatMatchScore(0)).toBeNull();
    // 0.4 تقريبها صفر، فلا معنى لعرض "توافق 0٪".
    expect(formatMatchScore(0.4)).toBeNull();
  });

  it('يعرض نسبة مقرّبة بين ١ و ١٠٠', () => {
    expect(formatMatchScore(95)).toBe('توافق 95٪');
    expect(formatMatchScore(87.6)).toBe('توافق 88٪');
    expect(formatMatchScore(100)).toBe('توافق 100٪');
  });

  it('يرفض ما يتجاوز ١٠٠ لأنه ليس نسبة ممكنة', () => {
    // قيمة كهذه خطأ في الخادم، وطبعها يعني الإخبار برقم غير صحيح.
    expect(formatMatchScore(101)).toBeNull();
    expect(formatMatchScore(150)).toBeNull();
    expect(formatMatchScore(Number.NaN)).toBeNull();
    expect(formatMatchScore(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('formatApplicationAnswers', () => {
  it('يبني صفوفًا بترتيب المفاتيح الوارد من الخادم', () => {
    const rows = formatApplicationAnswers({ q1: 'خمس سنوات', q2: 'أعمل عن بُعد' });
    expect(rows).toEqual([
      { id: 'q1', answer: 'خمس سنوات' },
      { id: 'q2', answer: 'أعمل عن بُعد' },
    ]);
  });

  it('يحلّ نص السؤال وعلم الإلزام من مجموعة أسئلة الوظيفة', () => {
    const rows = formatApplicationAnswers(
      { q1: 'خمس سنوات', q2: 'أعمل عن بُعد' },
      [
        { id: 'q1', prompt: 'كم سنة خبرة لديك؟', required: true },
        { id: 'q2', prompt: 'هل يمكنك العمل عن بُعد؟' },
      ]
    );
    expect(rows).toEqual([
      { id: 'q1', answer: 'خمس سنوات', prompt: 'كم سنة خبرة لديك؟', required: true },
      { id: 'q2', answer: 'أعمل عن بُعد', prompt: 'هل يمكنك العمل عن بُعد؟', required: false },
    ]);
  });

  it('يُبقي المعرّف وحده عندما يكون السؤال قد حُذف بعد التقديم', () => {
    // الإجابة تبقى مرئية بمعرّفها بدل أن تختفي أو تُنسب لسؤال آخر.
    const rows = formatApplicationAnswers(
      { deleted: 'إجابة محفوظة' },
      [{ id: 'other', prompt: 'سؤال آخر باقٍ' }]
    );
    expect(rows).toEqual([{ id: 'deleted', answer: 'إجابة محفوظة' }]);
  });

  it('يتجاوز الأسئلة غير المُجابة بدل عرض صف فارغ', () => {
    const rows = formatApplicationAnswers({
      q1: null,
      q2: '',
      q3: '   ',
      q4: [],
      q5: 'إجابة',
    });
    expect(rows).toEqual([{ id: 'q5', answer: 'إجابة' }]);
  });

  it('يعيد قائمة فارغة عند غياب الإجابات', () => {
    expect(formatApplicationAnswers(null)).toEqual([]);
    expect(formatApplicationAnswers(undefined)).toEqual([]);
    expect(formatApplicationAnswers({})).toEqual([]);
  });

  it('يترجم القيم المنطقية إلى نعم/لا', () => {
    expect(formatAnswerValue(true)).toBe('نعم');
    expect(formatAnswerValue(false)).toBe('لا');
  });

  it('يحفظ الأرقام والنصوص كما هي لأنها قد تكون معرّفات', () => {
    // تحويل الأرقام إلى أرقام عربية قد يحرّف معرّفًا أو رقم هاتف.
    expect(formatAnswerValue(1000)).toBe('1000');
    expect(formatAnswerValue('+201000000000')).toBe('+201000000000');
  });

  it('يدمج المصفوفات بفاصلة عربية ويتجاهل عناصرها الفارغة', () => {
    expect(formatAnswerValue(['React', 'Vue'])).toBe('React، Vue');
    expect(formatAnswerValue(['React', null, ''])).toBe('React');
  });

  it('يسلسل الكائن غير المتوقع بدل إخفاء إجابة قدّمها المتقدم', () => {
    expect(formatAnswerValue({ years: 5 })).toBe('{"years":5}');
  });

  it('يعيد null للقيم غير القابلة للعرض', () => {
    expect(formatAnswerValue(null)).toBeNull();
    expect(formatAnswerValue(undefined)).toBeNull();
    expect(formatAnswerValue(Number.NaN)).toBeNull();
  });
});

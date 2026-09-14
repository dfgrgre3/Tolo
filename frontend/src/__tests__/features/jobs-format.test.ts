import { describe, it, expect } from 'vitest';
import { formatLocation, formatSalary } from '@/features/jobs/format';
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

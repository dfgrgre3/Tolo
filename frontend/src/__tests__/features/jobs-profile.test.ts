import { beforeEach, describe, expect, it } from 'vitest';
import type { UserProfileData } from '@/app/(dashboard)/profile/_components/useProfileData';
import {
  buildProfileRows,
  isValidHttpUrl,
  loadResumeUrl,
  prefillApplyForm,
  saveResumeUrl,
} from '@/features/jobs/profile';

/**
 * اختبارات منطق الملف الوظيفي: أي حقول تظهر في الملخص الذي يقرؤه المستخدم
 * قبل التقديم، وما الذي يبدأ به نموذج التقديم. كلاهما يمنع خطأ صامتًا —
 * حقل ينقص أو رابط خبيث يدخل النموذج.
 */

function makeProfile(overrides: Partial<UserProfileData> = {}): UserProfileData {
  return {
    id: 'user-1',
    email: 'seeker@example.com',
    username: null,
    name: 'سارة أحمد',
    avatar: null,
    phone: '01000000000',
    phoneVerified: true,
    emailVerified: true,
    gradeLevel: null,
    educationType: null,
    section: null,
    bio: null,
    country: null,
    city: null,
    gender: null,
    school: null,
    alternativePhone: null,
    dateOfBirth: null,
    studyGoal: null,
    subjectsTaught: null,
    experienceYears: null,
    mfaEnabled: false,
    ...overrides,
  };
}

describe('prefillApplyForm', () => {
  it('يترك الحقول فارغة عند غياب الملف', () => {
    const empty = { email: '', phone: '', resumeUrl: '' };
    expect(prefillApplyForm(null)).toEqual(empty);
    expect(prefillApplyForm(undefined)).toEqual(empty);
  });

  it('ينقل البريد والهاتف كما هما', () => {
    const prefill = prefillApplyForm(makeProfile());
    expect(prefill.email).toBe('seeker@example.com');
    expect(prefill.phone).toBe('01000000000');
  });

  it('يحول هاتف null إلى فراغ حتى لا يدخل null إلى الحقل', () => {
    expect(prefillApplyForm(makeProfile({ phone: null })).phone).toBe('');
    expect(prefillApplyForm(makeProfile({ phone: null })).email).toBe('seeker@example.com');
  });

  it('يرفع رابط السيرة الممرَّر من التخزين المحلي', () => {
    expect(prefillApplyForm(makeProfile(), 'https://cv.example/cv.pdf').resumeUrl).toBe(
      'https://cv.example/cv.pdf'
    );
    // بلا ممرِّد (تخزين فارغ) يبقى الحقل فارغًا كما قبل.
    expect(prefillApplyForm(makeProfile()).resumeUrl).toBe('');
  });
});
describe('buildProfileRows', () => {
  it('يعيد صفوفًا فارغة بلا ملف', () => {
    expect(buildProfileRows(null)).toEqual([]);
    expect(buildProfileRows(undefined)).toEqual([]);
  });

  it('يضيف حقول الاتصال ويتجاوز الفارغة والمسافات', () => {
    const rows = buildProfileRows(makeProfile({ bio: '   ', school: null }));
    // البريد والهاتف فقط: باقي الحقول في الإعداد الافتراضي null.
    expect(rows.map((row) => row.id)).toEqual(['email', 'phone']);
  });

  it('يحوّل رموز التعليم إلى تسميات عربية', () => {
    const rows = buildProfileRows(
      makeProfile({ gradeLevel: 'THIRD_SECONDARY', educationType: 'IG', section: 'SCIENTIFIC' })
    );
    const byId = Object.fromEntries(rows.map((row) => [row.id, row.value]));
    expect(byId.gradeLevel).toBe('الثالث الثانوي');
    expect(byId.educationType).toBe('إنجليزي (IG)');
    expect(byId.section).toBe('علمي');
  });

  it('يترك قيمة غير معروفة كما هي بدل إخفائها', () => {
    // رمز من إصدار أحدث من واجهة العرض لا يجب أن يختفي من الملخص.
    const rows = buildProfileRows(makeProfile({ gradeLevel: 'value-from-the-future' }));
    expect(rows.find((row) => row.id === 'gradeLevel')?.value).toBe('value-from-the-future');
  });

  it('يدمج المدينة مع الدولة ويربط المواد بفاصلة عربية', () => {
    const rows = buildProfileRows(
      makeProfile({ city: 'القاهرة', country: 'EG', subjectsTaught: ['رياضيات', 'فيزياء'] })
    );
    const byId = Object.fromEntries(rows.map((row) => [row.id, row.value]));
    expect(byId.location).toBe('القاهرة، مصر');
    expect(byId.subjects).toBe('رياضيات، فيزياء');
  });

  it('لا يعرض تاريخ الميلاد أو النوع الاجتماعي', () => {
    // بيانات شخصية لا مكان لها في ملخص يُقرأ في سياق التوظيف.
    const rows = buildProfileRows(makeProfile({ gender: 'female', dateOfBirth: '2000-01-01' }));
    const ids = rows.map((row) => row.id);
    expect(ids).not.toContain('gender');
    expect(ids).not.toContain('dateOfBirth');
  });
});

describe('isValidHttpUrl', () => {
  it('يقبل http و https والقيمة الفارغة (الحقل اختياري)', () => {
    expect(isValidHttpUrl('https://example.com/cv.pdf')).toBe(true);
    expect(isValidHttpUrl('http://example.com')).toBe(true);
    expect(isValidHttpUrl('')).toBe(true);
  });

  it('يرفض البروتوكولات الخبيثة والقيم غير الرابطة', () => {
    // new URL يقبل javascript: ناجحًا — الرفض هنا يجب أن يكون صريحًا.
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isValidHttpUrl('not a url')).toBe(false);
  });
});

describe('تخزين السيرة الذاتية المحلي', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('يحفظ الرابط مقصوصًا ويستعيده', () => {
    expect(loadResumeUrl()).toBe('');
    saveResumeUrl('  https://example.com/cv.pdf  ');
    expect(loadResumeUrl()).toBe('https://example.com/cv.pdf');
  });

  it('القيمة الفارغة تمسح الرابط المحفوظ', () => {
    saveResumeUrl('https://example.com/cv.pdf');
    saveResumeUrl('');
    expect(loadResumeUrl()).toBe('');
  });
});

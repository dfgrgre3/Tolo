import { describe, it, expect } from 'vitest';
import {
  buildActiveFilterChips,
  parseFilters,
  prettifyFilterValue,
  removeFilterChip,
  serialiseFilters,
  type ActiveFilterChip,
} from '@/features/jobs/search-params';
import type { JobSearchParams } from '@/services/api/contracts-jobs-service';

/**
 * اختبارات منطق الرابط في صفحة البحث.
 *
 * الحالة كلها تعيش في الرابط، فأي خطأ هنا يعني رابطًا مشتركًا يفتح بحثًا
 * مختلفًا عمّا رآه المستخدم، أو فلترًا لا يمكن إزالته. التركيز على القواعد
 * التي تحمي هذين الأمرين.
 */

const parse = (query: string): JobSearchParams => parseFilters(new URLSearchParams(query));

/** يجعل الاختبارات مستقلة عن ترتيب الشرائح بإيجاد الشريحة بالحقل. */
function chipFor(filters: JobSearchParams, field: string): ActiveFilterChip {
  const chip = buildActiveFilterChips(filters, {
    categories: { engineering: 'الهندسة' },
    companies: { 'company-1': 'شركة النيل' },
  }).find((item) => item.field === field);
  if (!chip) throw new Error(`لا توجد شريحة للحقل ${field}`);
  return chip;
}

describe('parseFilters / serialiseFilters', () => {
  it('يحفظ الفئات والشركات عبر دورة كاملة في الرابط', () => {
    const filters: JobSearchParams = {
      category: ['engineering', 'design'],
      company: ['company-1', 'company-2'],
      remote: true,
    };
    expect(parse(serialiseFilters(filters))).toEqual(filters);
  });

  it('يتجاهل الفلاتر الفارغة فلا تظهر في الرابط', () => {
    expect(
      serialiseFilters({
        keyword: '',
        jobType: [],
        category: [],
        salaryMin: undefined,
        page: undefined,
      })
    ).toBe('');
  });

  it('يعامل remote كـ true فقط', () => {
    expect(parse('remote=true')).toEqual({ remote: true });
    // "false" يعني "غير مفعّل"، وليس قيمة معطّلة تُرسل إلى الخادم.
    expect(parse('remote=false')).toEqual({});
    expect(serialiseFilters({ remote: false })).toBe('');
  });

  it('يتجاهل الأرقام غير الصالحة والترتيب غير المعروف', () => {
    expect(parse('salaryMin=abc')).toEqual({});
    expect(parse('sort=random')).toEqual({});
    expect(parse('sort=newest')).toEqual({ sort: 'newest' });
  });

  it('يقرأ القيم المتعددة المفصولة بفواصل', () => {
    expect(parse('category=engineering,design').category).toEqual(['engineering', 'design']);
  });
});
describe('buildActiveFilterChips', () => {
  it('لا ينتج شرائح بدون فلاتر', () => {
    expect(buildActiveFilterChips({})).toEqual([]);
  });

  it('يبني شريحة لكل قيمة في الفلاتر المصفوفية', () => {
    const chips = buildActiveFilterChips({ jobType: ['FULL_TIME'], skills: ['React'] });
    expect(chips.map((chip) => chip.label)).toEqual(['دوام كامل', 'React']);
    expect(chips.map((chip) => chip.id)).toEqual(['jobType:FULL_TIME', 'skills:React']);
  });

  it('يستخدم التسمية الديناميكية للفئة ويسقط على قيمة منظّفة عند غيابها', () => {
    // الفئة مملوكة للبيانات: رابط قديم قد يحمل فئة لم تعد قائمة في الواجهة.
    const chips = buildActiveFilterChips(
      { category: ['engineering', 'data-science'] },
      { categories: { engineering: 'الهندسة' } }
    );
    expect(chips.map((chip) => chip.label)).toEqual(['الهندسة', 'data science']);
  });

  it('يعرض اسم الشركة من التسميات ويسقط على معرّف مختصر', () => {
    const chips = buildActiveFilterChips(
      { company: ['company-1', '01234567-89ab-cdef'] },
      { companies: { 'company-1': 'شركة النيل' } }
    );
    expect(chips.map((chip) => chip.label)).toEqual(['شركة النيل', '01234567']);
  });

  it('يصوغ الفلاتر المفردة بصيغة مفهومة', () => {
    const chips = buildActiveFilterChips({
      keyword: 'React',
      location: 'القاهرة',
      remote: true,
      salaryMin: 10000,
      salaryMax: 20000,
      datePosted: 7,
    });
    expect(chips.map((chip) => chip.label)).toEqual([
      'React',
      'القاهرة',
      'عن بُعد فقط',
      'الراتب من 10000',
      'الراتب حتى 20000',
      'آخر 7 أيام',
    ]);
  });

  it('لا ينتج شرائح للترتيب أو رقم الصفحة', () => {
    // الترتيب له قائمة تُظهر قيمتها بنفسها، ورقم الصفحة تنقّل لا فلتر.
    expect(buildActiveFilterChips({ sort: 'newest', page: 3 })).toEqual([]);
  });
});

describe('removeFilterChip', () => {
  it('يحذف قيمة واحدة ويُبقي بقية القيم', () => {
    const filters: JobSearchParams = { category: ['engineering', 'design', 'sales'] };
    const next = removeFilterChip(filters, chipFor(filters, 'category'));
    expect(next.category).toEqual(['design', 'sales']);
  });

  it('يحذف المفتاح بالكامل عند إزالة آخر قيمة', () => {
    const filters: JobSearchParams = { company: ['company-1'] };
    const next = removeFilterChip(filters, chipFor(filters, 'company'));
    // مصفوفة فارغة تعني "فلتر مفعّل" في الرابط، لذا يجب أن يختفي المفتاح.
    expect(next.company).toBeUndefined();
  });

  it('يمسح الفلاتر المفردة', () => {
    const filters: JobSearchParams = { keyword: 'React', remote: true, salaryMin: 5000 };
    expect(removeFilterChip(filters, chipFor(filters, 'keyword')).keyword).toBeUndefined();
    expect(removeFilterChip(filters, chipFor(filters, 'remote')).remote).toBeUndefined();
    expect(removeFilterChip(filters, chipFor(filters, 'salaryMin')).salaryMin).toBeUndefined();
  });

  it('يعيد الترقيم إلى الصفحة الأولى', () => {
    // صفحة سابعة لمجموعة نتائج تقلّصت تعني قائمة فارغة بلا سبب ظاهر.
    const filters: JobSearchParams = { keyword: 'React', page: 4 };
    expect(removeFilterChip(filters, chipFor(filters, 'keyword')).page).toBeUndefined();
  });

  it('لا يمس الفلاتر الأخرى', () => {
    const filters: JobSearchParams = { keyword: 'React', remote: true, jobType: ['FULL_TIME'] };
    const next = removeFilterChip(filters, chipFor(filters, 'jobType'));
    expect(next.keyword).toBe('React');
    expect(next.remote).toBe(true);
    expect(next.jobType).toBeUndefined();
  });
});

describe('prettifyFilterValue', () => {
  it('يحوّل الشرطات إلى مسافات بدل إظهار slug خام', () => {
    expect(prettifyFilterValue('data-science')).toBe('data science');
    expect(prettifyFilterValue('customer_support')).toBe('customer support');
    expect(prettifyFilterValue('engineering')).toBe('engineering');
  });
});

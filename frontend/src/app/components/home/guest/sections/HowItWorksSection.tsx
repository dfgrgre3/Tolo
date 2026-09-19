import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, SECTION } from '../design-system';

const STEPS = [
  {
    step: '01',
    title: 'إنشاء حساب مجاني',
    desc: 'سجل حسابك في ثوانٍ معدودة واستكشف الدروس والكورسات المتاحة.',
    color: 'bg-emerald-50 text-[#0F766E] dark:bg-emerald-500/15 dark:text-emerald-400',
  },
  {
    step: '02',
    title: 'اختر كورسك المناسب',
    desc: 'تصفح المجالات المختلفة واختر الدورة التي تتوافق مع أهدافك المهنية.',
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  },
  {
    step: '03',
    title: 'تعلّم وتدرّب',
    desc: 'شاهد الدروس وحل الاختبارات التفاعلية لتأكيد استيعابك.',
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  },
  {
    step: '04',
    title: 'احصل على شهادتك',
    desc: 'عند إكمال الكورس بنجاح، احصل على شهادة إنجاز قابلة للمشاركة.',
    color: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
  },
];

export function HowItWorksSection() {
  return (
    <section className={SECTION.padding}>
      <div className={CONTAINER.className}>
        <div className={SECTION_HEADER.center}>
          <h2 className={TYPOGRAPHY.sectionHeading}>كيف تتعلم وتنجح معنا؟</h2>
          <p className={TYPOGRAPHY.sectionSubheading}>
            4 خطوات بسيطة تفصلك عن تطوير مهاراتك
          </p>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        <div className="hidden lg:block absolute top-[3rem] right-[calc(25%+1rem)] left-[calc(25%+1rem)] h-0.5 bg-gradient-to-l from-[#0F766E] via-emerald-300 to-[#0F766E] opacity-30" />

        {STEPS.map((item) => (
          <div
            key={item.step}
            className="relative bg-white border border-[#E2E8F0] p-4 rounded-[12px] hover:border-[#0F766E] hover:shadow-md transition-all duration-150 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-orange-500/50"
          >
            <div
              className={`h-11 w-11 rounded-xl ${item.color} flex items-center justify-center mb-3 font-black text-base`}
            >
              {item.step}
            </div>
            <h3 className="text-sm font-bold text-[#1E293B] mb-1.5 dark:text-white">{item.title}</h3>
            <p className="text-xs text-[#64748B] leading-relaxed font-medium dark:text-slate-400">{item.desc}</p>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    step: '01',
    title: 'إنشاء حساب مجاني',
    desc: 'سجل حسابك في ثوانٍ معدودة واستكشف الدروس والكورسات المتاحة.',
    color: 'bg-emerald-50 text-[#0F766E]',
  },
  {
    step: '02',
    title: 'اختر كورسك المناسب',
    desc: 'تصفح المجالات المختلفة واختر الدورة التي تتوافق مع أهدافك المهنية.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    step: '03',
    title: 'تعلّم وتدرّب',
    desc: 'شاهد الدروس وحل الاختبارات التفاعلية لتأكيد استيعابك.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    step: '04',
    title: 'احصل على شهادتك',
    desc: 'عند إكمال الكورس بنجاح، احصل على شهادة إنجاز قابلة للمشاركة.',
    color: 'bg-purple-50 text-purple-600',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B]">كيف تتعلم وتنجح معنا؟</h2>
        <p className="text-sm text-[#64748B] font-medium mt-2">
          4 خطوات بسيطة تفصلك عن تطوير مهاراتك
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        <div className="hidden lg:block absolute top-[3.25rem] right-[calc(25%+1.5rem)] left-[calc(25%+1.5rem)] h-0.5 bg-gradient-to-l from-[#0F766E] via-emerald-300 to-[#0F766E] opacity-30" />

        {STEPS.map((item) => (
          <div
            key={item.step}
            className="relative bg-white border border-[#E2E8F0] p-6 rounded-[16px] hover:border-[#0F766E] hover:shadow-md"
          >
            <div
              className={`h-12 w-12 rounded-xl ${item.color} flex items-center justify-center mb-4 font-black text-lg`}
            >
              {item.step}
            </div>
            <h3 className="text-base font-bold text-[#1E293B] mb-2">{item.title}</h3>
            <p className="text-xs text-[#64748B] leading-relaxed font-medium">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

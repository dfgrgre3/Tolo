import { Shield, Globe, TrendingUp, Users } from 'lucide-react';
import { CONTAINER, TYPOGRAPHY, SECTION_HEADER, SECTION } from '../design-system';

const VALUE_PROPS = [
  {
    icon: Shield,
    color: 'bg-emerald-50 text-[#0F766E] dark:bg-emerald-500/15 dark:text-emerald-400',
    title: 'شهادات معتمدة',
    desc: 'احصل على شهادة إتمام معتمدة عند إكمال كل دورة، قابلة للمشاركة على LinkedIn.',
  },
  {
    icon: Globe,
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    title: 'محتوى عربي أصيل',
    desc: 'جميع الدورات باللغة العربية الفصحى، مصممة خصيصاً للمتعلم العربي.',
  },
  {
    icon: TrendingUp,
    color: 'bg-amber-50 text-[#F59E0B] dark:bg-amber-500/15 dark:text-amber-400',
    title: 'تعلّم بالتتبع',
    desc: 'تتبع تقدمك اليومي بدقة مع إحصائيات شاملة وتقارير أداء مخصصة.',
  },
  {
    icon: Users,
    color: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
    title: 'مجتمع نشط',
    desc: 'انضم لمجتمع من المتعلمين العرب، شارك ونقاش وتطور معاً.',
  },
];

export function WhyUsSection() {
  return (
    <section className={SECTION.padding}>
      <div className={CONTAINER.className}>
        <div className={SECTION_HEADER.center}>
          <h2 className={TYPOGRAPHY.sectionHeading}>لماذا تختار منصة ثنائي؟</h2>
          <p className={TYPOGRAPHY.sectionSubheading}>
            ميزات تجعل تجربتك التعليمية أسهل وأوضح
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUE_PROPS.map((item) => (
            <div
              key={item.title}
              className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] hover:border-[#0F766E] hover:bg-white group transition-colors duration-150 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-orange-500/50 dark:hover:bg-slate-900/60"
            >
              <div
                className={`h-11 w-11 rounded-xl ${item.color} flex items-center justify-center mb-3`}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-[#1E293B] mb-1.5 text-sm dark:text-white">{item.title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed font-medium dark:text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

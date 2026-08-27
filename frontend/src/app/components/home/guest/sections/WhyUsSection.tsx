import { Shield, Globe, TrendingUp, Users } from 'lucide-react';

const VALUE_PROPS = [
  {
    icon: Shield,
    color: 'bg-emerald-50 text-[#0F766E]',
    title: 'شهادات معتمدة',
    desc: 'احصل على شهادة إتمام معتمدة عند إكمال كل دورة، قابلة للمشاركة على LinkedIn.',
  },
  {
    icon: Globe,
    color: 'bg-blue-50 text-blue-600',
    title: 'محتوى عربي أصيل',
    desc: 'جميع الدورات باللغة العربية الفصحى، مصممة خصيصاً للمتعلم العربي.',
  },
  {
    icon: TrendingUp,
    color: 'bg-amber-50 text-[#F59E0B]',
    title: 'تعلّم بالتتبع',
    desc: 'تتبع تقدمك اليومي بدقة مع إحصائيات شاملة وتقارير أداء مخصصة.',
  },
  {
    icon: Users,
    color: 'bg-purple-50 text-purple-600',
    title: 'مجتمع نشط',
    desc: 'انضم لمجتمع من المتعلمين العرب، شارك ونقاش وتطور معاً.',
  },
];

export function WhyUsSection() {
  return (
    <section className="py-10 bg-white border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E293B]">لماذا تختار منصة ثنائي؟</h2>
          <p className="text-sm text-[#64748B] font-medium mt-1">
            ميزات تجعل تجربتك التعليمية أسهل وأوضح
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUE_PROPS.map((item) => (
            <div
              key={item.title}
              className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] hover:border-[#0F766E] hover:bg-white group transition-colors duration-150"
            >
              <div
                className={`h-11 w-11 rounded-xl ${item.color} flex items-center justify-center mb-3`}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-[#1E293B] mb-1.5 text-sm">{item.title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed font-medium">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

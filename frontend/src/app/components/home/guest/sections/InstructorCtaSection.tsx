import { useRouter } from 'next/navigation';
import { GraduationCap, CheckCircle2, ArrowLeft, Users, Award } from 'lucide-react';
import type { PlatformStats } from '../types';

const BENEFITS = [
  'دخل شهري مستدام',
  'أدوات تدريس احترافية',
  'دعم كامل من الفريق',
  'تسويق مجاني',
];

interface InstructorCtaSectionProps {
  stats: PlatformStats | null;
}

export function InstructorCtaSection({ stats }: InstructorCtaSectionProps) {
  const router = useRouter();

  return (
    <section className="py-16 bg-gradient-to-l from-[#0F766E] to-[#1e3a5f] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-bold">
              <GraduationCap className="h-4 w-4 text-[#F59E0B]" />
              هل أنت خبير في مجالك؟
            </div>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight">
              شارك معرفتك مع الآلاف
              <br />
              <span className="text-[#F59E0B]">وحقق دخلاً رائعاً</span>
            </h2>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              انضم إلى فريق مدربينا وأنشئ دوراتك التدريبية بسهولة، وتواصل مع الطلاب في
              جميع أنحاء العالم العربي.
            </p>
            <div className="flex flex-wrap gap-3">
              {BENEFITS.map((feat) => (
                <div
                  key={feat}
                  className="flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full text-xs font-bold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#F59E0B]" />
                  {feat}
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push('/teach')}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#F59E0B] hover:bg-[#D97706] text-white font-black text-sm rounded-xl shadow-xl shadow-[#F59E0B]/30 transition-colors"
            >
              ابدأ التدريس الآن
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Users, value: stats.students, label: 'طالب على المنصة' },
                { icon: Award, value: stats.courses, label: 'كورس منشور' },
              ].map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="bg-white/10 border border-white/20 backdrop-blur-sm p-5 rounded-2xl text-center"
                >
                  <Icon className="h-6 w-6 text-[#F59E0B] mx-auto mb-2" />
                  <div className="text-2xl font-black">{value.toLocaleString('ar-EG')}</div>
                  <div className="text-xs text-white/70 mt-1">{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

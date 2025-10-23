'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { Clock, ShieldCheck, Sparkles } from 'lucide-react';

const EnhancedLoginForm = dynamic(
  () => import('@/components/auth/EnhancedLoginForm'),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl bg-white/10 px-6 py-8 text-center text-slate-100">
        جارٍ تجهيز نموذج تسجيل الدخول...
      </div>
    ),
  },
);

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-indigo-500/40 blur-3xl" />
        <div className="absolute bottom-0 left-[-10%] h-[26rem] w-[26rem] rounded-full bg-purple-500/30 blur-[160px]" />
        <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[180px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 space-y-8 text-right">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-200">
            منصة ثانوية بلس
          </span>
          <h1 className="text-4xl font-bold leading-snug md:text-5xl">
            تسجيل دخول آمن وذكي لإدارة رحلتك الدراسية
          </h1>
          <p className="max-w-xl text-sm leading-7 text-slate-200/80 md:text-base">
            احصل على رؤية كاملة لجدولك اليومي، اختباراتك القادمة، ومستوى تقدمك من أي جهاز بكل أمان.
          </p>

          <div className="grid gap-4 text-sm text-slate-200/90 sm:grid-cols-2">
            <FeatureHighlight
              icon={<ShieldCheck className="h-5 w-5 text-emerald-300" />}
              title="حماية متعددة الطبقات"
              description="مصادقة ثنائية، جلسات موثوقة، وسجل أمني لكل عملية دخول."
            />
            <FeatureHighlight
              icon={<Clock className="h-5 w-5 text-cyan-300" />}
              title="تنبيهات فورية للمهام"
              description="متابعة لحظية لصلاحية المهام والامتحانات مع تنبيهات ذكية."
            />
            <FeatureHighlight
              icon={<Sparkles className="h-5 w-5 text-purple-300" />}
              title="تجربة مخصصة بالكامل"
              description="تخطيط يومي، توصيات محتوى، ولوحة قيادة تفاعلية تناسب أسلوبك."
            />
            <FeatureHighlight
              icon={<ShieldCheck className="h-5 w-5 text-indigo-300" />}
              title="دعم فني على مدار الساعة"
              description="فريق متخصص لمساعدتك في أي وقت عبر القنوات المختلفة."
            />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center lg:max-w-lg">
          <div className="w-full max-w-md">
            <EnhancedLoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeatureHighlightProps {
  icon: ReactNode;
  title: string;
  description: string;
}

function FeatureHighlight({ icon, title, description }: FeatureHighlightProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
        {icon}
      </div>
      <div className="space-y-1 text-right">
        <p className="font-semibold text-slate-50">{title}</p>
        <p className="text-xs text-slate-300/80">{description}</p>
      </div>
    </div>
  );
}

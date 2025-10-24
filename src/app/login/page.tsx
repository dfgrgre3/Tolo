'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const EnhancedLoginForm = dynamic(
  () => import('@/components/auth/EnhancedLoginForm'),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl bg-white/10 px-6 py-8 text-center text-slate-100">
        جارٍ تحميل نموذج تسجيل الدخول...
      </div>
    ),
  },
);

const EnhancedRegisterForm = dynamic(
  () => import('@/components/auth/EnhancedRegisterForm'),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl bg-white/10 px-6 py-8 text-center text-slate-100">
        جارٍ تحميل نموذج إنشاء الحساب...
      </div>
    ),
  },
);

type AuthView = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<AuthView>('login');

  useEffect(() => {
    const viewParam = (searchParams.get('view') ?? '').toLowerCase();
    const derivedView: AuthView = viewParam === 'register' ? 'register' : 'login';
    setActiveView((current) => (current === derivedView ? current : derivedView));
  }, [searchParams]);

  const handleViewChange = (view: AuthView) => {
    if (view === activeView) {
      return;
    }

    setActiveView(view);
    router.replace(`/login${view === 'register' ? '?view=register' : ''}`, {
      scroll: false,
    });
  };

  const highlights: FeatureHighlightProps[] = [
    {
      icon: <ShieldCheck className="h-5 w-5 text-emerald-300" />,
      title: 'حماية متعددة الطبقات',
      description: 'تحقق بخطوتين، إدارة للجلسات، وتنبيهات فورية تبقي حسابك آمناً.',
    },
    {
      icon: <Clock className="h-5 w-5 text-cyan-300" />,
      title: 'تجربة تسجيل مرنة',
      description: 'استكمل بياناتك الأساسية وخيارات الأمان دون مغادرة الصفحة.',
    },
    {
      icon: <Sparkles className="h-5 w-5 text-purple-300" />,
      title: 'تنبيهات ذكية',
      description: 'تابع تقدمك الدراسي وتذكيراتك فور تسجيل الدخول أو إنشاء الحساب.',
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-indigo-300" />,
      title: 'إدارة موحدة',
      description: 'نموذج واحد يربط تسجيل الدخول، إنشاء الحساب، وإعدادات الأمان.',
    },
  ];

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
            بوابة thanawy الذكية
          </span>
          <h1 className="text-4xl font-bold leading-snug md:text-5xl">
            صفحة موحدة لتسجيل الدخول وإنشاء الحساب
          </h1>
          <p className="max-w-xl text-sm leading-7 text-slate-200/80 md:text-base md:leading-8">
            وفّر وقتك مع تجربة موحدة تجمع بين تسجيل الدخول، إنشاء الحساب، وكل خطوات الأمان في واجهة واحدة سهلة وسريعة التبديل.
          </p>

          <div className="grid gap-4 text-sm text-slate-200/90 sm:grid-cols-2">
            {highlights.map((feature) => (
              <FeatureHighlight
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center lg:max-w-lg">
          <div className="w-full max-w-md space-y-5">
            <div className="rounded-full bg-white/10 p-1 text-sm font-semibold text-indigo-100 shadow-inner backdrop-blur">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  className={cn(
                    'rounded-full px-5 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                    activeView === 'login'
                      ? 'bg-white text-slate-900 shadow-lg'
                      : 'text-indigo-100 hover:bg-white/10 hover:text-white',
                  )}
                  onClick={() => handleViewChange('login')}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-full px-5 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                    activeView === 'register'
                      ? 'bg-white text-slate-900 shadow-lg'
                      : 'text-indigo-100 hover:bg-white/10 hover:text-white',
                  )}
                  onClick={() => handleViewChange('register')}
                >
                  إنشاء حساب جديد
                </button>
              </div>
            </div>

            {activeView === 'login' ? (
              <EnhancedLoginForm />
            ) : (
              <EnhancedRegisterForm />
            )}
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

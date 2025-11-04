'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Mail,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Loader2,
  XCircle,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import TOTPSetup from './TOTPSetup';

type OnboardingStep = 
  | 'welcome'
  | 'email-verification'
  | 'password-setup'
  | 'two-factor'
  | 'recovery-codes'
  | 'complete';

interface SecurityOnboardingProps {
  onComplete?: () => void;
  skipable?: boolean;
}

export default function SecurityOnboarding({
  onComplete,
  skipable = false,
}: SecurityOnboardingProps) {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Determine starting step based on user status
    if (!user.emailVerified) {
      setCurrentStep('email-verification');
    } else if (!user.twoFactorEnabled) {
      setCurrentStep('two-factor');
    } else {
      setCurrentStep('complete');
    }
  }, [user, router]);

  const handleNext = () => {
    const steps: OnboardingStep[] = [
      'welcome',
      'email-verification',
      'password-setup',
      'two-factor',
      'recovery-codes',
      'complete',
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleSkip = () => {
    if (skipable) {
      onComplete?.();
    }
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success('تم إرسال رابط التفعيل إلى بريدك الإلكتروني');
      } else {
        toast.error('فشل إرسال رابط التفعيل');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال رابط التفعيل');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20">
              <Shield className="h-10 w-10 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                مرحباً بك في ثناوي!
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                دعنا نؤمن حسابك خطوة بخطوة
              </p>
            </div>
            <div className="rounded-xl bg-white/5 p-6 text-right space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-white">التحقق من البريد الإلكتروني</p>
                  <p className="text-slate-300">تأكيد ملكية بريدك الإلكتروني</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-white">كلمة مرور قوية</p>
                  <p className="text-slate-300">حماية حسابك بكلمة مرور آمنة</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-white">المصادقة الثنائية</p>
                  <p className="text-slate-300">طبقة إضافية من الأمان</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleNext}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700 flex items-center justify-center gap-2"
            >
              البدء
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        );

      case 'email-verification':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/20">
              <Mail className="h-10 w-10 text-blue-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                التحقق من البريد الإلكتروني
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                يرجى التحقق من بريدك الإلكتروني
              </p>
            </div>

            {user?.emailVerified ? (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <span className="text-lg font-semibold text-emerald-200">
                    تم التحقق من البريد الإلكتروني
                  </span>
                </div>
                <button
                  onClick={handleNext}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700"
                >
                  التالي
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-6 space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <XCircle className="h-6 w-6 text-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-200">
                    لم يتم التحقق من البريد الإلكتروني بعد
                  </span>
                </div>
                <p className="text-xs text-yellow-100">
                  تحقق من صندوق الوارد في بريدك الإلكتروني واتبع التعليمات
                </p>
                <button
                  onClick={handleResendVerification}
                  disabled={isLoading}
                  className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    'إعادة إرسال رابط التفعيل'
                  )}
                </button>
                {skipable && (
                  <button
                    onClick={handleSkip}
                    className="w-full text-sm text-slate-300 hover:text-white transition"
                  >
                    تخطي الآن
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 'two-factor':
        return (
          <div className="space-y-6">
            {user?.twoFactorEnabled ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="h-10 w-10 text-emerald-300" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  تم تفعيل المصادقة الثنائية
                </h2>
                <button
                  onClick={() => setCurrentStep('complete')}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700 mt-6"
                >
                  إكمال الإعداد
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    إعداد المصادقة الثنائية
                  </h2>
                  <p className="text-sm text-slate-300">
                    احمِ حسابك بطبقة إضافية من الأمان
                  </p>
                </div>
                <TOTPSetup
                  onComplete={() => {
                    refreshUser();
                    setCurrentStep('complete');
                  }}
                  onCancel={skipable ? handleSkip : undefined}
                />
              </>
            )}
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-10 w-10 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                تم إعداد الأمان بنجاح!
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                حسابك الآن محمي بشكل أفضل
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-6">
              <div className="space-y-3 text-sm text-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>تم التحقق من البريد الإلكتروني</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>تم إعداد المصادقة الثنائية</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>تم حفظ رموز الاسترداد</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                onComplete?.();
                router.push('/');
              }}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700"
            >
              الذهاب إلى الصفحة الرئيسية
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16">
      <div className="w-full max-w-2xl space-y-8 rounded-3xl border border-white/10 bg-slate-900/70 p-10 backdrop-blur">
        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          {['welcome', 'email-verification', 'two-factor', 'complete'].map(
            (step, index) => {
              const stepNames = ['البدء', 'البريد', 'الأمان', 'الإكمال'];
              const isActive = currentStep === step;
              const isCompleted =
                (step === 'email-verification' && user?.emailVerified) ||
                (step === 'two-factor' && user?.twoFactorEnabled);
              
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center transition ${
                        isActive
                          ? 'bg-indigo-500 text-white'
                          : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {isCompleted && !isActive ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className="mt-2 text-xs text-slate-400">
                      {stepNames[index]}
                    </span>
                  </div>
                  {index < 3 && (
                    <div
                      className={`h-1 flex-1 mx-2 transition ${
                        isActive || isCompleted ? 'bg-indigo-500' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              );
            }
          )}
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">{renderStep()}</div>
      </div>
    </div>
  );
}


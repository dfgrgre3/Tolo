'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/shared/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Fingerprint,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useEnhancedAuth } from '@/lib/auth-hook-enhanced';
import { cn } from '@/lib/utils';

interface EnhancedLoginFormProps {
  onClose?: () => void;
}

type Step = 'credentials' | 'two-factor' | 'success';

interface TwoFactorState {
  loginAttemptId: string;
  expiresAt?: string;
  methods: string[];
  debugCode?: string;
}

const steps: Step[] = ['credentials', 'two-factor', 'success'];

const twoFactorMethodLabels: Record<string, string> = {
  email: 'البريد الإلكتروني',
  sms: 'الرسائل النصية',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EnhancedLoginForm({ onClose }: EnhancedLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, verifyTwoFactor, resendTwoFactorCode, loginWithSocial } =
    useEnhancedAuth();

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    rememberMe: true,
  });
  const [currentStep, setCurrentStep] = useState<Step>('credentials');
  const [twoFactorState, setTwoFactorState] = useState<TwoFactorState | null>(
    null,
  );
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (user) {
      const redirectTo = searchParams.get('redirect') || '/';
      router.replace(redirectTo);
      if (onClose) {
        onClose();
      }
    }
  }, [user, router, searchParams, onClose]);

  useEffect(() => {
    if (!resendCooldown) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const currentStepIndex = steps.indexOf(currentStep);

  const validateCredentials = () => {
    const errors: { email?: string; password?: string } = {};
    let message: string | null = null;

    const normalizedEmail = credentials.email.trim();
    const passwordValue = credentials.password;

    if (!normalizedEmail || passwordValue.trim().length === 0) {
      if (!normalizedEmail) {
        errors.email = '?????? ??? ???? ??????';
      }

      if (passwordValue.trim().length === 0) {
        errors.password = '?????? ??? ???? ??????';
      }

      message = '?????? ??? ???? ??????';
    }

    if (!errors.email && normalizedEmail && !emailPattern.test(normalizedEmail)) {
      errors.email = '?????? ?????????? ??? ????';
      message = '?????? ?????????? ??? ????';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      message,
      normalizedEmail,
    };
  };

  const handleCredentialsSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setFeedback(null);

    const validation = validateCredentials();

    if (!validation.valid) {
      setFormErrors(validation.errors);

      if (validation.message) {
        setFeedback({
          type: 'error',
          message: validation.message,
        });
      }

      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const result = await login({
        ...credentials,
        email: validation.normalizedEmail,
      });

      if (result.requiresTwoFactor && result.loginAttemptId) {
        setTwoFactorState({
          loginAttemptId: result.loginAttemptId,
          expiresAt: result.expiresAt,
          methods: result.methods ?? ['email'],
          debugCode: result.debugCode,
        });
        setTwoFactorCode('');
        setCurrentStep('two-factor');
        setFeedback({
          type: 'success',
          message: '?? ????? ??? ?????? ?????. ???? ????? ????? ????????.',
        });
        setResendCooldown(45);
        return;
      }

      setFeedback({
        type: 'success',
        message: '?? ????? ?????? ?????.',
      });
      setCurrentStep('success');
    } catch (error: any) {
      const newErrors: { email?: string; password?: string } = {};
      let message = error?.message || '??? ??? ??? ?????. ???? ???????? ??? ????.';

      const emailIssues = Array.isArray(error?.details?.email) && error.details.email.length > 0;
      const passwordIssues = Array.isArray(error?.details?.password) && error.details.password.length > 0;

      if (emailIssues) {
        newErrors.email = '?????? ?????????? ??? ????';
        message = '?????? ?????????? ??? ????';
      }

      if (passwordIssues) {
        newErrors.password = '?????? ??? ???? ??????';
        if (!emailIssues) {
          message = '?????? ??? ???? ??????';
        }
      }

      if (error?.status === 401) {
        newErrors.password = '???? ?????? ?????';
        message = '???? ?????? ?????';
      }

      if (typeof error?.code === 'string' && error.code.length > 0) {
        message = error.message || message;
      }

      setFormErrors(Object.keys(newErrors).length ? newErrors : {});
      setFeedback({
        type: 'error',
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTwoFactorSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!twoFactorState?.loginAttemptId) {
      setFeedback({
        type: 'error',
        message: 'لا يوجد طلب تحقق نشط. أعد المحاولة من البداية.',
      });
      setCurrentStep('credentials');
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);

    try {
      await verifyTwoFactor({
        loginAttemptId: twoFactorState.loginAttemptId,
        code: twoFactorCode.trim(),
        trustDevice,
      });

      setCurrentStep('success');
      setFeedback({
        type: 'success',
        message:
          'تم التحقق من الرمز بنجاح. جارٍ تحويلك إلى لوحة التحكم.',
      });
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message:
          error?.message ||
          'تعذر التحقق من الرمز. تأكد من صحته وحاول مجدداً.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!twoFactorState?.loginAttemptId || resendCooldown > 0) {
      return;
    }

    try {
      await resendTwoFactorCode({
        loginAttemptId: twoFactorState.loginAttemptId,
        method: twoFactorState.methods.includes('sms') ? 'sms' : 'email',
      });
      setFeedback({
        type: 'success',
        message: 'تم إرسال رمز جديد بنجاح.',
      });
      setResendCooldown(45);
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message:
          error?.message || 'تعذر إرسال الرمز. حاول مرة أخرى لاحقاً.',
      });
    }
  };

  const handleSocialLogin = async (
    provider: 'google' | 'github' | 'twitter',
  ) => {
    try {
      await loginWithSocial(provider);
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message:
          error?.message ||
          'تعذر بدء تسجيل الدخول عبر الشبكات الاجتماعية.',
      });
    }
  };

  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full border-none bg-white/10 p-1 backdrop-blur">
      <CardHeader className="space-y-3 rounded-2xl bg-white/80 p-6 text-right shadow-inner dark:bg-slate-900/80">
        <div className="flex justify-between">
          <span className="text-xs font-semibold text-indigo-500">
            مركز الأمان
          </span>
          <ShieldCheck className="h-5 w-5 text-indigo-500" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
          تسجيل الدخول إلى حسابك
        </CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          وصول آمن إلى مهامك، جداولك، وسجل إنجازاتك الدراسية.
        </CardDescription>
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className={cn(
                'flex-1 rounded-full py-1 text-center text-xs font-medium transition-all',
                index < currentStepIndex
                  ? 'bg-emerald-500 text-white'
                  : index === currentStepIndex
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
              )}
            >
              {index + 1}.{' '}
              {step === 'credentials'
                ? 'المعلومات الأساسية'
                : step === 'two-factor'
                ? 'التحقق الثنائي'
                : 'تم التسجيل'}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {feedback && (
          <Alert
            variant={feedback.type === 'error' ? 'destructive' : 'default'}
            className="border-0 bg-white/80 text-right text-slate-700 shadow dark:bg-slate-900/80 dark:text-slate-200"
          >
            {feedback.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            <AlertTitle className="font-semibold">
              {feedback.type === 'error' ? 'حدث خطأ' : 'تم بنجاح'}
            </AlertTitle>
            <AlertDescription className="text-sm leading-6">
              {feedback.message}
            </AlertDescription>
          </Alert>
        )}

        {currentStep === 'credentials' && (
          <form className="space-y-5" onSubmit={handleCredentialsSubmit}>
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="flex items-center justify-end gap-2 text-sm text-slate-600 dark:text-slate-200"
              >
                البريد الإلكتروني
                <Mail className="h-4 w-4 text-indigo-500" />
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@student.com"
                dir="ltr"
                value={credentials.email}
                onChange={(event) => {
                  const { value } = event.target;
                  setCredentials((prev) => ({
                    ...prev,
                    email: value,
                  }));
                  if (formErrors.email) {
                    setFormErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                required
                className={cn(
                  'text-right',
                  formErrors.email
                    ? 'border-rose-500 focus-visible:ring-rose-500 focus-visible:ring-offset-0'
                    : '',
                )}
                autoComplete="email"
                aria-invalid={Boolean(formErrors.email)}
                aria-describedby={formErrors.email ? 'login-email-error' : undefined}
              />
              {formErrors.email && (
                <p
                  id="login-email-error"
                  className="text-xs font-medium text-rose-600 dark:text-rose-400 text-right"
                >
                  {formErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="flex items-center justify-end gap-2 text-sm text-slate-600 dark:text-slate-200"
              >
                كلمة المرور
                <Lock className="h-4 w-4 text-indigo-500" />
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={credentials.password}
                onChange={(event) => {
                  const { value } = event.target;
                  setCredentials((prev) => ({
                    ...prev,
                    password: value,
                  }));
                  if (formErrors.password) {
                    setFormErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                required
                className={cn(
                  'text-right',
                  formErrors.password
                    ? 'border-rose-500 focus-visible:ring-rose-500 focus-visible:ring-offset-0'
                    : '',
                )}
                autoComplete="current-password"
                minLength={8}
                aria-invalid={Boolean(formErrors.password)}
                aria-describedby={formErrors.password ? 'login-password-error' : undefined}
              />
              {formErrors.password && (
                <p
                  id="login-password-error"
                  className="text-xs font-medium text-rose-600 dark:text-rose-400 text-right"
                >
                  {formErrors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <button
                type="button"
                className="text-indigo-500 transition hover:text-indigo-600"
              >
                نسيت كلمة المرور؟
              </button>
              <label className="flex items-center gap-2">
                <span>تذكرني</span>
                <Checkbox
                  checked={credentials.rememberMe}
                  onCheckedChange={(checked) =>
                    setCredentials((prev) => ({
                      ...prev,
                      rememberMe: Boolean(checked),
                    }))
                  }
                />
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري التحقق...
                </span>
              ) : (
                'تسجيل الدخول'
              )}
            </Button>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
              أو سجّل الدخول عبر
              <span className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-700" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                className="border-slate-200 bg-white/70 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
                onClick={() => handleSocialLogin('google')}
              >
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-slate-200 bg-white/70 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
                onClick={() => handleSocialLogin('github')}
              >
                GitHub
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-slate-200 bg-white/70 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
                onClick={() => handleSocialLogin('twitter')}
              >
                Twitter
              </Button>
            </div>
          </form>
        )}

        {currentStep === 'two-factor' && twoFactorState && (
          <form className="space-y-5" onSubmit={handleTwoFactorSubmit}>
            <div className="rounded-xl bg-indigo-50/80 p-4 text-right text-sm text-slate-700 shadow-inner dark:bg-indigo-500/10 dark:text-slate-200">
              <p className="flex items-center justify-end gap-2 font-medium text-indigo-700 dark:text-indigo-200">
                <Fingerprint className="h-4 w-4" />
                طبقة أمان إضافية
              </p>
              <p className="mt-1 leading-6">
                أدخل رمز التحقق المكوّن من 6 أرقام المرسل عبر{' '}
                {twoFactorState.methods
                  .map(
                    (method) => twoFactorMethodLabels[method] ?? method,
                  )
                  .join(' أو ')}
                .
              </p>
              {twoFactorState.expiresAt && (
                <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-300">
                  تنتهي صلاحية الرمز في{' '}
                  {new Date(twoFactorState.expiresAt).toLocaleTimeString()}.
                </p>
              )}
              {process.env.NODE_ENV !== 'production' &&
                twoFactorState.debugCode && (
                  <div className="mt-3 rounded-lg border border-dashed border-indigo-400 bg-white/60 px-3 py-2 text-left text-sm font-mono text-indigo-600 dark:bg-slate-900/70 dark:text-indigo-200">
                    رمز التطوير: {twoFactorState.debugCode}
                  </div>
                )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="otp"
                className="flex items-center justify-end gap-2 text-sm text-slate-600 dark:text-slate-200"
              >
                رمز التحقق
                <Smartphone className="h-4 w-4 text-indigo-500" />
              </Label>
              <Input
                id="otp"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="123456"
                dir="ltr"
                value={twoFactorCode}
                onChange={(event) => setTwoFactorCode(event.target.value)}
                required
                maxLength={6}
                className="text-center text-lg tracking-[8px]"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <label className="flex items-center gap-2">
                  <span>الثقة بهذا الجهاز</span>
                  <Checkbox
                    checked={trustDevice}
                    onCheckedChange={(checked) =>
                      setTrustDevice(Boolean(checked))
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="flex items-center gap-2 text-indigo-600 transition hover:text-indigo-700 disabled:text-slate-400"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  إعادة إرسال{' '}
                  {resendCooldown > 0
                    ? `(${formatTimeLeft(resendCooldown)})`
                    : ''}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                className="order-2 text-slate-500 hover:text-slate-700 sm:order-1"
                onClick={() => {
                  setCurrentStep('credentials');
                  setTwoFactorState(null);
                }}
              >
                <ArrowLeft className="ml-2 h-4 w-4" />
                الرجوع
              </Button>
              <Button
                type="submit"
                className="order-1 w-full bg-indigo-600 text-white hover:bg-indigo-700 sm:order-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري التحقق...
                  </span>
                ) : (
                  'تأكيد الرمز'
                )}
              </Button>
            </div>
          </form>
        )}

        {currentStep === 'success' && (
          <div className="space-y-6 text-right">
            <div className="rounded-2xl bg-emerald-500/10 p-6 text-emerald-700 shadow-inner dark:bg-emerald-500/15 dark:text-emerald-200">
              <p className="flex items-center justify-end gap-2 text-lg font-semibold">
                <CheckCircle2 className="h-5 w-5" />
                تم تسجيل الدخول بنجاح
              </p>
              <p className="mt-2 text-sm leading-6">
                سنحوّلك تلقائياً إلى لوحة التحكم لمتابعة خطتك الدراسية. يمكنك إغلاق
                هذه النافذة بأمان.
              </p>
            </div>
            <Button
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                const redirectTo = searchParams.get('redirect') || '/';
                router.replace(redirectTo);
                if (onClose) {
                  onClose();
                }
              }}
            >
              الانتقال إلى لوحة التحكم
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-end gap-2 border-t border-white/10 bg-white/40 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
        <p>
          بدخولك تؤكد موافقتك على{' '}
          <Link href="/terms" className="text-indigo-600 hover:text-indigo-700">
            شروط الاستخدام
          </Link>{' '}
          و{' '}
          <Link href="/privacy" className="text-indigo-600 hover:text-indigo-700">
            سياسة الخصوصية
          </Link>
          .
        </p>
        <p>تحتاج مساعدة؟ تواصل مع فريق الدعم على support@thanawy.app</p>
      </CardFooter>
    </Card>
  );
}

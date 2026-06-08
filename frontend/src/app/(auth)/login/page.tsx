"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { m } from "framer-motion";
import { useAuth } from '@/contexts/auth-context';
import { sanitizeRedirectPath } from '@/services/auth/navigation';
import { BackgroundLayers, LeftPanelInfo, LoginFormHeader, LoginAuthView, LoginFormFooter } from './_components';

const loginSchema = z.object({
  email: z.string().trim().email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة').optional(),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: isAuthLoading, verify2FA } = useAuth();
  
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId2FA, setUserId2FA] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [loginMode, setLoginMode] = useState<'password' | 'magic-link'>('password');

  const redirectUrl = useMemo(
    () => sanitizeRedirectPath(searchParams.get('redirect'), '/dashboard'),
    [searchParams]
  );

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    }
  });

  const redirectAfterLogin = useCallback((target: string) => {
    router.replace(target);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      redirectAfterLogin(redirectUrl);
    }
  }, [isAuthLoading, isAuthenticated, redirectAfterLogin, redirectUrl]);

  const onSubmit = async (data: LoginFormValues) => {
    if (isAuthLoading || isAuthenticated) return;
    setIsSubmitting(true);
    setErrorStatus(null);

    try {
      if (loginMode === 'magic-link') {
        setErrorStatus('تسجيل الدخول السريع عبر البريد قيد الصيانة حالياً. يرجى استخدام كلمة المرور.');
        setIsSubmitting(false);
        return;
      }

      const result = await login(
        data.email.trim().toLowerCase(),
        data.password || '',
        data.rememberMe
      );

      if (result.success) {
        if (result.requires2FA) {
          setRequires2FA(true);
          setUserId2FA(result.userId || null);
          return;
        }
        return;
      }
      setErrorStatus(result.error || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    } catch (err: any) {
      setErrorStatus(err?.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId2FA || twoFactorCode.length < 6) return;

    setIsSubmitting(true);
    setErrorStatus(null);
    try {
      const result = await verify2FA(userId2FA, twoFactorCode, getValues('rememberMe'));
      if (result.success) {
        return;
      }
      setErrorStatus(result.error || 'رمز التحقق غير صحيح');
    } catch (err: any) {
      setErrorStatus(err?.message || 'فشل التحقق من رمز الأمان الثنائي.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResendVerification = () => {
    setErrorStatus('يرجى التحقق من صندوق البريد الوارد لإعادة تفعيل حسابك.');
  };

  const emptyDeviceInfo = { os: 'نظام تشغيل آمن', browser: 'تولو ويب' };

  if (isAuthLoading) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#020202] overflow-hidden">
        <BackgroundLayers />
        <div className="flex flex-col items-center justify-center space-y-4 text-center z-10">
          <div className="relative">
            <div className="h-20 w-20 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
          </div>
          <p className="animate-pulse text-sm font-medium text-primary/70">جاري التحقق من حالة الجلسة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#020202] overflow-hidden selection:bg-primary/30" dir="rtl">
      <BackgroundLayers />
      <m.div
        initial={{ opacity: 0, y: 20, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[1150px] grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden rounded-[3rem] border border-white/5 bg-black/40 backdrop-blur-3xl shadow-[0_50px_150px_rgba(0,0,0,0.9)] z-10"
      >
        <LeftPanelInfo deviceInfo={emptyDeviceInfo} />
        <div className="lg:col-span-7 p-10 md:p-16 lg:p-24 bg-[#080808]/50 flex flex-col justify-center space-y-12">
          <LoginFormHeader />
          <LoginAuthView
            requires2FA={requires2FA}
            errorStatus={errorStatus}
            onResendVerification={onResendVerification}
            handleSubmit={handleSubmit}
            onSubmit={onSubmit}
            register={register}
            errors={errors}
            loginMode={loginMode}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            getValues={getValues}
            setLoginMode={setLoginMode}
            isSubmitting={isSubmitting}
            twoFactorCode={twoFactorCode}
            setTwoFactorCode={setTwoFactorCode}
            onVerify2FA={onVerify2FA}
            setRequires2FA={setRequires2FA}
          />
          <LoginFormFooter />
        </div>
      </m.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#020202] overflow-hidden">
        <BackgroundLayers />
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-primary/20 border-t-primary z-10"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}


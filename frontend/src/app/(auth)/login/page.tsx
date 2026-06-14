"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const { login, isAuthenticated, isLoading: isAuthLoading, verify2FA, requestMagicLink, verifyOTP } = useAuth();
  
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId2FA, setUserId2FA] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [loginMode, setLoginMode] = useState<'password' | 'magic-link'>('password');
  // Guard to ensure we only redirect once — prevents infinite loops caused by
  // auth-state fluctuations (e.g., isLoading toggling) after the initial redirect.
  const hasRedirected = useRef(false);

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

  // NOTE: Do NOT call router.refresh() here.
  // router.refresh() forces a full server-side re-render which re-initializes
  // AuthProvider. This causes isLoading to flip true→false again, which
  // re-triggers this effect — creating an infinite refresh loop.
  const redirectAfterLogin = useCallback((target: string) => {
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    router.replace(target);
  }, [router]);

  // Redirect already-authenticated users to dashboard.
  // hasRedirected guard ensures this fires at most once even if Clerk
  // triggers multiple state updates during session initialization.
  // We also check isAuthLoading is FALSE before redirecting — if Clerk
  // is still initializing (isAuthLoading=true), isAuthenticated may be
  // a stale value from the previous render cycle and cause a premature redirect.
  useEffect(() => {
    if (isAuthLoading) return; // Wait for Clerk to fully resolve
    if (!isAuthenticated) return; // Not logged in yet
    if (hasRedirected.current) return; // Already redirected — ignore Clerk re-renders
    redirectAfterLogin(redirectUrl);
  }, [isAuthLoading, isAuthenticated, redirectAfterLogin, redirectUrl]);

  const onSubmit = async (data: LoginFormValues) => {
    if (isAuthLoading || isAuthenticated) return;
    setIsSubmitting(true);
    setErrorStatus(null);

    try {
      if (loginMode === 'magic-link') {
        const result = await requestMagicLink(data.email.trim().toLowerCase());
        if (result.success) {
          setRequires2FA(true);
          setTwoFactorCode('');
          return;
        }
        setErrorStatus(result.error || 'فشل إرسال كود الدخول السريع.');
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
        // Redirect immediately on successful login.
        // The useEffect above will also fire when isAuthenticated becomes true,
        // but hasRedirected ref ensures only one redirect happens.
        redirectAfterLogin(redirectUrl);
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
    if (twoFactorCode.length < 6) return;

    setIsSubmitting(true);
    setErrorStatus(null);
    try {
      if (loginMode === 'magic-link') {
        const result = await verifyOTP(twoFactorCode);
        if (result.success) {
          redirectAfterLogin(redirectUrl);
          return;
        }
        setErrorStatus(result.error || 'رمز التحقق غير صحيح');
        return;
      }

      if (!userId2FA) {
        setErrorStatus('معرّف المستخدم غير متوفر.');
        return;
      }

      const result = await verify2FA(userId2FA, twoFactorCode, getValues('rememberMe'));
      if (result.success) {
        redirectAfterLogin(redirectUrl);
        return;
      }
      setErrorStatus(result.error || 'رمز التحقق غير صحيح');
    } catch (err: any) {
      setErrorStatus(err?.message || 'فشل التحقق.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deviceInfo, setDeviceInfo] = useState({ os: 'نظام تشغيل آمن', browser: 'تولو ويب' });

  useEffect(() => {
    const ua = window.navigator.userAgent;
    let os = 'نظام تشغيل آمن';
    let browser = 'تولو ويب';
    
    if (ua.includes('Win')) os = 'ويندوز';
    else if (ua.includes('Mac')) os = 'ماك أو إس';
    else if (ua.includes('Linux')) os = 'لينكس';
    else if (ua.includes('Android')) os = 'أندرويد';
    else if (ua.includes('like Mac')) os = 'آي أو إس';

    if (ua.includes('Firefox')) browser = 'فايرفوكس';
    else if (ua.includes('Chrome')) browser = 'جوجل كروم';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'سافاري';
    else if (ua.includes('Edge')) browser = 'إيدج';

    const t = setTimeout(() => {
      setDeviceInfo({ os, browser });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const onResendVerification = () => {
    setErrorStatus('يرجى التحقق من صندوق البريد الوارد لإعادة تفعيل حسابك.');
  };

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
        <LeftPanelInfo deviceInfo={deviceInfo} />
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


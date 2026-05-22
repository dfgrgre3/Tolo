"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { m } from "framer-motion";
import { useAuth } from '@/contexts/auth-context';
import { DEFAULT_AUTHENTICATED_ROUTE, sanitizeRedirectPath } from '@/services/auth/navigation';
import { toast } from 'sonner';

import { BackgroundLayers, LeftPanelInfo, LoadingState, LoginAuthView, LoginFormHeader, LoginFormFooter, LoginMobileHeader } from './_components';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'البريد الإلكتروني مطلوب').email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة').optional().or(z.literal('')),
  rememberMe: z.boolean().optional()
});

type LoginFormValues = z.infer<typeof loginSchema>;

const getDeviceInfo = () => {
  if (typeof window === 'undefined') return { os: 'Unknown', browser: 'Unknown' };
  const ua = window.navigator.userAgent;
  let os = "نظام غير معروف";
  if (ua.indexOf("Win") !== -1) os = "Windows";
  else if (ua.indexOf("Mac") !== -1) os = "macOS";
  else if (ua.indexOf("Linux") !== -1) os = "Linux";
  else if (ua.indexOf("Android") !== -1) os = "Android";
  else if (ua.indexOf("like Mac") !== -1) os = "iOS";
  let browser = "متصفح غير معروف";
  if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
  else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
  else if (ua.indexOf("Safari") !== -1) browser = "Safari";
  else if (ua.indexOf("Edge") !== -1) browser = "Edge";
  return { os, browser };
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: isAuthLoading, verify2FA, requestMagicLink, resendVerification } = useAuth();

  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<'password' | 'magic-link'>('password');
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId2FA, setUserId2FA] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [deviceInfo, setDeviceInfo] = useState({ os: '', browser: '' });

  useEffect(() => { setDeviceInfo(getDeviceInfo()); }, []);

  const redirectUrl = useMemo(
    () => sanitizeRedirectPath(searchParams.get('redirect'), DEFAULT_AUTHENTICATED_ROUTE),
    [searchParams]
  );

  const { register, handleSubmit, getValues, formState: { errors }, trigger } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false }
  });

  const redirectAfterLogin = useCallback((target: string) => {
    router.replace(target);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) redirectAfterLogin(redirectUrl);
  }, [isAuthLoading, isAuthenticated, redirectAfterLogin, redirectUrl]);

  const handleLogin = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setErrorStatus(null);
    try {
      const result = await login(data.email.trim().toLowerCase(), data.password || '', data.rememberMe ?? false);
      if (result.success) {
        if (result.requires2FA) {
          toast.success('تم التحقق بنجاح، يرجى إدخال رمز التحقق المزدوج');
          setRequires2FA(true);
          setUserId2FA(result.userId || null);
        } else {
          toast.success('مرحباً بك مجدداً في تولو');
          redirectAfterLogin(redirectUrl);
        }
      } else {
        setErrorStatus(result.error || 'فشل تسجيل الدخول');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async () => {
    if (!(await trigger('email'))) return;
    setIsSubmitting(true);
    try {
      const result = await requestMagicLink(getValues('email'));
      if (result.success) {
        toast.success('تم إرسال رابط الدخول السحري');
        setErrorStatus('تفقد بريدك الإلكتروني للحصول على رابط الدخول السريع.');
      } else {
        setErrorStatus(result.error || 'فشل إرسال الرابط');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (data: LoginFormValues) => {
    if (isAuthLoading || isAuthenticated) return;
    loginMode === 'password' ? handleLogin(data) : handleMagicLink();
  };

  const onVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId2FA || twoFactorCode.length < 6) return;
    setIsSubmitting(true);
    try {
      const result = await verify2FA(userId2FA, twoFactorCode, getValues('rememberMe'));
      if (result.success) return redirectAfterLogin(redirectUrl);
      setErrorStatus(result.error || 'رمز التحقق غير صحيح');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isAuthenticated) return <LoadingState />;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#020202] overflow-hidden selection:bg-primary/30" dir="rtl">
      <BackgroundLayers />
      <m.div
        initial={{ opacity: 0, y: 20, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[1150px] grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden rounded-[3rem] border border-white/5 bg-black/40 backdrop-blur-3xl shadow-[0_50px_150px_rgba(0,0,0,0.9)]"
      >
        <LeftPanelInfo deviceInfo={deviceInfo} />
        <div className="lg:col-span-7 p-10 md:p-16 lg:p-24 bg-[#080808]/50 flex flex-col justify-center">
          <div className="max-w-[440px] mx-auto w-full space-y-12">
            <LoginMobileHeader />
            <LoginFormHeader />
            <LoginAuthView
              requires2FA={requires2FA}
              errorStatus={errorStatus}
              onResendVerification={() => {
                const email = getValues('email');
                if (email) toast.promise(resendVerification(email), { loading: 'جاري الإرسال...', success: 'تم الإرسال!', error: 'فشل الإرسال' });
              }}
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
        </div>
      </m.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="h-16 w-16 text-primary animate-spin" />
          <span className="text-[12px] font-black text-primary/50 uppercase tracking-[0.8em] animate-pulse">Initializing Security</span>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

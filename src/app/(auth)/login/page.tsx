'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Loader2, AlertCircle, ArrowRight, Eye, EyeOff, Github, Chrome, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  sanitizeRedirectPath,
} from '@/lib/auth/navigation';

const loginSchema = z.object({
  email: z.string().trim().email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<'password' | 'magic-link'>('password');
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId2FA, setUserId2FA] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const { verify2FA } = useAuth();

  const redirectUrl = useMemo(
    () => sanitizeRedirectPath(searchParams.get('redirect'), DEFAULT_AUTHENTICATED_ROUTE),
    [searchParams]
  );

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
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
      const result = await login(
        data.email.trim().toLowerCase(),
        data.password,
        data.rememberMe ?? false
      );

      if (result.success) {
        if (result.requires2FA) {
          setRequires2FA(true);
          setUserId2FA(result.userId || null);
          return;
        }
        redirectAfterLogin(redirectUrl);
        return;
      }
      setErrorStatus(result.error || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
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
        redirectAfterLogin(redirectUrl);
        return;
      }
      setErrorStatus(result.error || 'رمز التحقق غير صحيح');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    window.location.href = `/api/auth/oauth/${provider}`;
  };

  const handleMagicLinkRequest = async () => {
    const email = getValues('email');
    if (!email || !email.includes('@')) {
      setErrorStatus('يرجى إدخال بريد إلكتروني صحيح أولاً');
      return;
    }

    setIsSubmitting(true);
    setErrorStatus(null);
    try {
      const response = await fetch('/api/auth/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      
      if (response.ok) {
        alert('تفقد بريدك الإلكتروني! أرسلنا لك رابط الدخول السحري.');
      } else {
        setErrorStatus(data.error || 'فشل إرسال الرابط');
      }
    } catch (error) {
      setErrorStatus('خطأ في الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isAuthenticated) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-pulse rounded-full bg-blue-500/20"></div>
          </div>
        </div>
        <p className="animate-pulse text-sm font-medium text-blue-400">جاري التحقق من جلستك...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Decorative background elements */}
      <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gray-950/40 p-8 backdrop-blur-xl shadow-2xl"
      >
        <div className="mb-8 text-right">
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">مرحباً بك مجدداً</h2>
          <p className="text-gray-400">سجل دخولك لتكمل رحلتك التعليمية</p>
        </div>

        {/* Social Logins */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <button
            onClick={() => handleSocialLogin('google')}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 py-3 transition-all hover:bg-white/10 hover:border-white/10 active:scale-95"
          >
            <Chrome className="h-5 w-5 text-red-400" />
            <span className="text-sm font-medium text-white">Google</span>
          </button>
          <button
            onClick={() => handleSocialLogin('github')}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 py-3 transition-all hover:bg-white/10 hover:border-white/10 active:scale-95"
          >
            <Github className="h-5 w-5 text-white" />
            <span className="text-sm font-medium text-white">Github</span>
          </button>
        </div>

        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <span className="relative bg-gray-950 px-4 text-xs font-medium uppercase tracking-wider text-gray-500">أو عبر البريد</span>
        </div>

        <AnimatePresence mode="wait">
          {errorStatus && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 0 }}
              animate={{ opacity: 1, scale: 1, x: [0, -10, 10, -10, 10, 0] }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-500"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{errorStatus}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          {!requires2FA ? (
            <>
              <div className="space-y-2">
                <label className="mr-1 text-sm font-medium text-gray-300">البريد الإلكتروني</label>
                <div className="group relative">
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full rounded-2xl border border-white/5 bg-white/5 py-3.5 pr-11 pl-4 text-white outline-none transition-all placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
                    placeholder="name@example.com"
                    dir="rtl"
                  />
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 transition-colors group-focus-within:text-blue-500" />
                </div>
                {errors.email && <p className="mr-1 mt-1 text-xs font-medium text-red-400">{errors.email.message}</p>}
              </div>

              <AnimatePresence>
                {loginMode === 'password' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <div className="mr-1 flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">كلمة المرور</label>
                      <Link href="/forgot-password" className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">نسيت كلمة المرور؟</Link>
                    </div>
                    <div className="group relative">
                      <input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        className="w-full rounded-2xl border border-white/5 bg-white/5 py-3.5 pr-11 pl-12 text-white outline-none transition-all placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
                        placeholder="••••••••"
                        dir="rtl"
                      />
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 transition-colors group-focus-within:text-blue-500" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="mr-1 mt-1 text-xs font-medium text-red-400">{errors.password.message}</p>}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between mr-1">
                <div className="flex items-center gap-2 cursor-pointer group">
                  <input
                    {...register('rememberMe')}
                    type="checkbox"
                    id="rememberMe"
                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/20"
                  />
                  <label htmlFor="rememberMe" className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors cursor-pointer">تذكرني لمدة 7 أيام</label>
                </div>
                
                <button
                  type="button"
                  onClick={() => setLoginMode(loginMode === 'password' ? 'magic-link' : 'password')}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {loginMode === 'password' ? 'الدخول السحري' : 'الدخول بكلمة السر'}
                </button>
              </div>

              <button
                onClick={loginMode === 'password' ? handleSubmit(onSubmit) : handleMagicLinkRequest}
                disabled={isSubmitting}
                className="relative w-full overflow-hidden rounded-2xl bg-blue-600 px-4 py-4 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>{loginMode === 'password' ? 'تسجيل الدخول' : 'إرسال رابط الدخول'}</span>
                    <ArrowRight className="h-5 w-5 rotate-180" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite]" />
              </button>
            </>
          ) : (
            <motion.form
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={onVerify2FA}
              className="space-y-6"
            >
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-blue-500/10 mb-4">
                  <AlertCircle className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-bold text-white">التحقق بخطوتين</h3>
                <p className="text-sm text-gray-400 mt-1">أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة الخاص بك</p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full text-center tracking-[1em] text-2xl font-bold rounded-2xl border border-white/5 bg-white/5 py-4 text-white outline-none transition-all focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || twoFactorCode.length < 6}
                className="relative w-full overflow-hidden rounded-2xl bg-blue-600 px-4 py-4 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>تحقق ودخول</span>
                    <ArrowRight className="h-5 w-5 rotate-180" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setRequires2FA(false)}
                className="w-full text-sm text-gray-500 hover:text-white transition-colors"
              >
                العودة لتسجيل الدخول
              </button>
            </motion.form>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            ليس لديك حساب؟{' '}
            <Link href="/register" className="font-bold text-white transition-colors hover:text-blue-400 underline-offset-4 hover:underline">
              أنشئ حسابك الآن
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}


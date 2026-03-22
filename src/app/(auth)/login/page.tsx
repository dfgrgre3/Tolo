"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Github, 
  Chrome, 
  Wand2,
  Shield,
  Zap,
  Bot
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  sanitizeRedirectPath,
} from '@/services/auth/navigation';
import { Suspense } from 'react';

const loginSchema = z.object({
  email: z.string().trim().email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
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

  if (isAuthLoading || isAuthenticated) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="flex h-full w-full animate-pulse items-center justify-center rounded-full bg-primary/10">
             <Bot className="h-10 w-10 text-primary" />
          </div>
        </div>
        <p className="animate-pulse text-sm font-black uppercase tracking-widest text-primary">التحقق من هوية المحارب...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-lg mx-auto" dir="rtl">
      {/* Cinematic Aura */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 blur-[130px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/10 blur-[130px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-black/40 p-12 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5"
      >
        <div className="mb-10 text-center space-y-4">
           <div className="mx-auto w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 transform hover:rotate-6 transition-transform">
              <Shield className="w-8 h-8 text-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
           </div>
           <h2 className="text-4xl font-black text-white tracking-tight">دُخول <span className="rpg-neon-text">المملكة</span> ⚔️</h2>
           <p className="text-gray-500 font-medium">سجل دخولك لتواصل مسيرتك نحو القمة</p>
        </div>

        {/* Social Entrance */}
        <div className="mb-10 grid grid-cols-2 gap-4">
          <button
            onClick={() => { window.location.href = `/api/auth/oauth/google`; }}
            className="flex items-center justify-center gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 h-14 transition-all hover:bg-white/10 hover:border-primary/50 group"
          >
            <Chrome className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest text-white">Google</span>
          </button>
          <button
            onClick={() => { window.location.href = `/api/auth/oauth/github`; }}
            className="flex items-center justify-center gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 h-14 transition-all hover:bg-white/10 hover:border-primary/50 group"
          >
            <Github className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest text-white">Github</span>
          </button>
        </div>

        <div className="relative mb-10 flex items-center justify-center">
          <div className="absolute inset-x-0 h-px bg-white/5" />
          <span className="relative bg-background px-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">أو عبر اللفائف التقليدية</span>
        </div>

        <AnimatePresence mode="wait">
          {errorStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0, x: [0, -5, 5, -5, 5, 0] }}
              exit={{ opacity: 0 }}
              className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-black flex items-center gap-3"
            >
              <AlertCircle className="h-5 w-5" />
              <p>{errorStatus}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-8">
          {!requires2FA ? (
            <form onSubmit={loginMode === 'password' ? handleSubmit(onSubmit) : (e) => { e.preventDefault(); }} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mr-1">معرف المحارب (البريد)</label>
                <div className="group relative">
                   <input
                     {...register('email')}
                     type="email"
                     className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 pr-12 pl-6 text-white text-sm font-bold outline-none ring-primary/20 transition-all focus:border-primary focus:ring-4"
                     placeholder="warrior@realm.com"
                     dir="rtl"
                   />
                   <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-primary transition-colors" />
                </div>
                {errors.email && <p className="mr-1 text-[10px] font-bold text-red-500 uppercase">{errors.email.message}</p>}
              </div>

              {loginMode === 'password' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="mr-1 flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">شيفرة الدخول</label>
                    <Link href="/forgot-password" title="نسيت كلمة المرور؟" className="text-[10px] font-black text-primary/70 hover:text-primary transition-colors uppercase tracking-widest">تذكر؟</Link>
                  </div>
                  <div className="group relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 pr-12 pl-12 text-white text-sm font-bold outline-none ring-primary/20 transition-all focus:border-primary focus:ring-4"
                      placeholder="••••••••"
                      dir="rtl"
                    />
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-primary transition-colors" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mr-1 text-[10px] font-bold text-red-500 uppercase">{errors.password.message}</p>}
                </motion.div>
              )}

              <div className="flex items-center justify-between px-1">
                 <div className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative flex items-center h-4">
                      <input
                        {...register('rememberMe')}
                        type="checkbox"
                        id="rememberMe"
                        className="h-4 w-4 rounded-md border-white/10 bg-white/5 text-primary focus:ring-primary/20"
                      />
                   </div>
                   <label htmlFor="rememberMe" className="text-[10px] font-bold text-gray-500 group-hover:text-gray-300 transition-colors cursor-pointer uppercase tracking-widest">تذكير (7 أيام)</label>
                 </div>
                 
                 <button
                   type="button"
                   onClick={() => setLoginMode(loginMode === 'password' ? 'magic-link' : 'password')}
                   className="flex items-center gap-2 text-[10px] font-black text-primary/70 hover:text-primary transition-all uppercase tracking-widest"
                 >
                   <Wand2 className="h-4 w-4" />
                   {loginMode === 'password' ? 'الدخول السحري' : 'الدخول بالشيفرة'}
                 </button>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-16 w-full rounded-2xl bg-primary text-black font-black text-lg overflow-hidden group shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <span className="uppercase tracking-widest">تفعيل الهوية والدخول</span>
                    <ArrowRight className="h-6 w-6 rotate-180 group-hover:-translate-x-2 transition-transform" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
              </Button>
            </form>
          ) : (
            <motion.form
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={onVerify2FA}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                 <div className="mx-auto h-20 w-20 rounded-3xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center animate-bounce">
                    <Zap className="h-10 w-10 text-primary" />
                 </div>
                 <h3 className="text-2xl font-black text-white uppercase tracking-tight">التحقق المزدوج</h3>
                 <p className="text-sm text-gray-500 font-medium">أدخل رمز الحماية من تطبيق المصادقة الخاص بك</p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full h-20 text-center text-4xl font-black tracking-[0.8em] rounded-3xl bg-white/5 border-2 border-white/10 text-primary shadow-inner outline-none transition-all focus:border-primary/50"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || twoFactorCode.length < 6}
                className="h-16 w-full rounded-2xl bg-primary text-black font-black text-lg group shadow-xl shadow-primary/20 transition-all"
              >
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "تحقق واختراق الأبواب"}
              </Button>

              <button
                type="button"
                onClick={() => setRequires2FA(false)}
                className="w-full text-xs font-black text-gray-500 hover:text-white uppercase tracking-widest"
              >
                العودة للساحة السابقة
              </button>
            </motion.form>
          )}
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-[0.1em]">
            لا تمتلك هوية مسجلة؟{' '}
            <Link href="/register" className="font-black text-white hover:text-primary transition-colors decoration-primary underline-offset-8 underline decoration-2">
              سجل بطولتك الآن
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}

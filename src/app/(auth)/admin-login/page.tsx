'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Lock, Loader2, AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import {
  sanitizeRedirectPath,
} from '@/services/auth/navigation';

const loginSchema = z.object({
  email: z.string().trim().email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId2FA, setUserId2FA] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const { verify2FA } = useAuth();

  const redirectUrl = useMemo(
    () => sanitizeRedirectPath(searchParams.get('redirect'), '/admin'),
    [searchParams]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const redirectAfterLogin = useCallback((target: string) => {
    router.replace(target);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user?.role === 'ADMIN') {
      redirectAfterLogin(redirectUrl);
    } else if (!isAuthLoading && isAuthenticated && user?.role !== 'ADMIN') {
        setErrorStatus('ليس لديك صلاحيات الوصول للوحة التحكم');
    }
  }, [isAuthLoading, isAuthenticated, user, redirectAfterLogin, redirectUrl]);

  const onSubmit = async (data: LoginFormValues) => {
    if (isAuthLoading || (isAuthenticated && user?.role === 'ADMIN')) return;
    setIsSubmitting(true);
    setErrorStatus(null);

    try {
      const result = await login(
        data.email.trim().toLowerCase(),
        data.password,
        true // Admin sessions should probably be remembered or have specific policy
      );

      if (result.success) {
        if (result.requires2FA) {
          setRequires2FA(true);
          setUserId2FA(result.userId || null);
          return;
        }
        // Success handled by useEffect
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
      const result = await verify2FA(userId2FA, twoFactorCode, true);
      if (result.success) {
        // Success handled by useEffect
        return;
      }
      setErrorStatus(result.error || 'رمز التحقق غير صحيح');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
        <div className="relative">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-red-500/20 border-t-red-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-red-500 animate-pulse" />
          </div>
        </div>
        <p className="animate-pulse text-sm font-medium text-red-400">جاري التحقق من الصلاحيات الأمنية...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Decorative background elements */}
      <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-red-600/10 blur-[120px] animate-pulse" />
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-orange-600/10 blur-[120px] animate-pulse" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gray-950/60 p-10 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShieldAlert size={120} className="text-red-500" />
        </div>

        <div className="mb-10 text-right relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-1.5 mb-4 border border-red-500/20">
            <ShieldCheck className="h-4 w-4 text-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">منطقة إدارية مقيدة</span>
          </div>
          <h2 className="text-4xl font-black tracking-tight text-white mb-3">دخول المدير</h2>
          <p className="text-gray-400 text-lg leading-relaxed">يرجى إدخال بيانات الاعتماد الخاصة بالنظام للوصول إلى لوحة التحكم</p>
        </div>

        <AnimatePresence mode="wait">
          {errorStatus && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, height: 0 }}
              animate={{ opacity: 1, scale: 1, height: 'auto', x: [0, -10, 10, -10, 10, 0] }}
              exit={{ opacity: 0, scale: 0.95, height: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8 flex items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-400 shadow-lg shadow-red-500/5"
            >
              <AlertCircle className="h-6 w-6 flex-shrink-0" />
              <p className="text-sm font-semibold">{errorStatus}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-8 relative z-10">
          {!requires2FA ? (
            <>
              <div className="space-y-3">
                <label className="mr-2 text-sm font-bold text-gray-400 uppercase tracking-wider">بريد المسؤول</label>
                <div className="group relative">
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] py-4 pr-12 pl-5 text-white outline-none transition-all placeholder:text-gray-600 focus:border-red-500/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-red-500/10 disabled:opacity-50"
                    placeholder="admin@thanawy.com"
                    dir="rtl"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 transition-colors group-focus-within:text-red-500">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>
                {errors.email && <p className="mr-2 mt-2 text-xs font-bold text-red-500/90 tracking-wide">{errors.email.message}</p>}
              </div>

              <div className="space-y-3">
                <div className="mr-2 flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">كلمة المرور</label>
                </div>
                <div className="group relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] py-4 pr-12 pl-14 text-white outline-none transition-all placeholder:text-gray-600 focus:border-red-500/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-red-500/10 disabled:opacity-50"
                    placeholder="⬢⬢⬢⬢⬢⬢⬢⬢⬢⬢⬢⬢"
                    dir="rtl"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 transition-colors group-focus-within:text-red-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-all transform hover:scale-110"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="mr-2 mt-2 text-xs font-bold text-red-500/90 tracking-wide">{errors.password.message}</p>}
              </div>

              <div className="pt-2">
                <button
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                    className="group relative w-full overflow-hidden rounded-[1.25rem] bg-gradient-to-r from-red-600 to-orange-600 px-6 py-5 font-black text-white shadow-xl shadow-red-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
                    {isSubmitting ? (
                    <Loader2 className="mx-auto h-7 w-7 animate-spin" />
                    ) : (
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-lg">تأكيد الهوية والدخول</span>
                        <ChevronRight className="h-6 w-6 rotate-180 transition-transform group-hover:-translate-x-1" />
                    </div>
                    )}
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <Link href="/login" className="text-sm font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-2 group">
                    <ArrowRight className="h-4 w-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                    العودة لصفحة الطلاب
                 </Link>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-700">Security Level: Enterprise</span>
              </div>
            </>
          ) : (
            <motion.form
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={onVerify2FA}
              className="space-y-8"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center p-5 rounded-3xl bg-red-500/10 mb-6 border border-red-500/20">
                  <ShieldAlert className="h-10 w-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">تأكيد أمني إضافي</h3>
                <p className="text-gray-400 font-medium">أدخل رمز الأمان من تطبيق المصادقة (2FA)</p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full text-center tracking-[0.8em] text-4xl font-black rounded-2xl border border-white/[0.08] bg-white/[0.03] py-6 text-white outline-none transition-all focus:border-red-500/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-red-500/10"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || twoFactorCode.length < 6}
                className="group relative w-full overflow-hidden rounded-[1.25rem] bg-gradient-to-r from-red-600 to-orange-600 px-6 py-5 font-black text-white shadow-xl shadow-red-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 className="mx-auto h-7 w-7 animate-spin" />
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-lg">تحقق وفتح الصلاحيات</span>
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setRequires2FA(false)}
                className="w-full text-sm font-bold text-gray-500 hover:text-white transition-colors"
              >
                إلغاء والمحاولة مرة أخرى
              </button>
            </motion.form>
          )}
        </div>
      </motion.div>
      
      {/* Footer info */}
      <div className="mt-8 flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
         <div className="h-8 w-24 bg-white/20 rounded-md animate-pulse" />
         <div className="h-8 w-24 bg-white/20 rounded-md animate-pulse delay-75" />
         <div className="h-8 w-24 bg-white/20 rounded-md animate-pulse delay-150" />
      </div>
    </div>
  );
}

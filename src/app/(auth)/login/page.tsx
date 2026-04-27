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
  Bot,
  Sparkles,
  KeyRound } from
'lucide-react';
import Link from 'next/link';
import { m, AnimatePresence } from "framer-motion";
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  sanitizeRedirectPath } from
'@/services/auth/navigation';
import { Suspense } from 'react';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().trim().email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة').optional().or(z.literal('')),
  rememberMe: z.boolean().optional()
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
    trigger
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false }
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

    if (loginMode === 'magic-link') {
      handleMagicLinkRequest();
      return;
    }

    setIsSubmitting(true);
    setErrorStatus(null);

    try {
      const result = await login(
        data.email.trim().toLowerCase(),
        data.password || '',
        data.rememberMe ?? false
      );

      if (result.success) {
        if (result.requires2FA) {
          toast.success('تم التحقق بنجاح، يرجى إدخال رمز التحقق المزدوج');
          setRequires2FA(true);
          setUserId2FA(result.userId || null);
          return;
        }
        toast.success('تم تسجيل الدخول بنجاح! جاري توجيهك...');
        redirectAfterLogin(redirectUrl);
        return;
      }

      setErrorStatus(result.error || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      toast.error(result.error || 'خطأ في بيانات الدخول');
    } catch (_err) {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLinkRequest = async () => {
    const emailValid = await trigger('email');
    if (!emailValid) return;

    setIsSubmitting(true);
    setErrorStatus(null);

    try {
      const email = getValues('email');
      const res = await fetch('/api/auth/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('تم إرسال رابط الدخول السحري إلى بريدك الإلكتروني');
        setErrorStatus('تم إرسال الرابط! تفقد بريدك الإلكتروني (بما في ذلك البريد المزعج).');
      } else {
        setErrorStatus(data.error || 'فشل إرسال رابط الدخول.');
        toast.error(data.error || 'حدث خطأ أثناء طلب الرابط');
      }
    } catch (_err) {
      toast.error('خطأ في الاتصال بالخادم');
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
        toast.success('تم التحقق بنجاح! مرحباً بك.');
        redirectAfterLogin(redirectUrl);
        return;
      }
      setErrorStatus(result.error || 'رمز التحقق غير صحيح');
      toast.error(result.error || 'فشل التحقق');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-6 text-center bg-black">
        <div className="relative h-24 w-24">
          <m.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]" />
          
          <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/5 backdrop-blur-sm">
             <Bot className="h-12 w-12 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="animate-pulse text-sm font-black uppercase tracking-[0.3em] text-primary">جاري استدعاء البيانات...</p>
          <p className="text-gray-500 text-xs font-medium">التحقق من صلاحيات الدخول للمملكة</p>
        </div>
      </div>);

  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-black overflow-hidden" dir="rtl">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full" />
      
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

      <m.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[500px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-8 md:p-12 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
        
        {/* Glow Border Effect */}
        <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-[2.5rem]" />
        
        <div className="mb-10 text-center space-y-4">
           <m.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
            
              <Shield className="w-10 h-10 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
           </m.div>
           <h2 className="text-4xl font-black text-white tracking-tight leading-tight">
             بوابـة <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">تـولـو</span>
           </h2>
           <p className="text-gray-400 font-medium">خطوتك الأولى نحو العظمة الدراسية</p>
        </div>

        {/* Auth Selection */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <m.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {window.location.href = `/api/auth/oauth/google`;}}
            className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 h-14 transition-all hover:bg-white/10 hover:border-primary/40 group">
            
            <Chrome className="h-5 w-5 text-red-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Google</span>
          </m.button>
          <m.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {window.location.href = `/api/auth/oauth/github`;}}
            className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 h-14 transition-all hover:bg-white/10 hover:border-primary/40 group">
            
            <Github className="h-5 w-5 text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Github</span>
          </m.button>
        </div>

        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute inset-x-0 h-px bg-white/5" />
          <span className="relative bg-[#0a0a0a] px-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">أو استخدام المعرف الإلكتروني</span>
        </div>

        <AnimatePresence mode="wait">
          {errorStatus &&
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden">
            
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{errorStatus}</p>
                  {errorStatus.includes('تفعيل') &&
                <button
                  type="button"
                  onClick={async () => {
                    const email = getValues('email');
                    if (!email) {
                      toast.error('يرجى إدخال البريد الإلكتروني أولاً');
                      return;
                    }
                    const promise = fetch('/api/auth/resend-verification', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email })
                    });

                    toast.promise(promise, {
                      loading: 'جاري إرسال رابط التفعيل...',
                      success: 'تم إرسال الرابط بنجاح!',
                      error: 'فشل إرسال الرابط. حاول لاحقاً.'
                    });
                  }}
                  className="mt-2 text-[10px] font-black underline uppercase tracking-widest text-primary/80 hover:text-primary">
                  
                      إعادة إرسال الرابط
                    </button>
                }
                </div>
              </div>
            </m.div>
          }
        </AnimatePresence>

        <div className="space-y-6">
          {!requires2FA ?
          <m.form
            layout
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6">
            
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest mr-1">البريد الإلكتروني</label>
                <div className="group relative">
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors flex items-center justify-center">
                     <Mail size={18} />
                   </div>
                   <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 pr-12 pl-6 text-white text-sm font-bold outline-none ring-primary/20 transition-all focus:border-primary/50 focus:bg-white/10"
                  placeholder="warrior@thanawy.me" />
                
                </div>
                {errors.email && <p className="mr-1 text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.email.message}</p>}
              </div>

              <AnimatePresence mode="wait">
                {loginMode === 'password' &&
              <m.div
                key="password-field"
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                className="space-y-2">
                
                    <div className="mr-1 flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">كلمة المرور</label>
                      <Link href="/forgot-password" disable-nav="true" className="text-[10px] font-black text-primary/60 hover:text-primary transition-colors uppercase tracking-widest">نسيت؟</Link>
                    </div>
                    <div className="group relative">
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors flex items-center justify-center">
                        <Lock size={18} />
                      </div>
                      <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 pr-12 pl-12 text-white text-sm font-bold outline-none ring-primary/20 transition-all focus:border-primary/50 focus:bg-white/10"
                    placeholder="⬢⬢⬢⬢⬢⬢⬢⬢" />
                  
                      <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-2">
                    
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p className="mr-1 text-[10px] font-bold text-red-500 uppercase tracking-tight">{errors.password.message}</p>}
                  </m.div>
              }
              </AnimatePresence>

              <div className="flex items-center justify-between px-1">
                 <div className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative flex items-center">
                      <input
                    {...register('rememberMe')}
                    type="checkbox"
                    id="rememberMe"
                    className="h-4 w-4 appearance-none rounded-md border border-white/20 bg-white/5 checked:bg-primary checked:border-primary transition-all cursor-pointer" />
                  
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-checked:opacity-100">
                        <svg className="h-3 w-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                   </div>
                   <label htmlFor="rememberMe" className="text-[10px] font-bold text-gray-500 group-hover:text-gray-300 transition-colors cursor-pointer uppercase tracking-widest">تذكرني</label>
                 </div>
                 
                 <button
                type="button"
                onClick={() => setLoginMode(loginMode === 'password' ? 'magic-link' : 'password')}
                className="flex items-center gap-2 text-[10px] font-black text-primary/60 hover:text-primary transition-all uppercase tracking-widest group">
                
                   {loginMode === 'password' ?
                <>
                        <Wand2 className="h-3 w-3 group-hover:rotate-12 transition-transform" />
                        <span>رابط الدخول السريع</span>
                     </> :

                <>
                        <KeyRound className="h-3 w-3" />
                        <span>كلمة السـر</span>
                     </>
                }
                 </button>
              </div>

              <m.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                type="submit"
                disabled={isSubmitting}
                className="h-14 w-full rounded-2xl bg-primary text-black font-black text-md overflow-hidden relative group hover:shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all">
                
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {isSubmitting ?
                <Loader2 className="h-5 w-5 animate-spin mx-auto" /> :

                <div className="flex items-center justify-center gap-3">
                      <span className="uppercase tracking-[0.2em]">
                        {loginMode === 'password' ? 'تأكيـد الدخـول' : 'إرسـال الرابـط'}
                      </span>
                      <ArrowRight className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                    </div>
                }
                </Button>
              </m.div>
            </m.form> :

          <m.form
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={onVerify2FA}
            className="space-y-8">
            
              <div className="text-center space-y-4">
                 <div className="mx-auto h-20 w-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center relative">
                    <div className="absolute inset-0 animate-ping rounded-3xl bg-primary/5" />
                    <Zap className="h-10 w-10 text-primary" />
                 </div>
                 <h3 className="text-2xl font-black text-white uppercase tracking-tight">الدرع المـزدوج</h3>
                 <p className="text-sm text-gray-500 font-medium">أدخل رمز الحماية من تطبيق المصادقة</p>
              </div>

              <div className="flex justify-center flex-row-reverse gap-3">
                <input
                type="text"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full h-20 text-center text-5xl font-black tracking-[0.6em] rounded-3xl bg-white/5 border border-white/10 text-primary outline-none transition-all focus:border-primary/50 focus:bg-white/10"
                placeholder="000000"
                autoFocus />
              
              </div>

              <div className="space-y-4">
                <Button
                type="submit"
                disabled={isSubmitting || twoFactorCode.length < 6}
                className="h-14 w-full rounded-2xl bg-primary text-black font-black text-md shadow-xl group">
                
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "تحقق وآخترق"}
                </Button>

                <button
                type="button"
                onClick={() => setRequires2FA(false)}
                className="w-full text-[10px] font-black text-gray-500 hover:text-white transition-colors uppercase tracking-[0.2em]">
                
                  العودة للخلف
                </button>
              </div>
            </m.form>
          }
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            لا تمتلك دعـوة؟{' '}
            <Link href="/register" className="font-black text-white hover:text-primary transition-all border-b border-white/20 hover:border-primary pb-0.5">
              انشـئ هويتك الآن
            </Link>
          </p>
        </div>
        
        {/* Subtle Bottom Decorations */}
        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between opacity-30">
          <Sparkles size={12} className="text-primary" />
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500">Security Rank: Grade A</span>
          <Sparkles size={12} className="text-primary" />
        </div>
      </m.div>
    </div>);

}

export default function LoginPage() {
  return (
    <Suspense fallback={
    <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>);

}
"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
  KeyRound,
  ShieldCheck,
  Smartphone,
  Globe,
  Fingerprint,
  Cpu,
  ShieldAlert,
  History
} from 'lucide-react';
import Link from 'next/link';
import { m, AnimatePresence } from "framer-motion";
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  sanitizeRedirectPath
} from '@/services/auth/navigation';
import { Suspense } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- Validation Schema ---
const loginSchema = z.object({
  email: z.string().trim().min(1, 'البريد الإلكتروني مطلوب').email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة').optional().or(z.literal('')),
  rememberMe: z.boolean().optional()
});

type LoginFormValues = z.infer<typeof loginSchema>;

// --- Helper for Device Info ---
const getDeviceInfo = () => {
  if (typeof window === 'undefined') return { os: 'Unknown', browser: 'Unknown' };
  const ua = window.navigator.userAgent;
  let os = "نظام غير معروف";
  if (ua.indexOf("Win") !== -1) os = "Windows";
  if (ua.indexOf("Mac") !== -1) os = "macOS";
  if (ua.indexOf("Linux") !== -1) os = "Linux";
  if (ua.indexOf("Android") !== -1) os = "Android";
  if (ua.indexOf("like Mac") !== -1) os = "iOS";

  let browser = "متصفح غير معروف";
  if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
  else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
  else if (ua.indexOf("Safari") !== -1) browser = "Safari";
  else if (ua.indexOf("Edge") !== -1) browser = "Edge";

  return { os, browser };
};

// --- Sub-components ---

function OTPInput({ value, onChange, disabled }: { value: string, onChange: (val: string) => void, disabled?: boolean }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (isNaN(Number(val))) return;

    const newOTP = value.split('');
    newOTP[index] = val.substring(val.length - 1);
    const updatedValue = newOTP.join('');
    onChange(updatedValue);

    if (val && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-3" dir="ltr">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <m.input
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          disabled={disabled}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className={cn(
            "w-12 h-16 text-center text-2xl font-black rounded-xl bg-white/5 border border-white/10 text-primary outline-none transition-all focus:border-primary/50 focus:bg-white/10 focus:ring-4 focus:ring-primary/20",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      ))}
    </div>
  );
}

function PremiumInput({ 
  label, 
  icon: Icon, 
  error, 
  type = "text", 
  registration, 
  showPasswordToggle,
  onTogglePassword,
  showPassword
}: any) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  return (
    <div className="space-y-2">
      <m.div 
        animate={{ 
          borderColor: isFocused ? "rgba(255,109,0,0.5)" : "rgba(255,255,255,0.1)",
          backgroundColor: isFocused ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)"
        }}
        className={cn(
          "relative border rounded-2xl overflow-hidden transition-shadow duration-300",
          isFocused ? "ring-4 ring-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.1)]" : "",
          error ? "border-red-500/50" : ""
        )}
      >
        <div className={cn(
          "absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-300",
          isFocused ? "text-primary" : "text-gray-500"
        )}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        
        <input
          {...registration}
          type={type}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            setHasValue(!!e.target.value);
            registration.onBlur(e);
          }}
          onChange={(e) => {
            registration.onChange(e);
            setHasValue(!!e.target.value);
          }}
          placeholder=" "
          className={cn(
            "peer w-full h-16 pr-12 pl-6 text-white text-base font-bold outline-none bg-transparent"
          )}
        />
        
        <m.label 
          animate={{
            y: (isFocused || hasValue) ? -18 : 0,
            scale: (isFocused || hasValue) ? 0.75 : 1,
            color: isFocused ? "rgba(255,109,0,0.8)" : "rgba(107,114,128,1)"
          }}
          className={cn(
            "absolute right-12 top-1/2 -translate-y-1/2 font-bold pointer-events-none origin-right transition-all",
            (isFocused || hasValue) ? "text-[10px]" : "text-sm"
          )}
        >
          {label}
        </m.label>

        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-2"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </m.div>
      <AnimatePresence>
        {error && (
          <m.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1 px-2 overflow-hidden"
          >
            <ShieldAlert size={12} className="text-red-500" />
            <p className="text-[10px] font-black text-red-500 uppercase tracking-tight">
              {error.message}
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Main Form Component ---

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: isAuthLoading, verify2FA } = useAuth();
  
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<'password' | 'magic-link'>('password');
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId2FA, setUserId2FA] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [deviceInfo, setDeviceInfo] = useState({ os: '', browser: '' });

  useEffect(() => {
    setDeviceInfo(getDeviceInfo());
  }, []);

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
        toast.success('مرحباً بك مجدداً في تولو');
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
        toast.success('تم إرسال رابط الدخول السحري');
        setErrorStatus('تفقد بريدك الإلكتروني للحصول على رابط الدخول السريع.');
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
        toast.success('تم التحقق من الدرع المزدوج بنجاح');
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
      <m.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-screen flex-col items-center justify-center space-y-12 text-center bg-[#050505]"
      >
        <div className="relative">
          <m.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="h-40 w-40 rounded-full border-[10px] border-primary/10 border-t-primary shadow-[0_0_80px_rgba(var(--primary),0.3)]" 
          />
          <div className="absolute inset-0 flex items-center justify-center">
             <Bot className="h-16 w-16 text-primary animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black text-white tracking-[0.3em] uppercase">المعالجة الآمنة</h2>
          <div className="text-[12px] font-black text-primary/60 uppercase tracking-[0.5em] flex items-center justify-center gap-4">
            <span className="w-24 h-px bg-primary/20" />
            جاري المزامنة مع النظام
            <span className="w-24 h-px bg-primary/20" />
          </div>
        </div>
      </m.div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#020202] overflow-hidden selection:bg-primary/30" dir="rtl">
      {/* Structural Background Layers */}
      <div className="absolute inset-0 pointer-events-none">
        <m.div 
          animate={{ 
            opacity: [0.1, 0.2, 0.1],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_20%,rgba(255,109,0,0.1),transparent_40%)]" 
        />
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_80%,rgba(37,99,235,0.05),transparent_40%)]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>

      <m.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden rounded-[2.5rem] border border-white/5 bg-black/60 backdrop-blur-3xl shadow-[0_40px_120px_rgba(0,0,0,0.9)]"
      >
        
        {/* Left Panel: Visual/Security Context (Visible on Desktop) */}
        <div className="hidden lg:flex flex-col justify-between p-16 bg-gradient-to-br from-white/[0.02] to-transparent border-l border-white/5">
          <div className="space-y-12">
            <m.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <ShieldCheck className="text-primary w-6 h-6" />
              </div>
              <div>
                <h4 className="text-white font-black text-lg">نظام تولو الموحد</h4>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">TLS 1.3 | SHA-256 AES</p>
              </div>
            </m.div>

            <div className="space-y-10">
              <m.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <h2 className="text-5xl font-black text-white leading-tight">
                  ولوج آمن<br />
                  <span className="text-primary">لهويتك الرقمية</span>
                </h2>
                <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-sm">
                  استخدم مفاتيح التشفير المتقدمة للوصول إلى كافة خدمات المنصة التعليمية بخصوصية تامة.
                </p>
              </m.div>

              <div className="grid grid-cols-2 gap-6">
                {[
                  { icon: Fingerprint, label: "بصمة رقمية", sub: "مشفرة بالكامل" },
                  { icon: Globe, label: "وصول عالمي", sub: "سحابة موزعة" },
                  { icon: Zap, label: "أداء فائق", sub: "استجابة فورية" },
                  { icon: History, label: "سجل الأمان", sub: "مراقبة حية" }
                ].map((item, idx) => (
                  <m.div 
                    key={idx}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                    className="p-5 rounded-3xl bg-white/5 border border-white/5 space-y-3 hover:bg-white/10 transition-colors cursor-default"
                  >
                    <item.icon className="text-primary w-6 h-6" />
                    <div>
                      <div className="text-white font-bold text-sm">{item.label}</div>
                      <div className="text-gray-500 text-[10px] uppercase font-black tracking-widest">{item.sub}</div>
                    </div>
                  </m.div>
                ))}
              </div>
            </div>
          </div>

          <m.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-6 p-6 rounded-3xl bg-primary/5 border border-primary/10"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Cpu className="text-primary w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-white font-black text-xs">سجل الولوج الحالي</p>
              <p className="text-gray-400 text-[10px] font-medium leading-none">
                {deviceInfo.browser} على {deviceInfo.os} | TR-Node-X1
              </p>
            </div>
          </m.div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="p-8 md:p-16 lg:p-20 bg-[#080808]/40">
          <div className="max-w-[420px] mx-auto space-y-10">
            {/* Mobile Header */}
            <div className="lg:hidden text-center space-y-4 mb-8">
               <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <ShieldCheck className="text-primary w-8 h-8" />
               </div>
               <h1 className="text-3xl font-black text-white">بوابة تولو</h1>
            </div>

            <div className="space-y-2">
              <h3 className="text-3xl font-black text-white tracking-tight">تسجيل الدخول</h3>
              <p className="text-gray-500 font-bold text-sm">أدخل بيانات الهوية للمتابعة</p>
            </div>

            <AnimatePresence mode="wait">
              {!requires2FA ? (
                <m.div 
                  key="login-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {/* Error Banner */}
                  <AnimatePresence>
                    {errorStatus && (
                      <m.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-start gap-3"
                      >
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <p>{errorStatus}</p>
                          {errorStatus.includes('تفعيل') && (
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
                                  error: 'فشل إرسال الرابط.'
                                });
                              }}
                              className="text-[10px] font-black underline uppercase tracking-widest text-primary/80 hover:text-primary transition-colors"
                            >
                              إعادة إرسال الرابط
                            </button>
                          )}
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>

                  <form 
                    noValidate
                    onSubmit={handleSubmit(onSubmit)} 
                    className="space-y-6"
                  >
                    <PremiumInput
                      label="البريد الإلكتروني"
                      icon={Mail}
                      registration={register('email')}
                      error={errors.email}
                    />

                    {loginMode === 'password' && (
                      <m.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">تشفير AES-256</span>
                          <Link 
                            href="/forgot-password" 
                            className="text-[10px] font-black text-primary/60 hover:text-primary transition-colors uppercase tracking-widest"
                          >
                            نسيت كلمة السر؟
                          </Link>
                        </div>
                        <PremiumInput
                          label="كلمة المرور"
                          type={showPassword ? 'text' : 'password'}
                          icon={Lock}
                          registration={register('password')}
                          error={errors.password}
                          showPasswordToggle
                          onTogglePassword={() => setShowPassword(!showPassword)}
                          showPassword={showPassword}
                        />
                      </m.div>
                    )}

                    <div className="flex items-center justify-between px-2">
                      <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div className="relative">
                          <input
                            {...register('rememberMe')}
                            type="checkbox"
                            className="peer sr-only"
                          />
                          <div className="w-6 h-6 rounded-lg border-2 border-white/10 bg-white/5 transition-all peer-checked:border-primary peer-checked:bg-primary/20 flex items-center justify-center">
                            <m.div 
                              animate={{ scale: getValues('rememberMe') ? 1 : 0, opacity: getValues('rememberMe') ? 1 : 0 }}
                              className="w-3 h-3 rounded-sm bg-primary shadow-[0_0_10px_rgba(255,109,0,0.5)]" 
                            />
                          </div>
                        </div>
                        <span className="text-[11px] font-black text-gray-500 group-hover:text-gray-300 uppercase tracking-widest transition-colors">
                          تذكر هويتي
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setLoginMode(loginMode === 'password' ? 'magic-link' : 'password')}
                        className="flex items-center gap-2 text-[11px] font-black text-primary/70 hover:text-primary uppercase tracking-widest transition-colors group"
                      >
                        {loginMode === 'password' ? (
                          <>
                            <Wand2 className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                            <span>الدخول السريع</span>
                          </>
                        ) : (
                          <>
                            <KeyRound className="h-4 w-4" />
                            <span>استخدام كلمة السر</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-16 w-full rounded-2xl bg-primary text-black font-black text-lg relative overflow-hidden transition-all active:scale-[0.98] shadow-[0_15px_30px_rgba(255,109,0,0.2)]"
                      >
                        <m.div 
                          className="absolute inset-0 bg-white/20"
                          initial={{ y: "100%" }}
                          whileHover={{ y: 0 }}
                          transition={{ duration: 0.3 }}
                        />
                        {isSubmitting ? (
                          <div className="flex items-center justify-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span>جاري التحقق...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-4 relative z-10">
                            <span className="uppercase tracking-[0.2em]">
                              {loginMode === 'password' ? 'تأكيـد الـولـوج' : 'إرسـال رابـط الـولـوج'}
                            </span>
                            <ArrowRight className="h-5 w-5 rotate-180 group-hover:-translate-x-2 transition-transform" />
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>

                  <div className="relative py-4">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-white/5" />
                    <span className="relative block mx-auto w-fit bg-[#080808] px-4 text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">
                      أو عبر المنصات
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <m.button
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { window.location.href = `/api/auth/oauth/google`; }}
                      className="flex items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/5 h-16 transition-colors"
                    >
                      <Chrome className="h-5 w-5 text-red-500" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Google</span>
                    </m.button>
                    <m.button
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { window.location.href = `/api/auth/oauth/github`; }}
                      className="flex items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/5 h-16 transition-colors"
                    >
                      <Github className="h-5 w-5 text-white" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Github</span>
                    </m.button>
                  </div>
                </m.div>
              ) : (
                <m.div 
                  key="2fa-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-10"
                >
                  <div className="text-center space-y-6">
                    <m.div 
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="mx-auto h-24 w-24 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center"
                    >
                      <Zap className="h-12 w-12 text-primary" />
                    </m.div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black text-white uppercase tracking-tight">الدرع المزدوج</h3>
                      <p className="text-gray-400 font-medium">أدخل رمز الحماية المكون من 6 أرقام</p>
                    </div>
                  </div>

                  <form onSubmit={onVerify2FA} className="space-y-10">
                    <OTPInput 
                      value={twoFactorCode} 
                      onChange={setTwoFactorCode} 
                      disabled={isSubmitting} 
                    />

                    <div className="space-y-4">
                      <Button
                        type="submit"
                        disabled={isSubmitting || twoFactorCode.length < 6}
                        className="h-16 w-full rounded-2xl bg-primary text-black font-black text-lg shadow-2xl transition-all active:scale-[0.98] group relative overflow-hidden"
                      >
                         <m.div 
                            className="absolute inset-0 bg-white/20"
                            initial={{ y: "100%" }}
                            whileHover={{ y: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                         <span className="relative z-10">
                          {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "تحقق وآمن"}
                         </span>
                      </Button>

                      <button
                        type="button"
                        onClick={() => setRequires2FA(false)}
                        className="w-full text-[11px] font-black text-gray-500 hover:text-white transition-colors uppercase tracking-[0.3em]"
                      >
                        العودة للخلف
                      </button>
                    </div>
                  </form>
                </m.div>
              )}
            </AnimatePresence>

            {/* Footer Metadata */}
            <m.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="pt-10 border-t border-white/5 text-center space-y-6"
            >
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-loose">
                لا تمتلك هوية رقمية؟<br />
                <Link href="/register" className="font-black text-white hover:text-primary transition-all border-b border-white/20 hover:border-primary pb-0.5">
                  انشـئ هويتك الآن
                </Link>
              </p>
              
              <div className="flex items-center justify-center gap-6 opacity-30">
                <div className="flex items-center gap-2">
                   <Shield size={12} className="text-primary" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Security Encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                   <Smartphone size={12} className="text-primary" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Device Verified</span>
                </div>
              </div>
            </m.div>
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
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

function SecurityBit({ delay = 0 }) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: [0, 0.2, 0],
        scale: [0.5, 1.2, 0.5],
        y: [-20, -100],
        x: [0, Math.random() * 40 - 20]
      }}
      transition={{ 
        duration: 4, 
        repeat: Infinity, 
        delay,
        ease: "linear"
      }}
      className="w-1 h-1 bg-primary/40 rounded-full blur-[1px]"
    />
  );
}

function ProcessingState() {
  return (
    <div className="flex flex-col items-center justify-center space-y-12 py-20">
      <div className="relative">
        <m.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-48 h-48 rounded-full border-2 border-primary/10 border-t-primary/40"
        />
        <m.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4 rounded-full border-2 border-white/5 border-b-primary/30"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <m.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 rounded-[2rem] bg-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_50px_rgba(255,109,0,0.2)]"
          >
            <ShieldCheck className="text-primary w-10 h-10" />
          </m.div>
        </div>
      </div>
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">جاري المصادقة الآمنة</h2>
        <div className="flex items-center justify-center gap-3">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <p className="text-primary/50 text-[10px] font-black uppercase tracking-[0.4em]">Establishing Neural Link</p>
        </div>
      </div>
    </div>
  );
}

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
    <div className="space-y-2 group/input">
      <m.div 
        animate={{ 
          borderColor: error ? "rgba(239,68,68,0.4)" : (isFocused ? "rgba(255,109,0,0.5)" : "rgba(255,255,255,0.08)"),
          backgroundColor: isFocused ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
          scale: isFocused ? 1.01 : 1,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "relative border rounded-[1.5rem] overflow-hidden transition-shadow duration-300 backdrop-blur-sm",
          isFocused ? "shadow-[0_0_25px_rgba(255,109,0,0.15)]" : "shadow-sm",
          error ? "ring-2 ring-red-500/20" : ""
        )}
      >
        <div className={cn(
          "absolute right-5 top-1/2 -translate-y-1/2 transition-all duration-300 z-10",
          isFocused ? "text-primary scale-110" : "text-gray-500",
          error ? "text-red-400" : ""
        )}>
          <Icon size={22} strokeWidth={2.5} />
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
            "peer w-full h-16 pr-14 pl-6 text-white text-base font-bold outline-none bg-transparent relative z-0"
          )}
        />
        
        <m.label 
          animate={{
            y: (isFocused || hasValue) ? -18 : 0,
            scale: (isFocused || hasValue) ? 0.75 : 1,
            x: (isFocused || hasValue) ? 10 : 0,
            color: error ? "rgba(239,68,68,1)" : (isFocused ? "rgba(255,109,0,0.9)" : "rgba(107,114,128,1)")
          }}
          className={cn(
            "absolute right-14 top-1/2 -translate-y-1/2 font-bold pointer-events-none origin-right transition-all z-10",
            (isFocused || hasValue) ? "text-[10px]" : "text-sm"
          )}
        >
          {label}
        </m.label>

        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-2.5 z-20"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </m.div>
      <AnimatePresence>
        {error && (
          <m.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2 px-3 overflow-hidden"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <p className="text-[11px] font-black text-red-400 uppercase tracking-tight">
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
  const { login, isAuthenticated, isLoading: isAuthLoading, verify2FA, requestMagicLink, resendVerification } = useAuth();
  
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
      const result = await requestMagicLink(email);
      
      if (result.success) {
        toast.success('تم إرسال رابط الدخول السحري');
        setErrorStatus('تفقد بريدك الإلكتروني للحصول على رابط الدخول السريع.');
      } else {
        setErrorStatus(result.error || 'فشل إرسال رابط الدخول.');
        toast.error(result.error || 'حدث خطأ أثناء طلب الرابط');
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
      <div className="min-h-screen bg-[#020202] flex items-center justify-center p-4">
        <m.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[600px]"
        >
          <ProcessingState />
        </m.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#020202] overflow-hidden selection:bg-primary/30" dir="rtl">
      {/* Structural Background Layers */}
      <div className="absolute inset-0 pointer-events-none">
        <m.div 
          animate={{ 
            opacity: [0.1, 0.15, 0.1],
            scale: [1, 1.05, 1]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_20%,rgba(255,109,0,0.12),transparent_45%)]" 
        />
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_80%,rgba(37,99,235,0.08),transparent_45%)]" />
        
        {/* Animated Security Bits */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}>
              <SecurityBit delay={Math.random() * 5} />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <m.div 
        initial={{ opacity: 0, y: 20, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[1150px] grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden rounded-[3rem] border border-white/5 bg-black/40 backdrop-blur-3xl shadow-[0_50px_150px_rgba(0,0,0,0.9)]"
      >
        
        {/* Left Panel: Visual/Security Context (Visible on Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-16 bg-gradient-to-br from-white/[0.03] to-transparent border-l border-white/5 relative group">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          
          <div className="space-y-16 relative z-10">
            <m.div 
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,109,0,0.2)]">
                <ShieldCheck className="text-primary w-7 h-7" />
              </div>
              <div>
                <h4 className="text-white font-black text-xl tracking-tight">نظام تولو الموحد</h4>
                <p className="text-primary/50 text-[10px] font-black uppercase tracking-[0.3em]">Quantum-Ready Auth</p>
              </div>
            </m.div>

            <div className="space-y-12">
              <m.div 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-6"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-2">
                  <Sparkles size={12} />
                  إصدار 2.5 المستقر
                </div>
                <h2 className="text-6xl font-black text-white leading-[1.1] tracking-tighter">
                  ولوج ذكي<br />
                  <span className="text-primary">لمستقبلك</span>
                </h2>
                <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-sm">
                  استمتع بتجربة تعليمية فريدة مدعومة بأقوى أنظمة التشفير والحماية العالمية.
                </p>
              </m.div>

              <div className="grid grid-cols-2 gap-5">
                {[
                  { icon: Fingerprint, label: "بصمة رقمية", sub: "AES-256 GCM" },
                  { icon: Globe, label: "سحابة تولو", sub: "Edge Network" },
                  { icon: Zap, label: "ذكاء اصطناعي", sub: "Adaptive Security" },
                  { icon: History, label: "سجل الأمان", sub: "Live Monitoring" }
                ].map((item, idx) => (
                  <m.div 
                    key={idx}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="p-6 rounded-[2rem] bg-white/5 border border-white/5 space-y-4 hover:bg-white/10 hover:border-primary/20 transition-all cursor-default group/card"
                  >
                    <item.icon className="text-primary w-6 h-6 group-hover/card:scale-110 transition-transform" />
                    <div>
                      <div className="text-white font-bold text-sm">{item.label}</div>
                      <div className="text-gray-500 text-[9px] uppercase font-black tracking-widest group-hover/card:text-primary/60 transition-colors">{item.sub}</div>
                    </div>
                  </m.div>
                ))}
              </div>
            </div>
          </div>

          <m.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="flex items-center gap-6 p-7 rounded-[2rem] bg-primary/5 border border-primary/10 backdrop-blur-md"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
              <Cpu className="text-primary w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-white font-black text-xs uppercase tracking-wider">الجهاز موثوق</p>
              </div>
              <p className="text-gray-500 text-[10px] font-bold leading-none">
                {deviceInfo.browser} / {deviceInfo.os} | <span className="text-primary/40">Secure Node #781</span>
              </p>
            </div>
          </m.div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="lg:col-span-7 p-10 md:p-16 lg:p-24 bg-[#080808]/50 flex flex-col justify-center">
          <div className="max-w-[440px] mx-auto w-full space-y-12">
            {/* Mobile Header */}
            <div className="lg:hidden text-center space-y-6 mb-12">
               <div className="mx-auto w-20 h-20 rounded-[2rem] bg-primary/20 border border-primary/30 flex items-center justify-center shadow-2xl">
                  <ShieldCheck className="text-primary w-10 h-10" />
               </div>
               <div className="space-y-2">
                 <h1 className="text-4xl font-black text-white">تولو التعليمية</h1>
                 <p className="text-primary/60 text-xs font-black uppercase tracking-[0.4em]">Integrated Learning</p>
               </div>
            </div>

            <div className="space-y-3">
              <m.h3 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-4xl font-black text-white tracking-tight"
              >
                تسجيل الدخول
              </m.h3>
              <m.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-gray-500 font-bold text-sm"
              >
                أدخل بيانات الهوية الرقمية للمتابعة إلى حسابك
              </m.p>
            </div>

            <AnimatePresence mode="wait">
              {!requires2FA ? (
                <m.div 
                  key="login-form"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.4, ease: "circOut" }}
                  className="space-y-10"
                >
                  {/* Error Banner */}
                  <AnimatePresence>
                    {errorStatus && (
                      <m.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-start gap-4 shadow-2xl backdrop-blur-xl"
                      >
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                          <AlertCircle className="h-6 w-6" />
                        </div>
                        <div className="flex-1 space-y-2 pt-1">
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
                                const promise = resendVerification(email);
                                toast.promise(promise, {
                                  loading: 'جاري إرسال رابط التفعيل...',
                                  success: 'تم إرسال الرابط بنجاح!',
                                  error: 'فشل إرسال الرابط.'
                                });
                              }}
                              className="text-[10px] font-black underline uppercase tracking-widest text-primary/80 hover:text-primary transition-colors flex items-center gap-1"
                            >
                              إعادة إرسال الرابط <ArrowRight size={10} className="rotate-180" />
                            </button>
                          )}
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>

                  <form 
                    noValidate
                    onSubmit={handleSubmit(onSubmit)} 
                    className="space-y-7"
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
                        className="space-y-3 overflow-hidden"
                      >
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Lock size={10} className="text-primary/40" />
                            تشفير طرف لـ طرف
                          </span>
                          <Link 
                            href="/forgot-password" 
                            className="text-[10px] font-black text-primary/60 hover:text-primary transition-colors uppercase tracking-widest border-b border-primary/10 hover:border-primary"
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
                      <label className="flex items-center gap-4 cursor-pointer group select-none">
                        <div className="relative">
                          <input
                            {...register('rememberMe')}
                            type="checkbox"
                            className="peer sr-only"
                          />
                          <div className="w-7 h-7 rounded-xl border-2 border-white/10 bg-white/5 transition-all peer-checked:border-primary peer-checked:bg-primary/20 flex items-center justify-center group-hover:border-primary/50 shadow-inner">
                            <m.div 
                              animate={{ 
                                scale: getValues('rememberMe') ? 1 : 0, 
                                opacity: getValues('rememberMe') ? 1 : 0,
                                rotate: getValues('rememberMe') ? 0 : -45
                              }}
                              className="w-3.5 h-3.5 rounded-md bg-primary shadow-[0_0_15px_rgba(255,109,0,0.6)]" 
                            />
                          </div>
                        </div>
                        <span className="text-[11px] font-black text-gray-500 group-hover:text-gray-300 uppercase tracking-[0.2em] transition-colors">
                          تذكر هويتي
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setLoginMode(loginMode === 'password' ? 'magic-link' : 'password')}
                        className="flex items-center gap-3 text-[11px] font-black text-primary/70 hover:text-primary uppercase tracking-[0.15em] transition-all group px-4 py-2 rounded-xl bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20"
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

                    <div className="pt-6">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-20 w-full rounded-[1.5rem] bg-primary text-black font-black text-xl relative overflow-hidden transition-all active:scale-[0.97] shadow-[0_20px_40px_rgba(255,109,0,0.3)] hover:shadow-primary/40 group"
                      >
                        <m.div 
                          className="absolute inset-0 bg-white/30"
                          initial={{ x: "-100%" }}
                          whileHover={{ x: "100%" }}
                          transition={{ duration: 0.6 }}
                        />
                        {isSubmitting ? (
                          <div className="flex items-center justify-center gap-4">
                            <Loader2 className="h-7 w-7 animate-spin" />
                            <span className="uppercase tracking-widest">جاري التحقق...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-5 relative z-10">
                            <span className="uppercase tracking-[0.3em]">
                              {loginMode === 'password' ? 'تأكيـد الـولـوج' : 'إرسـال رابـط الـولـوج'}
                            </span>
                            <m.div
                              animate={{ x: [0, -5, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <ArrowRight className="h-6 w-6 rotate-180" />
                            </m.div>
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>

                  <div className="relative py-2">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                    <span className="relative block mx-auto w-fit bg-[#080808] px-6 text-[11px] font-black uppercase tracking-[0.4em] text-gray-600">
                      أو عبر المنصات
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <m.button
                      whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.2)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { window.location.href = `/api/auth/oauth/google`; }}
                      className="flex items-center justify-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] h-16 transition-all shadow-sm"
                    >
                      <Chrome className="h-5 w-5 text-red-500" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Google</span>
                    </m.button>
                    <m.button
                      whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.2)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { window.location.href = `/api/auth/oauth/github`; }}
                      className="flex items-center justify-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] h-16 transition-all shadow-sm"
                    >
                      <Github className="h-5 w-5 text-white" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Github</span>
                    </m.button>
                  </div>
                </m.div>
              ) : (
                <m.div 
                  key="2fa-form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.4, ease: "backOut" }}
                  className="space-y-12"
                >
                  <div className="text-center space-y-8">
                    <m.div 
                      animate={{ 
                        boxShadow: ["0 0 20px rgba(255,109,0,0.2)", "0 0 50px rgba(255,109,0,0.4)", "0 0 20px rgba(255,109,0,0.2)"],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="mx-auto h-28 w-28 rounded-[2.5rem] bg-primary/10 border border-primary/30 flex items-center justify-center backdrop-blur-xl"
                    >
                      <Zap className="h-14 w-14 text-primary" />
                    </m.div>
                    <div className="space-y-3">
                      <h3 className="text-4xl font-black text-white uppercase tracking-tight">الدرع المزدوج</h3>
                      <p className="text-gray-400 font-medium">أدخل رمز الحماية المكون من 6 أرقام لتأكيد الهوية</p>
                    </div>
                  </div>

                  <form onSubmit={onVerify2FA} className="space-y-12">
                    <OTPInput 
                      value={twoFactorCode} 
                      onChange={setTwoFactorCode} 
                      disabled={isSubmitting} 
                    />

                    <div className="space-y-5">
                      <Button
                        type="submit"
                        disabled={isSubmitting || twoFactorCode.length < 6}
                        className="h-20 w-full rounded-[1.5rem] bg-primary text-black font-black text-xl shadow-[0_25px_50px_rgba(255,109,0,0.3)] transition-all active:scale-[0.97] group relative overflow-hidden"
                      >
                         <m.div 
                            className="absolute inset-0 bg-white/30"
                            initial={{ y: "100%" }}
                            whileHover={{ y: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                         <span className="relative z-10 flex items-center justify-center gap-3">
                          {isSubmitting ? <Loader2 className="h-7 w-7 animate-spin" /> : (
                            <>
                              <Shield size={22} />
                              تحقق وآمن
                            </>
                          )}
                         </span>
                      </Button>

                      <button
                        type="button"
                        onClick={() => setRequires2FA(false)}
                        className="w-full text-[12px] font-black text-gray-500 hover:text-white transition-colors uppercase tracking-[0.4em] flex items-center justify-center gap-2"
                      >
                        <ArrowRight size={14} /> العودة للخلف
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
              transition={{ delay: 1.2 }}
              className="pt-12 border-t border-white/5 text-center space-y-8"
            >
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-loose">
                  لا تمتلك هوية رقمية في تولو؟
                </p>
                <Link 
                  href="/register" 
                  className="inline-block px-8 py-3 rounded-xl bg-white/5 border border-white/10 font-black text-white hover:text-primary hover:bg-primary/5 transition-all hover:border-primary shadow-sm"
                >
                  انشـئ هويتك الآن
                </Link>
              </div>
              
              <div className="flex items-center justify-center gap-10 opacity-25 grayscale hover:grayscale-0 hover:opacity-50 transition-all duration-500">
                <div className="flex items-center gap-3">
                   <Shield size={14} className="text-primary" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">End-to-End SSL</span>
                </div>
                <div className="flex items-center gap-3">
                   <Fingerprint size={14} className="text-primary" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">ID Protection</span>
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
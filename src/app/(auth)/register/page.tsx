'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User, Mail, Lock, Loader2, Eye, EyeOff, Check, Phone,
  Calendar, GraduationCap, Briefcase, Flag, Wand2, Shield, Info,
  ArrowRight, Sparkles, Fingerprint, Globe, Smartphone, ShieldCheck,
  ShieldAlert, Zap, History, Cpu
} from 'lucide-react';
import Link from 'next/link';
import { m, AnimatePresence } from "framer-motion";
import { useAuth } from '@/contexts/auth-context';
import { DEFAULT_AUTHENTICATED_ROUTE, sanitizeRedirectPath } from '@/services/auth/navigation';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- Helpers ---
const formatPhoneNumber = (value: string): string => {
  if (!value) return '';
  const digitsOnly = value.replace(/\D/g, '');
  return digitsOnly.substring(0, 11);
};

const handlePhoneInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if ([46, 8, 9, 27, 13, 37, 38, 39, 40, 35, 36].includes(e.keyCode)) return;
  if ((e.shiftKey || e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
    e.preventDefault();
  }
};

const COUNTRIES = [
  { code: 'EG', name: 'مصر', phoneCode: '+20' },
  { code: 'SA', name: 'السعودية', phoneCode: '+966' },
  { code: 'AE', name: 'الإمارات', phoneCode: '+971' },
  { code: 'KW', name: 'الكويت', phoneCode: '+965' },
  { code: 'QA', name: 'قطر', phoneCode: '+974' },
  { code: 'OM', name: 'عمان', phoneCode: '+968' },
  { code: 'BH', name: 'البحرين', phoneCode: '+973' },
  { code: 'JO', name: 'الأردن', phoneCode: '+962' }
];

const STUDENT_GRADES = ['أولى إعدادي', 'ثانية إعدادي', 'ثالثة إعدادي', 'أولى ثانوي', 'ثانية ثانوي', 'ثالثة ثانوي'];
const EDUCATION_TYPES = ['عام', 'أزهري', 'دولي', 'IG', 'American', 'أخرى'];
const SUBJECTS = ['رياضيات', 'فيزياء', 'كيمياء', 'برمجة', 'إنجليزي', 'تصميم', 'لغة عربية', 'أحياء', 'تاريخ', 'جغرافيا'];

// --- Validation Schema ---
const registerSchema = z.object({
  username: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل').regex(/^[^\s@]+$/, 'اسم المستخدم لا يمكن أن يحتوي على مسافات أو رمز @'),
  email: z.string().email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل').
    regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير واحد').
    regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير واحد').
    regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد').
    regex(/[^A-Za-z0-9]/, 'يجب أن تحتوي على رمز خاص واحد'),
  confirmPassword: z.string(),
  phone: z.string().refine((val) => {
    if (!val) return true;
    const egyptianPattern = /^(010|011|012|015)\d{8}$/;
    return egyptianPattern.test(val);
  }, 'رقم الهاتف المصري يجب أن يبدأ بـ 010، 011، 012، أو 015 ويتكون من 11 رقمًا'),
  country: z.string().min(2, 'الدولة مطلوبة'),
  dateOfBirth: z.string().min(1, 'تاريخ الميلاد مطلوب'),
  role: z.enum(['STUDENT', 'TEACHER']),
  gradeLevel: z.string().optional(),
  educationType: z.string().optional(),
  interestedSubjects: z.array(z.string()).optional(),
  acceptTerms: z.boolean().refine((val) => val === true, 'يجب الموافقة على الشروط')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword']
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// --- Components ---
function PremiumInput({ 
  label, 
  icon: Icon, 
  error, 
  type = "text", 
  registration, 
  endAdornment 
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
          {Icon}
        </div>
        
        <input
          {...registration}
          type={type}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            setHasValue(!!e.target.value);
            if (registration.onBlur) registration.onBlur(e);
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

        {endAdornment && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            {endAdornment}
          </div>
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
              {error}
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('EG');

  const redirectUrl = useMemo(
    () => sanitizeRedirectPath(searchParams.get('redirect'), DEFAULT_AUTHENTICATED_ROUTE),
    [searchParams]
  );
  const loginUrl = `/login?redirect=${encodeURIComponent(redirectUrl)}`;

  const { register, handleSubmit, control, getValues, setValue, trigger, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'STUDENT',
      interestedSubjects: [],
      acceptTerms: false,
      country: 'مصر'
    }
  });

  const roleValue = useWatch({ control, name: 'role' });
  const interestedSubjects = useWatch({ control, name: 'interestedSubjects', defaultValue: [] }) || [];

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('phone', formatPhoneNumber(e.target.value), { shouldValidate: true });
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryCode = e.target.value;
    const country = COUNTRIES.find((c) => c.code === countryCode);
    if (country) {
      setValue('country', country.name, { shouldValidate: true });
      setSelectedCountry(countryCode);
    }
  };

  const handleNextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ['role'];
    if (step === 2) fieldsToValidate = ['username', 'email', 'password', 'confirmPassword', 'phone', 'country', 'dateOfBirth'];

    const isValid = await trigger(fieldsToValidate as any);

    if (isValid) {
      setStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error('يرجى التأكد من صحة البيانات المدخلة');
    }
  };

  const toggleArrayItem = (field: 'interestedSubjects', value: string) => {
    const currentList = getValues(field) || [];
    setValue(
      field,
      currentList.includes(value) ?
        currentList.filter((item) => item !== value) :
        [...currentList, value]
    );
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const result = await registerUser({
        ...data,
        email: data.email || "",
        password: data.password || "",
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null,
      });

      if (result.success) {
        toast.success('تم إنشاء الهوية بنجاح! مرحباً بك في تولو');
        if (result.autoLoggedIn) {
          router.replace(redirectUrl);
          router.refresh();
          return;
        }
        setTimeout(() => router.push(loginUrl), 2000);
      } else {
        toast.error(result.error || 'فشل إنشاء الحساب');
      }
    } catch (_err) {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) {
    return (
      <m.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-screen items-center justify-center bg-[#050505]"
      >
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="h-16 w-16 text-primary animate-spin" />
          <span className="text-[12px] font-black text-primary/50 uppercase tracking-[0.8em]">Syncing Identity</span>
        </div>
      </m.div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center py-12 px-4 bg-[#020202] overflow-hidden selection:bg-primary/30" dir="rtl">
      {/* Background Layers */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <m.div 
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full" 
        />
        <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay" />
      </div>

      <m.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-4xl space-y-12"
      >
        {/* Header */}
        <div className="text-center space-y-6">
          <m.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="mx-auto w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary),0.15)] cursor-default"
          >
            <Wand2 className="w-12 h-12 text-primary" />
          </m.div>
          <div className="space-y-2">
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-tight">
               إنشاء <span className="text-primary">هوية تولو</span>
            </h1>
            <p className="text-gray-500 font-bold text-lg tracking-wide uppercase">مرحباً بك في مستقبل التعليم الرقمي</p>
          </div>
        </div>

        {/* Stepper (Animated) */}
        <div className="flex items-center justify-center gap-4 px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <m.div 
                animate={{ 
                  backgroundColor: step >= i ? "rgba(255,109,0,1)" : "rgba(255,255,255,0.05)",
                  borderColor: step >= i ? "rgba(255,109,0,1)" : "rgba(255,255,255,0.1)",
                  color: step >= i ? "#000" : "#4b5563"
                }}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border transition-all",
                  step >= i ? "shadow-[0_0_20px_rgba(255,109,0,0.3)]" : ""
                )}
              >
                {step > i ? <Check className="w-6 h-6 stroke-[3px]" /> : i}
              </m.div>
              {i < 3 && (
                <div className="w-12 md:w-24 h-1 rounded-full bg-white/5 overflow-hidden">
                  <m.div 
                    animate={{ width: step > i ? "100%" : "0%" }}
                    className="h-full bg-primary"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Form Container */}
        <m.div 
          layout
          className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-black/60 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
        >
          <div className="p-8 md:p-16 lg:p-20">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
              <AnimatePresence mode="wait">
                {/* STEP 1: ROLE */}
                {step === 1 && (
                  <m.div 
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10"
                  >
                    <div className="text-center space-y-3">
                      <ShieldCheck className="mx-auto text-primary animate-pulse" size={40} />
                      <h3 className="text-3xl font-black text-white uppercase">تحديد نوع الحساب</h3>
                      <p className="text-gray-500 font-bold">كل هوية تمنحك صلاحيات وأدوات مختلفة</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      {[
                        { id: 'STUDENT', label: 'طالب معرفة', icon: GraduationCap, desc: 'للتفوق والتحدي' },
                        { id: 'TEACHER', label: 'معلم خبير', icon: Briefcase, desc: 'لنشر العلم' }
                      ].map(({ id, label, icon: Icon, desc }) => {
                        const active = roleValue === id;
                        return (
                          <m.label 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={id} 
                            className={cn(
                              "group cursor-pointer rounded-[2.5rem] border-2 p-12 transition-all text-center space-y-6",
                              active ? "border-primary bg-primary/5 ring-4 ring-primary/5 shadow-2xl shadow-primary/10" : "border-white/5 bg-white/5 hover:border-white/10"
                            )}
                          >
                            <input type="radio" value={id} {...register('role')} className="hidden" />
                            <m.div 
                              animate={{ 
                                backgroundColor: active ? "rgba(255,109,0,1)" : "rgba(255,255,255,0.05)",
                                color: active ? "#000" : "#6b7280"
                              }}
                              className="mx-auto w-24 h-24 rounded-3xl flex items-center justify-center transition-all"
                            >
                              <Icon size={48} />
                            </m.div>
                            <div className="space-y-2">
                              <span className={cn("block font-black text-2xl transition-colors", active ? "text-white" : "text-gray-500")}>{label}</span>
                              <span className="block text-[11px] text-gray-600 font-black uppercase tracking-widest">{desc}</span>
                            </div>
                          </m.label>
                        );
                      })}
                    </div>
                    
                    <div className="pt-6">
                      <Button 
                        type="button" 
                        onClick={handleNextStep} 
                        className="h-20 w-full rounded-2xl bg-primary font-black text-black text-xl shadow-2xl group overflow-hidden relative"
                      >
                        <m.div 
                          className="absolute inset-0 bg-white/20"
                          initial={{ y: "100%" }}
                          whileHover={{ y: 0 }}
                          transition={{ duration: 0.3 }}
                        />
                        <div className="relative z-10 flex items-center justify-center gap-3">
                          متابعة الخطوات <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                        </div>
                      </Button>
                    </div>
                  </m.div>
                )}

                {/* STEP 2: PERSONAL INFO */}
                {step === 2 && (
                  <m.div 
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10"
                  >
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                        <PremiumInput registration={register('username')} label="اسم المستخدم" icon={<User size={20} />} error={errors.username?.message} />
                        <PremiumInput registration={register('email')} type="email" label="البريد الإلكتروني" icon={<Mail size={20} />} error={errors.email?.message} />
                        
                        <PremiumInput 
                          registration={register('password')} 
                          type={showPassword ? 'text' : 'password'} 
                          label="كلمة المرور" 
                          icon={<Lock size={20} />} 
                          endAdornment={
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-2 text-gray-500 hover:text-white transition-colors">
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          } 
                          error={errors.password?.message} 
                        />
                        
                        <PremiumInput 
                          registration={register('confirmPassword')} 
                          type={showConfirmPassword ? 'text' : 'password'} 
                          label="تأكيد كلمة المرور" 
                          icon={<Lock size={20} />} 
                          endAdornment={
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="p-2 text-gray-500 hover:text-white transition-colors">
                              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          } 
                          error={errors.confirmPassword?.message} 
                        />
                        
                        <div className="space-y-2">
                          <m.div 
                            animate={{ backgroundColor: selectedCountry ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)" }}
                            className="relative border border-white/10 rounded-2xl h-16 flex items-center"
                          >
                            <select
                              value={selectedCountry}
                              onChange={handleCountryChange}
                              className="w-full h-full bg-transparent px-12 font-bold text-white outline-none appearance-none cursor-pointer"
                            >
                              {COUNTRIES.map((country) => (
                                <option key={country.code} value={country.code} className="bg-[#0a0a0a] text-white">{country.name}</option>
                              ))}
                            </select>
                            <Flag className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                            <label className="absolute right-12 top-1/2 -translate-y-[180%] text-[10px] font-black uppercase text-primary/80 tracking-widest">الدولة</label>
                          </m.div>
                        </div>

                        <PremiumInput
                          registration={{
                            ...register('phone'),
                            onChange: handlePhoneChange,
                            onKeyDown: handlePhoneInput
                          }}
                          label="رقم الهاتف"
                          icon={<Phone size={20} />}
                          error={errors.phone?.message}
                        />
                        
                        <PremiumInput registration={register('dateOfBirth')} type="date" label="تاريخ الميلاد" icon={<Calendar size={20} />} error={errors.dateOfBirth?.message} />
                      </div>

                      <div className="flex gap-6 pt-6">
                        <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-18 flex-1 rounded-2xl border-white/10 bg-white/5 font-black text-white text-lg hover:bg-white/10 transition-colors">
                          سابـق
                        </Button>
                        <Button type="button" onClick={handleNextStep} className="h-18 flex-[2] rounded-2xl bg-primary font-black text-black text-lg shadow-xl shadow-primary/10 group overflow-hidden relative">
                          <m.div 
                            className="absolute inset-0 bg-white/20"
                            initial={{ y: "100%" }}
                            whileHover={{ y: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                          <div className="relative z-10 flex items-center justify-center gap-3">
                            تأكيد البيانات <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                          </div>
                        </Button>
                      </div>
                  </m.div>
                )}

                {/* STEP 3: PREFERENCES */}
                {step === 3 && (
                  <m.div 
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-12"
                  >
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-[11px] font-black uppercase text-gray-500 tracking-widest px-2">المستوى الدراسي</Label>
                          <select {...register('gradeLevel')} className="w-full h-16 rounded-2xl border border-white/10 bg-white/5 px-6 font-bold text-white outline-none focus:border-primary/50 transition-all cursor-pointer">
                            <option value="" className="bg-[#0a0a0a]">اختر المستوى</option>
                            {STUDENT_GRADES.map((g) => <option key={g} value={g} className="bg-[#0a0a0a]">{g}</option>)}
                          </select>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[11px] font-black uppercase text-gray-500 tracking-widest px-2">الفرع التعليمي</Label>
                          <select {...register('educationType')} className="w-full h-16 rounded-2xl border border-white/10 bg-white/5 px-6 font-bold text-white outline-none focus:border-primary/50 transition-all cursor-pointer">
                            <option value="" className="bg-[#0a0a0a]">اختر الفرع</option>
                            {EDUCATION_TYPES.map((e) => <option key={e} value={e} className="bg-[#0a0a0a]">{e}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <Label className="text-[11px] font-black uppercase text-gray-500 tracking-widest px-2 block">المواد المفضلة</Label>
                        <div className="flex flex-wrap gap-3">
                          {SUBJECTS.map((subject) => {
                            const selected = interestedSubjects.includes(subject);
                            return (
                              <m.button
                                whileHover={{ y: -3, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                key={subject}
                                type="button"
                                onClick={() => toggleArrayItem('interestedSubjects', subject)}
                                className={cn(
                                  "px-8 h-14 rounded-2xl border text-[12px] font-black transition-all",
                                  selected ? "border-primary bg-primary text-black shadow-lg shadow-primary/20" : "border-white/5 bg-white/5 text-gray-500 hover:border-white/20"
                                )}
                              >
                                {subject}
                              </m.button>
                            );
                          })}
                        </div>
                      </div>

                      <m.label 
                        whileHover={{ backgroundColor: "rgba(255,109,0,0.1)" }}
                        className="flex items-start gap-6 rounded-[2.5rem] border border-primary/20 bg-primary/5 p-10 cursor-pointer transition-all"
                      >
                        <div className="relative flex items-center pt-1 shrink-0">
                          <input
                            type="checkbox"
                            {...register('acceptTerms')}
                            className="peer sr-only"
                          />
                          <div className="h-7 w-7 rounded-lg border-2 border-white/10 bg-white/5 transition-all peer-checked:border-primary peer-checked:bg-primary/20 flex items-center justify-center">
                            <m.div 
                              animate={{ opacity: getValues('acceptTerms') ? 1 : 0, scale: getValues('acceptTerms') ? 1 : 0 }}
                              className="text-primary"
                            >
                              <Check className="h-4 w-4 stroke-[4px]" />
                            </m.div>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-gray-400 leading-relaxed">
                          أوافق على كافة <Link href="/terms" className="text-primary font-black underline">الشروط والأحكام</Link> المتبعة في نظام تولو الذكي وأتعهد بالحفاظ على سرية بيانات الولوج الخاصة بي.
                        </span>
                      </m.label>
                      <AnimatePresence>
                        {errors.acceptTerms && (
                          <m.p 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="text-[11px] font-bold text-red-500 pr-4"
                          >
                            {errors.acceptTerms.message}
                          </m.p>
                        )}
                      </AnimatePresence>

                      <div className="flex gap-6">
                        <Button type="button" variant="outline" onClick={() => setStep(2)} className="h-20 flex-1 rounded-2xl border-white/10 bg-white/5 font-black text-white text-xl hover:bg-white/10 transition-colors">
                          سابـق
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={isLoading} 
                          className="h-20 flex-[2] rounded-2xl bg-primary text-black font-black text-2xl shadow-2xl relative overflow-hidden group"
                        >
                          <m.div 
                            className="absolute inset-0 bg-white/20"
                            initial={{ y: "100%" }}
                            whileHover={{ y: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                          <div className="relative z-10">
                            {isLoading ? <Loader2 className="h-10 w-10 animate-spin mx-auto" /> : "إكمال بناء الهوية"}
                          </div>
                        </Button>
                      </div>
                  </m.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </m.div>

        {/* Footer */}
        <div className="text-center space-y-12 pb-24">
          <p className="text-lg font-bold text-gray-500">
             لديك هوية بالفعل؟ {' '}
            <Link href={loginUrl} className="text-white font-black border-b-2 border-white/20 hover:border-primary hover:text-primary transition-all pb-1 ml-1">
              بوابة العـبور
            </Link>
          </p>

          <div className="flex items-center justify-between max-xl mx-auto opacity-20 px-8">
            <div className="flex items-center gap-3">
              <Fingerprint size={20} className="text-primary" />
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">Security Encrypted</span>
            </div>
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-primary" />
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">Node Sync</span>
            </div>
            <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-primary" />
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">Device Verified</span>
            </div>
          </div>
        </div>
      </m.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020202] flex items-center justify-center"><Loader2 className="h-12 w-12 text-primary animate-spin" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}

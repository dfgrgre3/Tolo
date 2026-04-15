'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  User, Mail, Lock, Loader2, ArrowLeft, Eye, EyeOff, Check, Phone, 
  Calendar, GraduationCap, Briefcase, Target, Flag, Sparkles, Wand2, Shield, Info,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { DEFAULT_AUTHENTICATED_ROUTE, sanitizeRedirectPath } from '@/services/auth/navigation';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AuthField } from '@/components/auth/AuthField';
import { AuthShell } from '@/components/auth/AuthShell';
import { toast } from 'sonner';

// Add this helper function for phone number formatting
const formatPhoneNumber = (value: string): string => {
  if (!value) return '';
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length > 0 && !digitsOnly.startsWith('01')) {
    return digitsOnly.substring(0, 11);
  }
  return digitsOnly.substring(0, 11);
};

const handlePhoneInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if ([46, 8, 9, 27, 13, 37, 38, 39, 40, 35, 36].includes(e.keyCode)) return;
  if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
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
  { code: 'JO', name: 'الأردن', phoneCode: '+962' },
];

const registerSchema = z.object({
  username: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل').regex(/^[^\s@]+$/, 'اسم المستخدم لا يمكن أن يحتوي على مسافات أو رمز @'),
  email: z.string().email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير واحد')
    .regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير واحد')
    .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد')
    .regex(/[^A-Za-z0-9]/, 'يجب أن تحتوي على رمز خاص واحد'),
  confirmPassword: z.string(),
  phone: z.string().refine((val) => {
    if (!val) return true;
    const egyptianPattern = /^(010|011|012|015)\d{8}$/;
    return egyptianPattern.test(val);
  }, 'رقم الهاتف المصري يجب أن يبدأ بـ 010، 011، 012، أو 015 ويتكون من 11 رقمًا'),
  alternativePhone: z.string().optional().refine((val) => {
    if (!val) return true;
    const egyptianPattern = /^(010|011|012|015)\d{8}$/;
    return egyptianPattern.test(val);
  }, 'رقم الهاتف البديل يجب أن يكون رقم هاتف مصري صالح'),
  country: z.string().min(2, 'الدولة مطلوبة'),
  dateOfBirth: z.string().min(1, 'تاريخ الميلاد مطلوب'),
  role: z.enum(['STUDENT', 'TEACHER']),
  gradeLevel: z.string().optional(),
  educationType: z.string().optional(),
  interestedSubjects: z.array(z.string()).optional(),
  subjectsTaught: z.array(z.string()).optional(),
  acceptTerms: z.boolean().refine(val => val === true, 'يجب الموافقة على الشروط'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const STUDENT_GRADES = ['أولى إعدادي', 'ثانية إعدادي', 'ثالثة إعدادي', 'أولى ثانوي', 'ثانية ثانوي', 'ثالثة ثانوي'];
const EDUCATION_TYPES = ['عام', 'أزهري', 'دولي', 'IG', 'American', 'أخرى'];
const SUBJECTS = ['رياضيات', 'فيزياء', 'كيمياء', 'برمجة', 'إنجليزي', 'تصميم', 'لغة عربية', 'أحياء', 'تاريخ', 'جغرافيا'];

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
      subjectsTaught: [], 
      acceptTerms: false,
      country: 'مصر'
    },
  });

  const handlePhoneChange = (field: 'phone' | 'alternativePhone') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(field, formatPhoneNumber(e.target.value), { shouldValidate: true });
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryCode = e.target.value;
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setValue('country', country.name, { shouldValidate: true });
      setSelectedCountry(countryCode);
    }
  };

  const roleValue = useWatch({ control, name: 'role' });
  const interestedSubjects = useWatch({ control, name: 'interestedSubjects', defaultValue: [] }) || [];

  const redirectAfterRegister = useCallback((target: string) => {
    router.replace(target);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      redirectAfterRegister(redirectUrl);
    }
  }, [isAuthLoading, isAuthenticated, redirectAfterRegister, redirectUrl]);

  const handleNextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ['role'];
    if (step === 2) fieldsToValidate = ['username', 'email', 'password', 'confirmPassword', 'phone', 'country', 'dateOfBirth'];

    const isValid = await trigger(fieldsToValidate as any);

    if (isValid) {
      setStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error('يرجى تصحيح الأخطاء في الخانات الحمراء');
    }
  };

  const toggleArrayItem = (field: 'interestedSubjects' | 'subjectsTaught', value: string) => {
    const currentList = getValues(field) || [];
    setValue(
      field,
      currentList.includes(value)
        ? currentList.filter(item => item !== value)
        : [...currentList, value]
    );
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);

    try {
      const result = await registerUser({
        email: data.email,
        password: data.password,
        username: data.username,
        role: data.role,
        country: data.country,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null,
        phone: data.phone,
        alternativePhone: data.alternativePhone,
        gradeLevel: data.gradeLevel,
        educationType: data.educationType,
        interestedSubjects: data.interestedSubjects,
        subjectsTaught: data.subjectsTaught,
      });

      if (result.success) {
        toast.success(result.message || 'تم إنشاء مملكتك الخاصة بنجاح!');
        if (result.autoLoggedIn) {
          redirectAfterRegister(redirectUrl);
          return;
        }
        setTimeout(() => router.push(loginUrl), 2000);
      } else {
        toast.error(result.error || 'فشل في استدعاء الهوية الجديدة');
      }
    } catch (err) {
      toast.error('حدث عارض فني غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 border-2 border-primary border-t-transparent rounded-full shadow-[0_0_15px_rgba(var(--primary),0.2)]" 
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center py-12 px-4 bg-black overflow-hidden" dir="rtl">
      {/* Background Decor */}
      <div className="absolute top-[-5%] left-[-5%] w-[600px] h-[600px] bg-primary/10 blur-[130px] rounded-full" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[500px] h-[500px] bg-blue-600/5 blur-[130px] rounded-full" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

      <div className="relative w-full max-w-2xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center space-y-4"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 shadow-xl">
            <Wand2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            إنشاء <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">الهوية الأسطورية</span>
          </h2>
          <p className="text-gray-400 font-medium">ابدأ رحلة صناعة بطلك التعليمي في منصة تولو</p>
        </motion.div>

        {/* Improved Stepper */}
        <div className="mb-16 flex items-center justify-center gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div className="relative flex flex-col items-center">
                <motion.div 
                  animate={{ 
                    scale: step === i ? 1.1 : 1,
                    backgroundColor: step >= i ? 'var(--primary-rgb)' : 'rgba(255,255,255,0.05)'
                  }}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-all shadow-lg ${step >= i ? 'border-primary bg-primary text-black' : 'border-white/5 bg-white/5 text-gray-500'}`}
                >
                  {step > i ? <Check className="h-5 w-5" /> : <span className="text-lg font-black">{i}</span>}
                </motion.div>
                <span className={`absolute -bottom-8 text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-colors ${step >= i ? 'text-primary' : 'text-gray-600'}`}>
                  {i === 1 ? 'نـوع الهويـة' : i === 2 ? 'بيانـات الواقـع' : 'تحديد المسـار'}
                </span>
              </div>
              {i < 3 && (
                <div className="mx-2 h-0.5 w-8 rounded-full bg-white/5 relative overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: step > i ? '100%' : '0%' }}
                     className="absolute inset-0 bg-primary"
                   />
                </div>
              )}
            </div>
          ))}
        </div>

        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-8 md:p-12 backdrop-blur-2xl shadow-2xl"
        >
          <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-[2.5rem]" />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-2 mb-8">
                    <Shield className="mx-auto text-primary/40" size={32} />
                    <h3 className="text-xl font-black text-white">من أنت في هذا العالم؟</h3>
                    <p className="text-gray-500 text-sm">اختر دورك لنخصص لك التجربة الأمثل</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[
                      { id: 'STUDENT', label: 'طالب مغامر', icon: GraduationCap, desc: 'للمذاكرة، التفوق والمنافسة' },
                      { id: 'TEACHER', label: 'معلم خبير', icon: Briefcase, desc: 'لمشاركة العلم وبناء الأبطال' },
                    ].map(({ id, label, icon: Icon, desc }) => {
                      const active = roleValue === id;
                      return (
                        <label key={id} className={`group cursor-pointer rounded-[2rem] border-2 p-8 transition-all relative overflow-hidden ${active ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.1)]' : 'border-white/5 bg-white/5 hover:border-white/10'}`}>
                          <input type="radio" value={id} {...register('role')} className="hidden" />
                          <div className="flex flex-col items-center gap-4 text-center">
                            <motion.div 
                              animate={{ scale: active ? 1.1 : 1 }}
                              className={`rounded-2xl p-5 ${active ? 'bg-primary text-black' : 'bg-white/5 text-gray-500 group-hover:bg-white/10'}`}
                            >
                              <Icon size={32} />
                            </motion.div>
                            <div className="space-y-1">
                              <span className={`block font-black text-lg ${active ? 'text-white' : 'text-gray-400'}`}>{label}</span>
                              <span className="block text-[10px] text-gray-600 font-bold uppercase tracking-widest">{desc}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="pt-4">
                    <Button type="button" onClick={handleNextStep} className="h-16 w-full rounded-2xl bg-primary font-black text-black group">
                      انتقـل للمرحلة التالية <ArrowRight className="mr-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AuthField {...register('username')} label="اسم المحارب (يظهر للجميع)" placeholder="مثلا: Sniper_2026" icon={<User size={18} />} error={errors.username?.message} />
                    <AuthField {...register('email')} type="email" label="المعرف الإلكتروني (البريد)" placeholder="warrior@thanawy.me" icon={<Mail size={18} />} error={errors.email?.message} />
                    <AuthField {...register('password')} type={showPassword ? 'text' : 'password'} label="شيفرة الدخول" placeholder="••••••••" icon={<Lock size={18} />} endAdornment={<button type="button" onClick={() => setShowPassword(v => !v)} className="p-2 mr-1">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>} error={errors.password?.message} />
                    <AuthField {...register('confirmPassword')} type={showConfirmPassword ? 'text' : 'password'} label="تأكيد الشيفرة" placeholder="••••••••" icon={<Lock size={18} />} endAdornment={<button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="p-2 mr-1">{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>} error={errors.confirmPassword?.message} />
                    
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">مقر الإقامة</Label>
                       <div className="relative group">
                          <select 
                            value={selectedCountry}
                            onChange={handleCountryChange}
                            className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-6 pr-12 font-bold text-white outline-none appearance-none focus:border-primary/50"
                          >
                            {COUNTRIES.map(country => (
                              <option key={country.code} value={country.code} className="bg-neutral-900">{country.name}</option>
                            ))}
                          </select>
                          <Flag className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                       </div>
                    </div>

                    <AuthField 
                      value={getValues('phone')}
                      onChange={handlePhoneChange('phone')}
                      onKeyDown={handlePhoneInput}
                      label="هاتف التواصل" 
                      placeholder="01XXXXXXXX" 
                      icon={<Phone size={18} />} 
                      error={errors.phone?.message} 
                    />
                    
                    <AuthField {...register('dateOfBirth')} type="date" label="تاريخ الميلاد" icon={<Calendar size={18} />} error={errors.dateOfBirth?.message} />
                  </div>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-14 flex-1 rounded-2xl border-white/10 bg-white/5 font-black text-white hover:bg-white/10">
                      سابـق
                    </Button>
                    <Button type="button" onClick={handleNextStep} className="h-14 flex-[2] rounded-2xl bg-primary font-black text-black">
                      تأكيد البيانات <ArrowRight className="mr-2 h-5 w-5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">المستوى الحالي</Label>
                      <select {...register('gradeLevel')} className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-6 font-bold text-white outline-none focus:border-primary/50">
                        <option value="" className="bg-neutral-900">اختر المستوى</option>
                        {STUDENT_GRADES.map(g => <option key={g} value={g} className="bg-neutral-900">{g}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">الفرع الدراسي</Label>
                      <select {...register('educationType')} className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-6 font-bold text-white outline-none focus:border-primary/50">
                        <option value="" className="bg-neutral-900">اختر الفرع</option>
                        {EDUCATION_TYPES.map(e => <option key={e} value={e} className="bg-neutral-900">{e}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={14} className="text-primary/60" />
                      <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">المجالات المفضلة (اختر ما شئت)</Label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {SUBJECTS.map(subject => {
                        const selected = interestedSubjects.includes(subject);
                        return (
                          <motion.button 
                            whileHover={{ y: -2 }}
                            key={subject} 
                            type="button" 
                            onClick={() => toggleArrayItem('interestedSubjects', subject)} 
                            className={`h-12 rounded-xl border text-[10px] font-black transition-all ${selected ? 'border-primary bg-primary text-black shadow-[0_0_15px_rgba(var(--primary),0.2)]' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'}`}
                          >
                            {subject}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="flex items-start gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-6 cursor-pointer group hover:bg-primary/10 transition-colors">
                    <div className="relative flex items-center pt-1">
                       <input 
                         type="checkbox" 
                         {...register('acceptTerms')} 
                         className="h-5 w-5 appearance-none rounded-md border border-white/20 bg-white/5 checked:bg-primary checked:border-primary transition-all cursor-pointer" 
                       />
                       <Check className="absolute inset-0 m-auto h-3 w-3 text-black opacity-0 group-has-[:checked]:opacity-100 pointer-events-none" />
                    </div>
                    <span className="text-xs font-bold text-gray-400 leading-relaxed">
                      بإكمالك لهذه الخطوة، أنت توافق على <Link href="/terms" className="text-primary font-black hover:underline">قوانين المملكة</Link> و <Link href="/privacy" className="text-primary font-black hover:underline">ميثاق الخصوصية</Link>.
                    </span>
                  </label>
                  {errors.acceptTerms && <p className="text-[10px] font-bold text-red-500 uppercase mr-1">{errors.acceptTerms.message}</p>}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="h-16 flex-1 rounded-2xl border-white/10 bg-white/5 font-black text-white">
                      سابـق
                    </Button>
                    <Button type="submit" disabled={isLoading} className="h-16 flex-[2] rounded-2xl bg-primary text-black font-black text-lg relative overflow-hidden group">
                       <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                       {isLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "إعـلان الهويـة والنـشوء"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>

        <div className="mt-12 text-center pb-12">
           <p className="text-sm font-bold text-gray-500">
             تمتلك هوية مسبقة؟{' '}
             <Link href={loginUrl} className="text-white font-black border-b border-white/20 hover:border-primary hover:text-primary transition-all pb-1">
               بـوابة العـبور
             </Link>
           </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}

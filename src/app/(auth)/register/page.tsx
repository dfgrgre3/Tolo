'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Mail, Lock, Loader2, ArrowLeft, Eye, EyeOff, Check, Phone, Calendar, GraduationCap, Briefcase, Target } from 'lucide-react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { DEFAULT_AUTHENTICATED_ROUTE, sanitizeRedirectPath } from '@/services/auth/navigation';
import { Label } from '@/components/ui/label';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthField } from '@/components/auth/AuthField';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { AuthShell } from '@/components/auth/AuthShell';

const registerSchema = z.object({
  username: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  email: z.string().email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير واحد')
    .regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير واحد')
    .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد')
    .regex(/[^A-Za-z0-9]/, 'يجب أن تحتوي على رمز خاص واحد'),
  confirmPassword: z.string(),
  phone: z.string().min(8, 'رقم الهاتف مطلوب'),
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
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const redirectUrl = useMemo(
    () => sanitizeRedirectPath(searchParams.get('redirect'), DEFAULT_AUTHENTICATED_ROUTE),
    [searchParams]
  );
  const loginUrl = `/login?redirect=${encodeURIComponent(redirectUrl)}`;

  const { register, handleSubmit, control, getValues, setValue, trigger, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'STUDENT', interestedSubjects: [], subjectsTaught: [], acceptTerms: false },
  });

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
    const isValid = step === 1
      ? await trigger('role')
      : await trigger(['username', 'email', 'password', 'confirmPassword', 'phone', 'country', 'dateOfBirth']);

    if (isValid) {
      setStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setStatus(null);

    const result = await registerUser({
      email: data.email,
      password: data.password,
      username: data.username,
      role: data.role,
      country: data.country,
      dateOfBirth: new Date(data.dateOfBirth).toISOString(),
      phone: data.phone,
      gradeLevel: data.gradeLevel,
      educationType: data.educationType,
      interestedSubjects: data.interestedSubjects,
      subjectsTaught: data.subjectsTaught,
    });

    if (result.success) {
      setStatus({ type: 'success', message: result.message || 'تم إنشاء الحساب بنجاح' });
      if (result.autoLoggedIn) {
        redirectAfterRegister(redirectUrl);
        return;
      }
      setTimeout(() => router.push(loginUrl), 2500);
    } else {
      setStatus({ type: 'error', message: result.error || 'فشل إنشاء الحساب' });
    }

    setIsLoading(false);
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto py-12" dir="rtl">
      <div className="absolute top-0 left-0 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[130px]" />
      <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[130px]" />

      <div className="mb-12 text-center space-y-4">
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">إنشاء <span className="rpg-neon-text">الهوية الأسطورية</span> 🏛️</h2>
        <p className="text-gray-500 font-medium">ابدأ رحلة صناعة بطلك التعليمي اليوم</p>
      </div>

      <div className="mb-16 flex items-center justify-center gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center">
            <div className="relative flex flex-col items-center">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border shadow-2xl ${step >= i ? 'border-primary/40 bg-primary text-black' : 'border-white/5 bg-white/5 text-gray-600'}`}>
                {step > i ? <Check className="h-6 w-6" /> : <span className="text-xl font-black">{i}</span>}
              </div>
              <span className={`absolute -bottom-10 text-[10px] font-black uppercase tracking-widest ${step >= i ? 'text-primary' : 'text-gray-700'}`}>
                {i === 1 ? 'الهوية' : i === 2 ? 'البيانات' : 'المسار'}
              </span>
            </div>
            {i < 3 ? <div className="mx-2 h-0.5 w-12 rounded-full bg-white/5" /> : null}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {status ? <AuthNotice type={status.type} message={status.message} className="mb-10" /> : null}
      </AnimatePresence>

      <AuthShell
        icon={<Target className="h-8 w-8 text-primary" />}
        title="تفاصيل المسار"
        description="أدخل بياناتك الأساسية ثم اختَر المسار الدراسي"
        footer={(
          <p className="text-center text-xs font-bold text-gray-600 uppercase tracking-[0.1em]">
            تمتلك هوية مسبقة؟{' '}
            <Link href={loginUrl} className="font-black text-white hover:text-primary transition-colors decoration-primary underline-offset-8 underline decoration-2">
              تسجيل الدخول من هنا
            </Link>
          </p>
        )}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {step === 1 && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'STUDENT', label: 'طالب', icon: GraduationCap },
                  { id: 'TEACHER', label: 'معلم', icon: Briefcase },
                ].map(({ id, label, icon: Icon }) => {
                  const active = roleValue === id;
                  return (
                    <label key={id} className={`cursor-pointer rounded-[2rem] border-2 p-6 transition-all ${active ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5'}`}>
                      <input type="radio" value={id} {...register('role')} className="hidden" />
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className={`rounded-2xl p-4 ${active ? 'bg-primary text-black' : 'bg-white/5 text-gray-500'}`}>
                          <Icon className="h-8 w-8" />
                        </div>
                        <span className={`font-black ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
              <AuthButton type="button" onClick={handleNextStep} className="h-16 w-full rounded-2xl bg-primary font-black text-black" loading={false}>
                تواصل التقدم <ArrowLeft className="mr-2 h-6 w-6" />
              </AuthButton>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AuthField {...register('username')} label="اسم المستخدم" placeholder="أدخل اسمك" icon={<User className="h-5 w-5" />} error={errors.username?.message} />
              <AuthField {...register('email')} type="email" label="البريد الإلكتروني" placeholder="mail@realm.com" icon={<Mail className="h-5 w-5" />} error={errors.email?.message} />
              <AuthField {...register('password')} type={showPassword ? 'text' : 'password'} label="كلمة المرور" placeholder="••••••••" icon={<Lock className="h-5 w-5" />} endAdornment={<button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}</button>} error={errors.password?.message} />
              <AuthField {...register('confirmPassword')} type={showConfirmPassword ? 'text' : 'password'} label="تأكيد كلمة المرور" placeholder="••••••••" icon={<Lock className="h-5 w-5" />} endAdornment={<button type="button" onClick={() => setShowConfirmPassword(v => !v)}>{showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}</button>} error={errors.confirmPassword?.message} />
              <AuthField {...register('phone')} label="الهاتف" placeholder="010XXXXXXXX" icon={<Phone className="h-5 w-5" />} error={errors.phone?.message} />
              <AuthField {...register('country')} label="الدولة" placeholder="Egypt" error={errors.country?.message} />
              <AuthField {...register('dateOfBirth')} type="date" label="تاريخ الميلاد" icon={<Calendar className="h-5 w-5" />} error={errors.dateOfBirth?.message} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">المرحلة الدراسية</Label>
                  <select {...register('gradeLevel')} className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-6 font-bold text-white outline-none">
                    <option value="">اختر المرحلة</option>
                    {STUDENT_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">النظام التعليمي</Label>
                  <select {...register('educationType')} className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-6 font-bold text-white outline-none">
                    <option value="">اختر النظام</option>
                    {EDUCATION_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">المواد التي تهمك</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {SUBJECTS.map(subject => {
                    const selected = interestedSubjects.includes(subject);
                    return (
                      <button key={subject} type="button" onClick={() => toggleArrayItem('interestedSubjects', subject)} className={`h-11 rounded-xl border px-3 text-[10px] font-black uppercase tracking-tight transition-all ${selected ? 'border-primary bg-primary text-black' : 'border-white/10 bg-white/5 text-gray-500'}`}>
                        {subject}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-3xl border border-primary/20 bg-primary/5 p-5">
                <input type="checkbox" {...register('acceptTerms')} className="mt-1 h-5 w-5 rounded-md border-white/10 bg-black/40 text-primary" />
                <span className="text-xs font-bold text-gray-400 leading-relaxed">
                  أوافق على <Link href="/terms" className="text-primary underline decoration-2 underline-offset-4">شروط المنصة</Link> و <Link href="/privacy" className="text-primary underline decoration-2 underline-offset-4">سياسة الخصوصية</Link>
                </span>
              </label>
              {errors.acceptTerms ? <p className="mr-1 text-xs font-bold text-red-500">{errors.acceptTerms.message}</p> : null}
            </div>
          )}

          <div className="flex gap-4">
            {step > 1 ? (
              <AuthButton type="button" variant="ghost" onClick={() => setStep(prev => prev - 1)} className="h-14 flex-1 rounded-2xl border border-white/10 bg-white/5 font-black text-white">
                رجوع
              </AuthButton>
            ) : null}
            {step < 3 ? (
              <AuthButton type="button" onClick={handleNextStep} className="h-14 flex-[2] rounded-2xl bg-primary font-black text-black" loading={false}>
                تثبيت البيانات <ArrowLeft className="mr-2 h-5 w-5" />
              </AuthButton>
            ) : (
              <AuthButton type="submit" loading={isLoading} loadingLabel="جاري إنشاء الحساب" className="h-14 flex-[2] rounded-2xl bg-primary font-black text-black">
                إكمال التسجيل
              </AuthButton>
            )}
          </div>
        </form>
      </AuthShell>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RegisterForm />
    </Suspense>
  );
}

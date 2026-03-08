'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Eye, EyeOff, Check, X, Phone, MapPin, Calendar, Users, GraduationCap, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  sanitizeRedirectPath,
} from '@/lib/auth/navigation';

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
  alternativePhone: z.string().optional(),
  country: z.string().min(2, 'الدولة مطلوبة'),
  dateOfBirth: z.string().min(1, 'تاريخ الميلاد مطلوب'),
  gender: z.string().optional(),
  role: z.enum(['STUDENT', 'TEACHER']),

  // Student specific
  gradeLevel: z.string().optional(),
  educationType: z.string().optional(),
  section: z.string().optional(),
  interestedSubjects: z.array(z.string()).optional(),
  studyGoal: z.string().optional(),

  // Teacher specific
  subjectsTaught: z.array(z.string()).optional(),
  classesTaught: z.array(z.string()).optional(),
  experienceYears: z.string().optional(),

  acceptTerms: z.boolean().refine(val => val === true, "يجب الموافقة على الشروط وسياسة الخصوصية"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const passwordRequirements = [
  { label: '8 أحرف على الأقل', test: (p: string) => p.length >= 8 },
  { label: 'حرف كبير واحد', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'حرف صغير واحد', test: (p: string) => /[a-z]/.test(p) },
  { label: 'رقم واحد', test: (p: string) => /[0-9]/.test(p) },
  { label: 'رمز خاص واحد', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const STUDENT_GRADES = ['أولى إعدادي', 'ثانية إعدادي', 'ثالثة إعدادي', 'أولى ثانوي', 'ثانية ثانوي', 'ثالثة ثانوي'];
const EDUCATION_TYPES = ['عام', 'أزهري', 'دولي', 'IG', 'American', 'آخر'];
const SECTIONS = ['علمي علوم', 'علمي رياضة', 'أدبي', 'شعب الازهر'];
const SUBJECTS = ['رياضيات', 'فيزياء', 'كيمياء', 'برمجة', 'إنجليزي', 'تصميم', 'لغة عربية', 'أحياء', 'تاريخ', 'جغرافيا'];
const GOALS = ['تحسين الدرجات', 'الاستعداد للثانوية العامة', 'تعلم مهارة', 'اخر'];
const EXPERIENCE_LEVELS = ['أقل من سنة', '1-3 سنوات', '3-5 سنوات', 'أكثر من 5 سنوات'];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const redirectUrl = sanitizeRedirectPath(searchParams.get('redirect'), DEFAULT_AUTHENTICATED_ROUTE);
  const loginUrl = `/login?redirect=${encodeURIComponent(redirectUrl)}`;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'STUDENT',
      interestedSubjects: [],
      subjectsTaught: [],
      classesTaught: [],
      acceptTerms: false,
    }
  });

  const passwordValue = watch('password', '');
  const roleValue = watch('role');
  const interestedSubjects = watch('interestedSubjects') || [];
  const subjectsTaught = watch('subjectsTaught') || [];
  const classesTaught = watch('classesTaught') || [];
  const gradeLevel = watch('gradeLevel');

  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = calculateStrength(passwordValue);
  const strengthLabel = strength < 3 ? 'ضعيفة' : strength < 5 ? 'جيدة' : 'قوية';
  const strengthColor = strength < 3 ? 'text-red-500' : strength < 5 ? 'text-yellow-500' : 'text-green-500';

  const redirectAfterRegister = useCallback((target: string) => {
    router.replace(target);
    router.refresh();

    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        if (window.location.pathname === '/register' || window.location.pathname === '/login') {
          window.location.assign(target);
        }
      }, 450);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      redirectAfterRegister(redirectUrl);
    }
  }, [isAuthLoading, isAuthenticated, redirectAfterRegister, redirectUrl]);

  const handleNextStep = async () => {
    let isValid = false;
    
    if (step === 1) {
      isValid = await trigger('role');
    } else if (step === 2) {
      isValid = await trigger(['username', 'email', 'password', 'confirmPassword', 'phone', 'country', 'dateOfBirth']);
    }

    if (isValid) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleArrayItem = (field: 'interestedSubjects' | 'subjectsTaught' | 'classesTaught', value: string) => {
    const currentList = watch(field) || [];
    if (currentList.includes(value)) {
      setValue(field, currentList.filter(item => item !== value));
    } else {
      setValue(field, [...currentList, value]);
    }
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
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null,
      gender: data.gender,
      phone: data.phone,
      alternativePhone: data.alternativePhone,
      gradeLevel: data.gradeLevel,
      educationType: data.educationType,
      section: data.section,
      interestedSubjects: data.interestedSubjects,
      studyGoal: data.studyGoal,
      subjectsTaught: data.subjectsTaught,
      classesTaught: data.classesTaught,
      experienceYears: data.experienceYears,
    });

    if (result.success) {
      const successMessage = result.autoLoggedIn
        ? 'تم إنشاء الحساب بنجاح! جاري التوجيه...'
        : 'تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني.';

      setStatus({
        type: 'success',
        message: result.message || successMessage,
      });

      if (result.autoLoggedIn) {
        setIsLoading(false);
        redirectAfterRegister(redirectUrl);
        return;
      }

      setTimeout(() => router.push(loginUrl), 3000);
    } else {
      setStatus({
        type: 'error',
        message: result.error || 'فشل إنشاء الحساب',
      });
    }

    setIsLoading(false);
  };

  const isHighSchool = gradeLevel?.includes('ثانوي');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto w-full"
      dir="rtl"
    >
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-2">إنشاء حساب جديد</h2>
        <p className="text-gray-400 text-sm">انضم إلى منصتنا للوصول إلى أفضل أدوات التعليم</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-10 px-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center relative">
              <motion.div 
                initial={false}
                animate={{ 
                  scale: step === i ? 1.1 : 1,
                  backgroundColor: step >= i ? 'rgb(37 99 235)' : 'rgb(31 41 55)',
                }}
                className={`flex items-center justify-center w-12 h-12 rounded-2xl font-bold transition-all duration-300 z-10 ${
                  step >= i ? 'text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-gray-500'
                } ${step === i ? 'ring-2 ring-blue-400 ring-offset-4 ring-offset-gray-950' : ''}`}
              >
                {step > i ? <Check className="w-6 h-6" /> : i}
              </motion.div>
              <span className={`absolute -bottom-7 text-xs font-bold whitespace-nowrap transition-colors duration-300 ${step >= i ? 'text-blue-400' : 'text-gray-600'}`}>
                {i === 1 ? 'النوع' : i === 2 ? 'البيانات' : 'التفاصيل'}
              </span>
            </div>
            {i < 3 && (
              <div className="w-16 sm:w-28 mx-1 h-1 bg-gray-800 rounded-full relative overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: step > i ? "100%" : "0%" }}
                  className="absolute inset-0 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)]"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {status && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${
              status.type === 'error' 
                ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                : 'bg-green-500/10 border-green-500/20 text-green-400'
            }`}
          >
            {status.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium leading-relaxed">{status.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8 bg-gray-900/40 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] border border-gray-800/50 shadow-2xl"
          >
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-white font-cairo">اختر نوع هويتك التعليمية</h3>
              <p className="text-gray-400 text-sm">لنخصص لك تجربة تعليمية فريدة تناسب احتياجاتك</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <label className={`group cursor-pointer rounded-3xl p-8 border-2 transition-all duration-500 relative overflow-hidden flex flex-col items-center justify-center gap-5 ${
                roleValue === 'STUDENT' 
                  ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(37,99,235,0.15)] ring-1 ring-blue-400/50' 
                  : 'border-gray-800 bg-gray-950/40 hover:border-gray-700 hover:bg-gray-900/40'
              }`}>
                <input type="radio" value="STUDENT" {...register('role')} className="hidden" />
                <div className={`p-5 rounded-2xl transition-all duration-500 transform group-hover:scale-110 ${
                  roleValue === 'STUDENT' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'bg-gray-800 text-gray-400'
                }`}>
                  <GraduationCap className="w-10 h-10" />
                </div>
                <div className="text-center z-10">
                  <div className={`font-bold text-xl mb-1 ${roleValue === 'STUDENT' ? 'text-white' : 'text-gray-300'}`}>طالب</div>
                  <div className="text-xs text-gray-500 leading-relaxed font-medium">رحلتك نحو القمة تبدأ من هنا، تعلم وتفوق</div>
                </div>
                {roleValue === 'STUDENT' && (
                  <motion.div layoutId="role-active" className="absolute inset-0 bg-blue-500/5 -z-0" />
                )}
              </label>

              <label className={`group cursor-pointer rounded-3xl p-8 border-2 transition-all duration-500 relative overflow-hidden flex flex-col items-center justify-center gap-5 ${
                roleValue === 'TEACHER' 
                  ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.15)] ring-1 ring-purple-400/50' 
                  : 'border-gray-800 bg-gray-950/40 hover:border-gray-700 hover:bg-gray-900/40'
              }`}>
                <input type="radio" value="TEACHER" {...register('role')} className="hidden" />
                <div className={`p-5 rounded-2xl transition-all duration-500 transform group-hover:scale-110 ${
                  roleValue === 'TEACHER' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/40' : 'bg-gray-800 text-gray-400'
                }`}>
                  <Briefcase className="w-10 h-10" />
                </div>
                <div className="text-center z-10">
                  <div className={`font-bold text-xl mb-1 ${roleValue === 'TEACHER' ? 'text-white' : 'text-gray-300'}`}>معلم</div>
                  <div className="text-xs text-gray-500 leading-relaxed font-medium">شارك خبراتك، ابنِ أجيالاً، واترك أثراً</div>
                </div>
                {roleValue === 'TEACHER' && (
                  <motion.div layoutId="role-active" className="absolute inset-0 bg-purple-500/5 -z-0" />
                )}
              </label>
            </div>

            {errors.role && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400 font-medium text-center">
                {errors.role.message}
              </motion.p>
            )}
            
            <button
              type="button"
              onClick={handleNextStep}
              className="w-full mt-4 py-4 px-6 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:scale-[1.02] active:scale-95 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 transition-all flex justify-center items-center gap-3 group text-lg"
            >
              استمرار <ArrowLeft className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 bg-gray-900/40 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] border border-gray-800/50 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white font-cairo">المعلومات الشخصية</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-2 group">
                <label className="text-sm font-semibold text-gray-400 tracking-wide mr-1">الاسم الكامل *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-400">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    {...register('username')}
                    type="text"
                    disabled={isLoading}
                    className="w-full pr-12 pl-4 py-3.5 bg-gray-950/40 border border-gray-800 hover:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-white text-base placeholder:text-gray-600"
                    placeholder="أدخل اسمك بالكامل"
                  />
                </div>
                {errors.username && <p className="text-xs text-red-400 font-medium mr-1">{errors.username.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2 group">
                <label className="text-sm font-semibold text-gray-400 tracking-wide mr-1">البريد الإلكتروني *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none group-focus-within:text-blue-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    {...register('email')}
                    type="email"
                    dir="ltr"
                    disabled={isLoading}
                    className="w-full pr-12 pl-4 py-3.5 bg-gray-950/40 border border-gray-800 hover:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-white text-sm text-left placeholder:text-gray-600"
                    placeholder="example@mail.com"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-400 font-medium mr-1">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-2 group">
                <label className="text-sm font-semibold text-gray-400 tracking-wide mr-1">كلمة المرور *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none group-focus-within:text-blue-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    disabled={isLoading}
                    className="w-full pr-12 pl-12 py-3.5 bg-gray-950/40 border border-gray-800 hover:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-white text-sm text-left placeholder:text-gray-600"
                    placeholder="كلمة مرور قوية"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-600 hover:text-blue-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 h-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordValue.length > 0 && (
                  <div className="mt-3 px-1">
                    <div className="flex gap-1.5 h-1.5 mb-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div key={level} className={`flex-1 rounded-full transition-all duration-500 ${level <= strength ? strength < 3 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : strength < 5 ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-800'}`} />
                      ))}
                    </div>
                    <p className={`text-[10px] font-bold text-right ${strengthColor}`}>قوة كلمة المرور: {strengthLabel}</p>
                  </div>
                )}
                {errors.password && <p className="text-xs text-red-400 font-medium mr-1">{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2 group">
                <label className="text-sm font-semibold text-gray-400 tracking-wide mr-1">تأكيد كلمة المرور *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none group-focus-within:text-blue-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    dir="ltr"
                    disabled={isLoading}
                    className="w-full pr-12 pl-12 py-3.5 bg-gray-950/40 border border-gray-800 hover:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-white text-sm text-left placeholder:text-gray-600"
                    placeholder="أعد كتابة كلمة المرور"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-600 hover:text-blue-400 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 h-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-400 font-medium mr-1">{errors.confirmPassword.message}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-2 group">
                <label className="text-sm font-semibold text-gray-400 tracking-wide mr-1">رقم الهاتف *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none group-focus-within:text-blue-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <input
                    {...register('phone')}
                    type="tel"
                    dir="ltr"
                    disabled={isLoading}
                    className="w-full pr-12 pl-4 py-3.5 bg-gray-950/40 border border-gray-800 hover:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-white text-base text-left placeholder:text-gray-600"
                    placeholder="010XXXXXXXX"
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-400 font-medium mr-1">{errors.phone.message}</p>}
              </div>

              {/* DOB */}
              <div className="space-y-2 group">
                <label className="text-sm font-semibold text-gray-400 tracking-wide mr-1">تاريخ الميلاد *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none group-focus-within:text-blue-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <input
                    {...register('dateOfBirth')}
                    type="date"
                    disabled={isLoading}
                    className="w-full pr-12 pl-4 py-3.5 bg-gray-950/40 border border-gray-800 hover:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-white text-sm"
                  />
                </div>
                {errors.dateOfBirth && <p className="text-xs text-red-400 font-medium mr-1">{errors.dateOfBirth.message}</p>}
              </div>

              {/* Country & Gender row */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 tracking-wide mr-1">الدولة *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <select
                      {...register('country')}
                      disabled={isLoading}
                      className="w-full pr-12 pl-4 py-3.5 bg-gray-950/40 border border-gray-800 hover:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm appearance-none cursor-pointer"
                    >
                      <option value="Egypt">مصر</option>
                      <option value="Saudi Arabia">المملكة العربية السعودية</option>
                      <option value="UAE">الإمارات العربية المتحدة</option>
                      <option value="Other">أخرى</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 tracking-wide mr-1">الجنس</label>
                  <div className="grid grid-cols-2 gap-3 h-12">
                    <label className={`flex items-center justify-center gap-2 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${watch('gender') === 'Male' ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-gray-800 bg-gray-950/20 text-gray-500 hover:border-gray-700'}`}>
                      <input type="radio" value="Male" {...register('gender')} className="hidden" />
                      <span className="font-bold">ذكر</span>
                    </label>
                    <label className={`flex items-center justify-center gap-2 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${watch('gender') === 'Female' ? 'border-pink-500 bg-pink-500/10 text-white' : 'border-gray-800 bg-gray-950/20 text-gray-500 hover:border-gray-700'}`}>
                      <input type="radio" value="Female" {...register('gender')} className="hidden" />
                      <span className="font-bold">أنثى</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-4 px-4 bg-gray-800/50 hover:bg-gray-800 text-gray-300 border border-gray-700 rounded-2xl font-bold transition-all active:scale-95"
              >
                رجوع
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="w-2/3 py-4 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:scale-[1.02] active:scale-95 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 transition-all flex justify-center items-center gap-3 group text-lg"
              >
                استمرار <ArrowLeft className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 bg-gray-900/40 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] border border-gray-800/50 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white font-cairo">
                {roleValue === 'STUDENT' ? 'تفاصيل الطالب الدراسيّة' : 'تفاصيل المعلّم المهنيّة'}
              </h3>
            </div>

            {roleValue === 'STUDENT' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 group">
                    <label className="text-sm font-semibold text-gray-400 mr-1">الصف الدراسي</label>
                    <select
                      {...register('gradeLevel')}
                      className="w-full px-5 py-3.5 bg-gray-950/40 border border-gray-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm appearance-none cursor-pointer"
                    >
                      <option value="" disabled hidden>اختر صفك الحالي</option>
                      {STUDENT_GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2 group">
                    <label className="text-sm font-semibold text-gray-400 mr-1">نوع التعليم</label>
                    <select
                      {...register('educationType')}
                      className="w-full px-5 py-3.5 bg-gray-950/40 border border-gray-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm appearance-none cursor-pointer"
                    >
                      <option value="" disabled hidden>نظام التعليم</option>
                      {EDUCATION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>

                  {isHighSchool && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-gray-400 mr-1">الشعبة الدراسية</label>
                      <select
                        {...register('section')}
                        className="w-full px-5 py-3.5 bg-gray-950/40 border border-gray-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm appearance-none cursor-pointer"
                      >
                        <option value="" disabled hidden>اختر التخصص</option>
                        {SECTIONS.map(section => <option key={section} value={section}>{section}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-400 mr-1 block">المواد التي تهتم بها</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {SUBJECTS.map(subject => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleArrayItem('interestedSubjects', subject)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border duration-300 ${
                          interestedSubjects.includes(subject)
                            ? 'bg-blue-600 border-blue-400 text-white shadow-[0_4px_12px_rgba(37,99,235,0.4)]'
                            : 'bg-gray-950/40 border-gray-800 text-gray-500 hover:border-blue-500/50 hover:text-blue-400'
                        }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 mr-1">هدفك من استخدام المنصة</label>
                  <select
                    {...register('studyGoal')}
                    className="w-full px-5 py-3.5 bg-gray-950/40 border border-gray-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                  >
                    <option value="" disabled hidden>ما الذي تسعى لتحقيقه؟</option>
                    {GOALS.map(goal => <option key={goal} value={goal}>{goal}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-400 mr-1 block">المواد التي تدرسها</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {SUBJECTS.map(subject => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleArrayItem('subjectsTaught', subject)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border duration-300 ${
                          subjectsTaught.includes(subject)
                            ? 'bg-purple-600 border-purple-400 text-white shadow-[0_4px_12px_rgba(168,85,247,0.4)]'
                            : 'bg-gray-950/40 border-gray-800 text-gray-500 hover:border-purple-500/50 hover:text-purple-400'
                        }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-400 mr-1 block">الصفوف المستهدفة</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STUDENT_GRADES.map(grade => (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => toggleArrayItem('classesTaught', grade)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border duration-300 ${
                          classesTaught.includes(grade)
                            ? 'bg-purple-600 border-purple-400 text-white shadow-[0_4px_12px_rgba(168,85,247,0.4)]'
                            : 'bg-gray-950/40 border-gray-800 text-gray-500 hover:border-purple-500/50 hover:text-purple-400'
                        }`}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 mr-1">سنوات الخبرة في التدريس</label>
                  <select
                    {...register('experienceYears')}
                    className="w-full px-5 py-3.5 bg-gray-950/40 border border-gray-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
                  >
                    <option value="" disabled hidden>اختر سنوات الخبرة</option>
                    {EXPERIENCE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-4 p-5 rounded-3xl bg-blue-500/5 border border-blue-500/20 group cursor-pointer hover:bg-blue-500/10 transition-colors">
                <div className="flex items-center h-6">
                  <input 
                    type="checkbox" 
                    id="acceptTerms"
                    {...register('acceptTerms')}
                    className="w-5 h-5 rounded-lg border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="acceptTerms" className="text-sm font-bold text-gray-300 cursor-pointer select-none">
                    أوافق على <Link href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors border-b border-blue-400/30">شروط الاستخدام</Link> و <Link href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors border-b border-blue-400/30">سياسة الخصوصية</Link>
                  </label>
                  <p className="text-[10px] text-gray-500">من خلال المتابعة، فإنك توافق على سياسات المنصة</p>
                  {errors.acceptTerms && (
                    <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-red-400 font-bold mt-1">
                      {errors.acceptTerms.message as string}
                    </motion.p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 py-4 px-4 bg-gray-800/50 hover:bg-gray-800 text-gray-300 border border-gray-700 rounded-2xl font-bold transition-all active:scale-95"
                disabled={isLoading}
              >
                رجوع
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-2/3 py-4 px-4 bg-gradient-to-r ${roleValue === 'STUDENT' ? 'from-blue-600 to-indigo-600' : 'from-purple-600 to-indigo-600'} hover:scale-[1.02] active:scale-95 text-white rounded-2xl font-bold shadow-xl transition-all flex justify-center items-center gap-3 text-lg`}
              >
                {isLoading ? (
                  <><Loader2 className="w-6 h-6 animate-spin" /> جاري التجهيز...</>
                ) : (
                  <>إكمال التسجيل <CheckCircle2 className="w-6 h-6" /></>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </form>

      <div className="mt-8 text-center text-sm text-gray-400">
        لديك حساب بالفعل؟{' '}
        <Link href={loginUrl} className="font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4">
          تسجيل الدخول
        </Link>
      </div>
    </motion.div>
  );
}

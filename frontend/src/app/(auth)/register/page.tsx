"use client";

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { m, AnimatePresence } from "framer-motion";
import { useAuth } from '@/contexts/auth-context';
import {
  BackgroundLayers,
  LoadingState,
  RegisterHeader,
  StepIndicator,
  RoleStep,
  PersonalInfoStep,
  PreferencesStep,
  RegisterFooter,
} from './_components';
import { OTPVerificationStep } from './_components/otp-verification-step';

// ─── Schemas ────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  role: z.enum(['STUDENT', 'TEACHER'], { required_error: 'يرجى اختيار نوع الحساب' }),
  username: z
    .string()
    .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
    .max(30, 'اسم المستخدم لا يتجاوز 30 حرفاً')
    .regex(/^[a-zA-Z0-9_\u0600-\u06FF]+$/, 'اسم المستخدم يحتوي على أحرف غير مسموح بها'),
  email: z.string().trim().email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z
    .string()
    .min(8, 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير')
    .regex(/[0-9]/, 'يجب أن تحتوي على رقم'),
  confirmPassword: z.string().min(1, 'تأكيد كلمة المرور مطلوب'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gradeLevel: z.string().optional(),
  educationType: z.string().optional(),
  interestedSubjects: z.array(z.string()).optional(),
  acceptTerms: z.boolean().refine(v => v === true, { message: 'يجب الموافقة على الشروط والأحكام' }),
}).refine(d => d.password === d.confirmPassword, {
  message: 'كلمة المرور وتأكيدها غير متطابقتين',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Validators per step ─────────────────────────────────────────────────────

const STEP_FIELDS: Record<number, (keyof RegisterFormValues)[]> = {
  1: ['username', 'email', 'password', 'confirmPassword'],
  2: ['acceptTerms'],
};

// ─── Main form component ─────────────────────────────────────────────────────

function RegisterForm() {
  const router = useRouter();
  const { register: registerUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [interestedSubjects, setInterestedSubjects] = useState<string[]>([]);
  const [showOTP, setShowOTP] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'STUDENT',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      dateOfBirth: '',
      gradeLevel: '',
      educationType: '',
      interestedSubjects: [],
      acceptTerms: false,
    },
    mode: 'onChange',
  });

  const passwordValue = watch('password') || '';
  const roleValue = watch('role') || '';
  const acceptTerms = watch('acceptTerms') || false;

  // Redirect if already authenticated
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  const handleNextStep = useCallback(async () => {
    const fields = STEP_FIELDS[step];
    if (fields) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setErrorStatus(null);
    setStep(s => s + 1);
  }, [step, trigger]);

  const handlePrevStep = useCallback(() => {
    setErrorStatus(null);
    setStep(s => s - 1);
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('phone', e.target.value);
  }, [setValue]);

  const toggleArrayItem = useCallback((field: 'interestedSubjects', value: string) => {
    setInterestedSubjects(prev => {
      const updated = prev.includes(value)
        ? prev.filter(i => i !== value)
        : [...prev, value];
      setValue('interestedSubjects', updated);
      return updated;
    });
  }, [setValue]);

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    setErrorStatus(null);
    try {
      const result = await registerUser({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        username: data.username,
        role: data.role,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        gradeLevel: data.gradeLevel,
        educationType: data.educationType,
        interestedSubjects: data.interestedSubjects,
      });

      if (result.success) {
        if (result.autoLoggedIn) {
          router.replace('/dashboard');
        } else {
          // Email verification required
          setRegisteredEmail(data.email.trim().toLowerCase());
          setShowOTP(true);
        }
      } else {
        setErrorStatus(result.error || 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      setErrorStatus(err?.message || 'حدث خطأ غير متوقع أثناء إنشاء الحساب.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading && !isSubmitting && !showOTP) {
    return <LoadingState />;
  }

  if (showOTP) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#020202] overflow-hidden" dir="rtl">
        <BackgroundLayers />
        <OTPVerificationStep email={registeredEmail} onSuccess={() => router.replace('/dashboard')} />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center py-16 px-4 bg-[#020202] overflow-hidden selection:bg-primary/30"
      dir="rtl"
    >
      <BackgroundLayers />

      <m.div
        initial={{ opacity: 0, y: 20, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-3xl space-y-10 z-10"
      >
        {/* Header */}
        <RegisterHeader />

        {/* Step Indicator */}
        <StepIndicator step={step} />

        {/* Card */}
        <m.div
          layout
          className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-black/60 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
        >
          <div className="p-8 md:p-14">
            {/* Global error */}
            <AnimatePresence>
              {errorStatus && (
                <m.div
                  key="error"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-bold text-red-400 text-center"
                >
                  {errorStatus}
                </m.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <PersonalInfoStep
                    key="step1"
                    register={register}
                    errors={errors}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    showConfirmPassword={showConfirmPassword}
                    setShowConfirmPassword={setShowConfirmPassword}
                    handlePhoneChange={handlePhoneChange}
                    passwordValue={passwordValue}
                    onNext={handleNextStep}
                  />
                )}
                {step === 2 && (
                  <PreferencesStep
                    key="step2"
                    register={register}
                    errors={errors}
                    interestedSubjects={interestedSubjects}
                    toggleArrayItem={toggleArrayItem}
                    acceptTerms={acceptTerms}
                    onBack={handlePrevStep}
                    isLoading={isSubmitting}
                  />
                )}
              </AnimatePresence>
            </form>
          </div>
        </m.div>

        {/* Footer */}
        <RegisterFooter loginUrl="/login" />
      </m.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#020202] overflow-hidden">
          <BackgroundLayers />
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-primary/20 border-t-primary z-10" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

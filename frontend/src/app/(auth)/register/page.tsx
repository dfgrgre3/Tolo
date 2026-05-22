'use client';

import { useCallback, useMemo, useState, Suspense } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { m, AnimatePresence } from "framer-motion";
import { useAuth } from '@/contexts/auth-context';
import { DEFAULT_AUTHENTICATED_ROUTE, sanitizeRedirectPath } from '@/services/auth/navigation';
import { toast } from 'sonner';

import { BackgroundLayers, LoadingState, RegisterHeader, StepIndicator, RoleStep, PersonalInfoStep, PreferencesStep, RegisterFooter } from './_components';

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

const formatPhoneNumber = (value: string): string => {
  if (!value) return '';
  return value.replace(/\D/g, '').substring(0, 11);
};

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
    return /^(010|011|012|015)\d{8}$/.test(val);
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

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser, isLoading: isAuthLoading } = useAuth();
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
    defaultValues: { role: 'STUDENT', interestedSubjects: [], acceptTerms: false, country: 'مصر' }
  });

  const roleValue = useWatch({ control, name: 'role' }) || 'STUDENT';
  const interestedSubjects = useWatch({ control, name: 'interestedSubjects', defaultValue: [] }) || [];
  const passwordValue = useWatch({ control, name: 'password', defaultValue: '' }) || '';
  const acceptTerms = useWatch({ control, name: 'acceptTerms', defaultValue: false });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('phone', formatPhoneNumber(e.target.value), { shouldValidate: true });
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = COUNTRIES.find((c) => c.code === e.target.value);
    if (country) {
      setValue('country', country.name, { shouldValidate: true });
      setSelectedCountry(country.code);
    }
  };

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof RegisterFormValues)[] = [];
    if (step === 1) fieldsToValidate = ['role'];
    if (step === 2) fieldsToValidate = ['username', 'email', 'password', 'confirmPassword', 'phone', 'country', 'dateOfBirth'];
    const isValid = await trigger(fieldsToValidate);
    if (isValid) { setStep((prev) => prev + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else { toast.error('يرجى التأكد من صحة البيانات المدخلة'); }
  };

  const toggleArrayItem = (field: 'interestedSubjects', value: string) => {
    const currentList = getValues(field) || [];
    setValue(field, currentList.includes(value) ? currentList.filter((item) => item !== value) : [...currentList, value]);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const result = await registerUser({
        ...data, email: data.email, password: data.password,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null,
      });
      if (result.success) {
        toast.success('تم إنشاء الهوية بنجاح! مرحباً بك في تولو');
        result.autoLoggedIn ? (router.replace(redirectUrl), router.refresh()) : setTimeout(() => router.push(loginUrl), 2000);
      } else {
        toast.error(result.error || 'فشل إنشاء الحساب');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) return <LoadingState />;

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center py-12 px-4 bg-[#020202] overflow-hidden selection:bg-primary/30" dir="rtl">
      <BackgroundLayers />
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-4xl space-y-12">
        <RegisterHeader />
        <StepIndicator step={step} />
        <m.div layout className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-black/60 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
          <div className="p-8 md:p-16 lg:p-20">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
              <AnimatePresence mode="wait">
                {step === 1 && <RoleStep register={register} roleValue={roleValue} onNext={handleNextStep} />}
                {step === 2 && (
                  <PersonalInfoStep
                    register={register} errors={errors}
                    showPassword={showPassword} setShowPassword={setShowPassword}
                    showConfirmPassword={showConfirmPassword} setShowConfirmPassword={setShowConfirmPassword}
                    selectedCountry={selectedCountry} handleCountryChange={handleCountryChange}
                    handlePhoneChange={handlePhoneChange} passwordValue={passwordValue}
                    onNext={handleNextStep} onBack={() => setStep(1)}
                  />
                )}
                {step === 3 && (
                  <PreferencesStep
                    register={register} errors={errors}
                    interestedSubjects={interestedSubjects} toggleArrayItem={toggleArrayItem}
                    acceptTerms={acceptTerms} onBack={() => setStep(2)} isLoading={isLoading}
                  />
                )}
              </AnimatePresence>
            </form>
          </div>
        </m.div>
        <RegisterFooter loginUrl={loginUrl} />
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

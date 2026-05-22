'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2, AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { m, AnimatePresence } from "framer-motion";
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير واحد')
    .regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير واحد')
    .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد')
    .regex(/[^A-Za-z0-9]/, 'يجب أن تحتوي على رمز خاص واحد'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordValues) => {
    if (!token) {
      toast.error('رابط غير صالح');
      setStatus({ type: 'error', message: 'رابط إعادة التعيين غير صالح أو مفقود.' });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const result = await resetPassword(token, data.password);

      if (result.success) {
        toast.success('تمت إعادة تعيين كلمة المرور بنجاح');
        setStatus({
          type: 'success',
          message: 'تمت إعادة تعيين كلمة المرور بنجاح! جاري تحويلك لصفحة الدخول...',
        });
        setTimeout(() => router.push('/login'), 2000);
      } else {
        toast.error(result.error || 'فشل إعادة التعيين');
        setStatus({
          type: 'error',
          message: result.error || 'فشل في إعادة تعيين كلمة المرور.',
        });
      }
    } catch (_error) {
      toast.error('حدث خطأ في الشبكة');
    }

    setIsLoading(false);
  };

  if (!token) {
    return (
      <m.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] text-red-500 text-center backdrop-blur-xl"
      >
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <h3 className="text-xl font-black mb-2">رابط غير صالح</h3>
        <p className="text-sm font-medium">يبدو أن رابط إعادة تعيين كلمة المرور قد انتهى أو أنه غير صحيح.</p>
        <Button 
          variant="outline"
          onClick={() => router.push('/forgot-password')}
          className="mt-6 border-red-500/20 hover:bg-red-500/10 text-red-500 rounded-xl"
        >
          طلب رابط جديد
        </Button>
      </m.div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-black overflow-hidden" dir="rtl">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 blur-[130px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/10 blur-[130px] rounded-full" />

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-[450px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-8 md:p-12 backdrop-blur-2xl shadow-2xl"
      >
        <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-[2.5rem]" />

        <div className="mb-10 text-center space-y-4">
           <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <ShieldCheck className="w-8 h-8 text-primary shadow-xl" />
           </div>
           <h2 className="text-3xl font-black text-white tracking-tight">تجديد <span className="text-primary">الهوية</span></h2>
           <p className="text-gray-400 text-sm font-medium">أدخل شيفرة الدخول الجديدة والآمنة لحسابك.</p>
        </div>

        <AnimatePresence mode="wait">
          {status && (
            <m.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`mb-8 p-4 rounded-2xl flex items-start gap-3 border ${
                status.type === 'error' 
                  ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                  : 'bg-green-500/10 border-green-500/20 text-green-400'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">{status.message}</p>
            </m.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mr-1">الشيفرة الجديدة</label>
            <div className="relative group">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-primary transition-colors" />
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                className="w-full h-14 pr-12 pl-12 bg-white/5 border border-white/10 rounded-2xl focus:border-primary/50 transition-all outline-none text-white font-bold text-sm"
                placeholder="⬢⬢⬢⬢⬢⬢⬢⬢"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-[10px] font-black text-red-500 uppercase mr-1">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mr-1">تأكيد الشيفرة</label>
            <div className="relative group">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-primary transition-colors" />
              <input
                {...register('confirmPassword')}
                type={showPassword ? 'text' : 'password'}
                className="w-full h-14 pr-12 pl-6 bg-white/5 border border-white/10 rounded-2xl focus:border-primary/50 transition-all outline-none text-white font-bold text-sm"
                placeholder="⬢⬢⬢⬢⬢⬢⬢⬢"
              />
            </div>
            {errors.confirmPassword && <p className="text-[10px] font-black text-red-500 uppercase mr-1">{errors.confirmPassword.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={isLoading || status?.type === 'success'}
            className="w-full h-14 rounded-2xl bg-primary text-black font-black text-md relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              <div className="flex items-center justify-center gap-3">
                <span className="uppercase tracking-widest">تحديث الشيفرة</span>
                <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </div>
            )}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between opacity-30">
          <Sparkles size={12} className="text-primary" />
          <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Security Encryption Active</span>
          <Sparkles size={12} className="text-primary" />
        </div>
      </m.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

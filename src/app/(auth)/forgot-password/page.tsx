'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { m, AnimatePresence } from "framer-motion";
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const forgotPasswordSchema = z.object({
  email: z.string().email('يرجى إدخال بريد إلكتروني صحيح'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    setIsLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('تم إرسال رابط إعادة التعيين بنجاح');
        setStatus({
          type: 'success',
          message: result.message || 'إذا كان هذا البريد مسجلاً لدينا، فستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور.',
        });
      } else {
        toast.error(result.error || 'حدث خطأ ما');
        setStatus({
          type: 'error',
          message: result.error || 'شيء ما سار بشكل خاطئ. يرجى المحاولة مرة أخرى.',
        });
      }
    } catch (_error) {
      toast.error('خطأ في الاتصال بالشبكة');
      setStatus({
        type: 'error',
        message: 'خطأ في الشبكة. يرجى التحقق من اتصالك.',
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-black overflow-hidden" dir="rtl">
      {/* Background Decor */}
      <div className="absolute top-[-5%] right-[-5%] w-[500px] h-[500px] bg-primary/20 blur-[130px] rounded-full" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-blue-600/10 blur-[130px] rounded-full" />
      
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[450px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-8 md:p-12 backdrop-blur-2xl shadow-2xl"
      >
        <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-[2.5rem]" />

        <div className="mb-10 text-center space-y-4">
           <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 shadow-xl">
              <KeyRound className="w-8 h-8 text-primary" />
           </div>
           <h2 className="text-3xl font-black text-white tracking-tight">استعادة <span className="text-primary">الشيفرة</span></h2>
           <p className="text-gray-400 text-sm font-medium">لا تقلق، سنرسل لك رابطاً لاستعادة الوصول إلى حسابك.</p>
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
              {status.type === 'error' ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-xs font-bold leading-relaxed">{status.message}</p>
            </m.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-3">
            <label htmlFor="forgot-email" className="text-[10px] font-black uppercase tracking-widest text-gray-500 mr-1">المعرف الإلكتروني (البريد)</label>
            <div className="relative group">
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-primary transition-colors" />
              <input
                id="forgot-email"
                {...register('email')}
                type="email"
                disabled={isLoading || status?.type === 'success'}
                className="w-full h-14 pr-12 pl-6 bg-white/5 border border-white/10 rounded-2xl focus:border-primary/50 transition-all outline-none text-white font-bold text-sm disabled:opacity-50"
                placeholder="warrior@realm.me"
              />
            </div>
            {errors.email && (
              <p className="text-[10px] font-black text-red-500 uppercase mr-1">{errors.email.message}</p>
            )}
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
                <span className="uppercase tracking-widest">إرسـال الرابـط</span>
                <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </div>
            )}
          </Button>
        </form>

        <div className="mt-10 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-xs font-black text-gray-500 hover:text-white transition-all uppercase tracking-widest group">
            <ArrowLeft className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> العودة للبوابة
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center opacity-30">
          <Sparkles size={12} className="text-primary mr-2" />
          <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Ancient Key Protection</span>
          <Sparkles size={12} className="text-primary ml-2" />
        </div>
      </m.div>
    </div>
  );
}

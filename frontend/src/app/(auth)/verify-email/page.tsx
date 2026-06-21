'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { m, AnimatePresence } from "framer-motion";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { errorService } from '@/lib/logging/error-service';

function VerifyEmailContent() {
  const { verifyEmail } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const initialState = useMemo(() => {
    if (!token) {
      return { status: 'error' as const, message: 'رابط التفعيل مفقود أو غير صالح.' };
    }
    return { status: 'loading' as const, message: 'جاري تأكيد هويتك في السجلات...' };
  }, [token]);
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(initialState.status);
  const [message, setMessage] = useState(initialState.message);

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        const result = await verifyEmail(token);

        if (result.success) {
          setStatus('success');
          setMessage('تم تفعيل حسابك بنجاح! ننتظرك في الداخل...');
          setTimeout(() => router.push('/dashboard'), 3000);
        } else {
          setStatus('error');
          setMessage(result.error || 'فشل تفعيل الحساب.');
        }
      } catch (error) {
        errorService.logError(error, {
          source: 'VerifyEmailPage',
          severity: 'medium',
        });
        setStatus('error');
        setMessage('خطأ في الاتصال بالسيرفر.');
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="relative min-h-[500px] flex flex-col items-center justify-center p-8 text-center" dir="rtl">
      <AnimatePresence mode="wait">
        {status === 'loading' && (
          <m.div 
            key="loading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-6"
          >
            <div className="relative w-24 h-24 mx-auto mb-10">
               <m.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full"
               />
               <ShieldCheck className="absolute inset-0 m-auto w-10 h-10 text-primary animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-foreground tracking-tight">جاري التحقق...</h2>
            <p className="text-muted-foreground font-medium">{message}</p>
          </m.div>
        )}

        {status === 'success' && (
          <m.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <div className="relative w-24 h-24 mx-auto mb-10 bg-green-500/10 rounded-[2rem] flex items-center justify-center shadow-2xl">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <m.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 border-2 border-green-500 rounded-[2rem]"
              />
            </div>
            <div>
              <h2 className="text-4xl font-black text-foreground mb-3">تم النشوء!</h2>
              <p className="text-green-600 dark:text-green-400 font-bold max-w-sm mx-auto">{message}</p>
            </div>
            <Button 
              asChild
              className="h-14 px-8 rounded-2xl bg-primary text-black font-black hover:bg-primary/90 shadow-lg shadow-primary/20 group"
            >
              <Link href="/dashboard">
                الدخول للمنصة <ArrowRight className="mr-3 h-5 w-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </Button>
          </m.div>
        )}

        {status === 'error' && (
          <m.div 
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-foreground">عائق في السجل</h2>
              <p className="text-red-600 dark:text-red-400 font-bold">{message}</p>
            </div>
            <div className="flex flex-col gap-4 max-w-xs mx-auto">
              <Button 
                onClick={() => router.refresh()}
                className="h-14 rounded-2xl bg-muted/40 border border-border text-foreground hover:bg-muted/60"
              >
                المحاولة مجدداً
              </Button>
              <Link 
                href="/login"
                className="text-xs font-black text-muted-foreground hover:text-foreground transition-all uppercase tracking-widest"
              >
                العودة للبوابة
              </Link>
            </div>
          </m.div>
        )}
      </AnimatePresence>
      
      <div className="absolute bottom-8 flex items-center gap-3 opacity-30">
         <Sparkles size={14} className="text-primary" />
         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Identity Verification Core</span>
         <Sparkles size={14} className="text-primary" />
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="w-full flex items-center justify-center p-4 selection:bg-primary/30 z-10">
      <m.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-[500px] rounded-[3rem] border border-border bg-card/40 backdrop-blur-3xl shadow-2xl p-4 md:p-8 transition-colors duration-300"
      >
        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
          <VerifyEmailContent />
        </Suspense>
      </m.div>
    </div>
  );
}

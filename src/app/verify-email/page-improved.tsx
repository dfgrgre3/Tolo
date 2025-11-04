'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Home,
  Loader2,
  MailQuestion,
  Mail,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/shared/button';
import { toast } from 'sonner';

type VerificationState = 'idle' | 'loading' | 'success' | 'already' | 'error' | 'expired';

export default function VerifyEmailPageImproved() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<VerificationState>('idle');
  const [message, setMessage] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);

  const token = useMemo(() => searchParams.get('token'), [searchParams]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('لم يتم تحديد رمز التفعيل. تأكد من فتح الرابط الصحيح.');
      return;
    }

    setStatus('loading');

    const verify = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await response
          .json()
          .catch(() => ({} as Record<string, unknown>));

        if (!response.ok) {
          // Check if token is expired
          if (data.error?.includes('expired') || data.error?.includes('منتهي')) {
            setStatus('expired');
            setMessage(data.error || 'انتهت صلاحية رابط التفعيل. يرجى طلب رابط جديد.');
          } else {
            setStatus('error');
            setMessage(
              typeof data?.error === 'string'
                ? data.error
                : 'تعذر تفعيل البريد الإلكتروني. يرجى طلب رابط جديد.',
            );
          }
          return;
        }

        if (data?.alreadyVerified) {
          setStatus('already');
          setMessage(
            typeof data?.message === 'string'
              ? data.message
              : 'تم تفعيل البريد مسبقاً.',
          );
          return;
        }

        setStatus('success');
        setMessage(
          typeof data?.message === 'string'
            ? data.message
            : 'تم تفعيل البريد الإلكتروني بنجاح.',
        );

        // Auto redirect after 3 seconds
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } catch (error) {
        console.error('Verify email request failed:', error);
        setStatus('error');
        setMessage('حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.');
      }
    };

    verify();
  }, [token, router]);

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // Read response text first to check if it's HTML
      const text = await response.text();
      
      // Check if response is HTML (error page)
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.error('Server returned HTML instead of JSON');
        toast.error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
        setIsResending(false);
        return;
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        toast.error('فشل في معالجة استجابة الخادم');
        setIsResending(false);
        return;
      }

      if (response.ok) {
        toast.success('تم إرسال رابط التفعيل إلى بريدك الإلكتروني');
        setResendCooldown(60); // 60 seconds cooldown
      } else {
        toast.error(data.error || 'فشل إرسال رابط التفعيل');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error('حدث خطأ أثناء إرسال رابط التفعيل');
    } finally {
      setIsResending(false);
    }
  };

  const renderIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />;
      case 'success':
        return <CheckCircle2 className="h-8 w-8 text-emerald-500" />;
      case 'already':
        return <MailQuestion className="h-8 w-8 text-indigo-400" />;
      case 'expired':
        return <Clock className="h-8 w-8 text-orange-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-rose-500" />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20">
              {renderIcon()}
            </div>
            <h1 className="text-2xl font-semibold text-white">
              جاري التحقق من الرمز...
            </h1>
            <p className="text-sm text-slate-300">
              يرجى الانتظار بينما نتحقق من صحة رابط التفعيل
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              {renderIcon()}
            </div>
            <h1 className="text-2xl font-semibold text-white">
              تم تفعيل البريد الإلكتروني بنجاح
            </h1>
            <p className="text-sm text-slate-300">{message}</p>
            <div className="space-y-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-right text-xs text-emerald-100">
              <p className="font-medium">
                سيتم توجيهك تلقائياً إلى الصفحة الرئيسية خلال بضع ثوانٍ...
              </p>
            </div>
          </div>
        );

      case 'already':
        return (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20">
              {renderIcon()}
            </div>
            <h1 className="text-2xl font-semibold text-white">
              الحساب مفعل مسبقاً
            </h1>
            <p className="text-sm text-slate-300">{message}</p>
          </div>
        );

      case 'expired':
        return (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20">
              {renderIcon()}
            </div>
            <h1 className="text-2xl font-semibold text-white">
              انتهت صلاحية رابط التفعيل
            </h1>
            <p className="text-sm text-slate-300">{message}</p>
            <div className="space-y-3 rounded-2xl border border-orange-400/40 bg-orange-500/10 p-4 text-right text-xs text-orange-100">
              <p className="font-medium">
                يمكنك طلب رابط تفعيل جديد أدناه
              </p>
            </div>
            <Button
              onClick={handleResendVerification}
              disabled={resendCooldown > 0 || isResending}
              className="w-full gap-2 bg-orange-600 text-white hover:bg-orange-700"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Clock className="h-4 w-4" />
                  إعادة إرسال ({resendCooldown} ثانية)
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  إعادة إرسال رابط التفعيل
                </>
              )}
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20">
              {renderIcon()}
            </div>
            <h1 className="text-2xl font-semibold text-white">
              تعذر إتمام التفعيل
            </h1>
            <p className="text-sm text-slate-300">{message}</p>
            <div className="space-y-3 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-right text-xs text-rose-100">
              <p className="font-medium">
                تحقق من صلاحية الرابط أو اطلب رابط تفعيل جديد
              </p>
            </div>
            <Button
              onClick={handleResendVerification}
              disabled={resendCooldown > 0 || isResending}
              className="w-full gap-2 bg-rose-600 text-white hover:bg-rose-700"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Clock className="h-4 w-4" />
                  إعادة إرسال ({resendCooldown} ثانية)
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  إعادة إرسال رابط التفعيل
                </>
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-50">
      <div className="w-full max-w-lg space-y-8 rounded-3xl border border-white/10 bg-slate-900/70 p-10 backdrop-blur">
        {renderContent()}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {(status === 'success' || status === 'already') && (
            <Button asChild className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
              <Link href="/">
                <Home className="h-4 w-4" />
                العودة إلى الصفحة الرئيسية
              </Link>
            </Button>
          )}
          {(status === 'error' || status === 'expired') && (
            <>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  الصفحة الرئيسية
                </Link>
              </Button>
              <Button asChild className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
                <Link href="/login">تسجيل الدخول</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


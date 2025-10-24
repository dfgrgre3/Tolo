'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Home,
  Loader2,
  MailQuestion,
} from 'lucide-react';
import { Button } from '@/shared/button';

type VerificationState = 'idle' | 'loading' | 'success' | 'already' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<VerificationState>('idle');
  const [message, setMessage] = useState<string>('');

  const token = useMemo(() => searchParams.get('token'), [searchParams]);

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
          setStatus('error');
          setMessage(
            typeof data?.error === 'string'
              ? data.error
              : 'تعذر تفعيل البريد الإلكتروني. يرجى طلب رابط جديد.',
          );
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
      } catch (error) {
        console.error('Verify email request failed:', error);
        setStatus('error');
        setMessage('حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.');
      }
    };

    verify();
  }, [token]);

  const renderIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />;
      case 'success':
        return <CheckCircle2 className="h-6 w-6 text-emerald-500" />;
      case 'already':
        return <MailQuestion className="h-6 w-6 text-indigo-400" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-rose-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-50">
      <div className="w-full max-w-lg space-y-8 rounded-3xl border border-white/10 bg-slate-900/70 p-10 backdrop-blur">
        <div className="flex flex-col items-center gap-4 text-center">
          {renderIcon()}
          <h1 className="text-2xl font-semibold">
            {status === 'success'
              ? 'تم تفعيل البريد الإلكتروني'
              : status === 'already'
              ? 'الحساب مفعل مسبقاً'
              : status === 'loading'
              ? 'جاري التحقق من الرمز'
              : 'تعذر إتمام التفعيل'}
          </h1>
          <p className="text-sm text-slate-300">{message}</p>
        </div>

        {status === 'success' || status === 'already' ? (
          <div className="space-y-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-right text-xs text-emerald-100">
            <p className="font-medium">
              يمكنك الآن متابعة تسجيل الدخول أو استكمال إعداد الأمان من لوحة
              التحكم.
            </p>
            <p>
              إذا كنت قد طلبت تفعيل المصادقة الثنائية، توجه مباشرة إلى صفحة
              الإعدادات لإكمال العملية.
            </p>
          </div>
        ) : null}

        {status === 'error' && (
          <div className="space-y-3 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-right text-xs text-rose-100">
            <p className="font-medium">
              تحقق من صلاحية الرابط أو اطلب رابط تفعيل جديد من صفحة الحساب.
            </p>
            <p>
              في حال استمرار المشكلة، تواصل مع فريق الدعم وسنقوم بمساعدتك في
              تفعيل الحساب.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              العودة إلى الصفحة الرئيسية
            </Link>
          </Button>
          <Button asChild className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
            <Link href="/login">الانتقال إلى تسجيل الدخول</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

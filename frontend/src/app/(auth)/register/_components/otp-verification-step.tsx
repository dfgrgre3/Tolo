'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Mail, CheckCircle2, RefreshCw, ArrowRight, Loader2 } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';

interface OTPVerificationStepProps {
  readonly email: string;
  readonly onSuccess: () => void;
}

export function OTPVerificationStep({ email, onSuccess }: OTPVerificationStepProps) {
  const clerk = useClerk();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      const t = setTimeout(() => setCanResend(true), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleOtpChange = useCallback((index: number, value: string) => {
    const sanitized = value.replace(/\D/g, '').slice(-1);
    setOtp(prev => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });
    setError(null);

    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    const lastFilled = Math.min(pasted.length, 5);
    inputRefs.current[lastFilled]?.focus();
  }, []);

  const handleVerify = useCallback(async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('يرجى إدخال رمز التحقق كاملاً');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      if (!clerk) throw new Error('Auth not loaded');

      const result = await clerk.client.signUp.attemptEmailAddressVerification({ code });

      if (result.status === 'complete') {
        await clerk.setActive({ session: result.createdSessionId });
        setSuccess(true);
        setTimeout(() => onSuccess(), 1200);
      } else {
        setError('رمز التحقق غير صحيح أو منتهي الصلاحية');
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message?: string }[] };
      setError(clerkErr?.errors?.[0]?.message || 'فشل التحقق. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsVerifying(false);
    }
  }, [otp, clerk, onSuccess]);

  const handleResend = useCallback(async () => {
    if (!canResend || !clerk) return;
    setIsResending(true);
    setError(null);
    try {
      await clerk.client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message?: string }[] };
      setError(clerkErr?.errors?.[0]?.message || 'فشل إعادة الإرسال');
    } finally {
      setIsResending(false);
    }
  }, [canResend, clerk]);

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (otp.every(d => d !== '') && !isVerifying && !success) {
      const t = setTimeout(() => {
        handleVerify();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [otp, handleVerify, isVerifying, success]);

  return (
    <m.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-lg mx-auto z-10"
    >
      <div className="rounded-[3rem] border border-white/5 bg-black/70 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden">
        <div className="p-10 md:p-14 text-center space-y-10">

          {/* Icon */}
          <m.div
            animate={success ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
            className="mx-auto w-24 h-24 rounded-[2rem] flex items-center justify-center"
            style={{
              background: success
                ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))'
                : 'linear-gradient(135deg, rgba(255,109,0,0.2), rgba(255,109,0,0.05))',
              border: `1px solid ${success ? 'rgba(34,197,94,0.3)' : 'rgba(255,109,0,0.3)'}`,
            }}
          >
            <AnimatePresence mode="wait">
              {success ? (
                <m.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </m.div>
              ) : (
                <m.div key="mail" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Mail className="w-12 h-12 text-primary" />
                </m.div>
              )}
            </AnimatePresence>
          </m.div>

          {/* Title */}
          <div className="space-y-3">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
              {success ? 'تم التحقق بنجاح! 🎉' : 'تحقق من بريدك'}
            </h2>
            <p className="text-gray-500 font-bold text-sm leading-relaxed">
              {success
                ? 'جارٍ تحويلك إلى لوحة التحكم...'
                : <>أرسلنا رمز تحقق مكوّن من 6 أرقام إلى<br /><span className="text-primary font-black">{email}</span></>
              }
            </p>
          </div>

          {/* OTP Inputs */}
          {!success && (
            <>
              <div className="flex items-center justify-center gap-3 md:gap-4" dir="ltr">
                {otp.map((digit, index) => (
                  <m.input
                    key={index}
                    ref={el => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    whileFocus={{ scale: 1.08 }}
                    animate={{
                      borderColor: digit
                        ? 'rgba(255,109,0,0.8)'
                        : error
                          ? 'rgba(239,68,68,0.5)'
                          : 'rgba(255,255,255,0.08)',
                      backgroundColor: digit
                        ? 'rgba(255,109,0,0.08)'
                        : 'rgba(255,255,255,0.03)',
                    }}
                    className="w-12 h-14 md:w-14 md:h-16 rounded-2xl border text-white text-2xl font-black text-center outline-none transition-shadow"
                    style={{ boxShadow: digit ? '0 0 20px rgba(255,109,0,0.15)' : 'none' }}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <m.p
                    key="err"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="text-sm font-bold text-red-400"
                  >
                    {error}
                  </m.p>
                )}
              </AnimatePresence>

              {/* Verify Button */}
              <m.button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying || otp.some(d => !d)}
                whileHover={!isVerifying ? { scale: 1.02 } : {}}
                whileTap={!isVerifying ? { scale: 0.98 } : {}}
                className="w-full h-16 rounded-2xl bg-primary text-black font-black text-lg relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
              >
                <m.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ y: '100%' }}
                  whileHover={{ y: 0 }}
                  transition={{ duration: 0.3 }}
                />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {isVerifying
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> جارٍ التحقق...</>
                    : <> تأكيد الهوية <ArrowRight className="w-5 h-5" /></>
                  }
                </span>
              </m.button>

              {/* Resend */}
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="text-gray-600 font-bold">لم تستلم الرمز؟</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-primary font-black hover:text-orange-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isResending
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <RefreshCw className="w-4 h-4" />
                    }
                    إعادة الإرسال
                  </button>
                ) : (
                  <span className="text-gray-500 font-black tabular-nums">
                    {countdown}ث
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </m.div>
  );
}

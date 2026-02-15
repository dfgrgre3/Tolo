'use client';

/**
 * 📧 EmailVerification - صفحة التحقق من البريد الإلكتروني
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ArrowRight,
  Clock,
  Loader2,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthCard, AuthButton } from '@/components/auth';
import { useEmailVerification, VerificationStatus } from './useEmailVerification';

interface EmailVerificationProps {
  email?: string;
  onVerified?: () => void;
  showCodeInput?: boolean;
}

export function EmailVerification({ 
  email: initialEmail, 
  onVerified,
  showCodeInput = true 
}: EmailVerificationProps) {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const emailFromUrl = searchParams?.get('email');

  const {
    status,
    email,
    isLoading,
    error,
    countdown,
    canResend,
    verificationCode,
    setEmail,
    setVerificationCode,
    verifyEmail,
    resendVerification,
  } = useEmailVerification(initialEmail || emailFromUrl || '');

  // Auto-verify if token is present
  useEffect(() => {
    if (token && status === 'pending') {
      verifyEmail(undefined, token);
    }
  }, [token, status, verifyEmail]);

  // Handle successful verification
  useEffect(() => {
    if (status === 'verified' && onVerified) {
      const timer = setTimeout(onVerified, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, onVerified]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length === 6) {
      await verifyEmail();
    }
  };

  const renderPendingState = () => (
    <motion.div
      key="pending"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
        className="mx-auto relative"
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
          <Mail className="h-10 w-10 text-indigo-400" />
        </div>
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [1, 0.5, 1] 
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-1 -right-1"
        >
          <Sparkles className="h-6 w-6 text-purple-400" />
        </motion.div>
      </motion.div>

      {/* Content */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">
          تحقق من بريدك الإلكتروني
        </h2>
        <p className="text-sm text-slate-400">
          لقد أرسلنا رمز التحقق إلى
          <br />
          <span className="text-indigo-400 font-medium">{email}</span>
        </p>
      </div>

      {/* Code Input */}
      {showCodeInput && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={verificationCode[index] || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) {
                    const newCode = verificationCode.split('');
                    newCode[index] = value;
                    setVerificationCode(newCode.join(''));
                    
                    if (value && index < 5) {
                      const nextInput = e.target.parentElement?.querySelector(
                        `input:nth-child(${index + 2})`
                      ) as HTMLInputElement;
                      nextInput?.focus();
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
                    const prevInput = e.currentTarget.parentElement?.querySelector(
                      `input:nth-child(${index})`
                    ) as HTMLInputElement;
                    prevInput?.focus();
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(pastedData);
                }}
                className={`
                  w-11 h-14 text-center text-xl font-bold
                  rounded-xl border bg-white/5 text-white
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  transition-all duration-200
                  ${error ? 'border-red-500' : 'border-white/20 hover:border-white/30'}
                `}
                disabled={isLoading}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}

          <AuthButton
            type="submit"
            fullWidth
            isLoading={isLoading}
            loadingText="جاري التحقق..."
            disabled={verificationCode.length !== 6}
          >
            تحقق الآن
          </AuthButton>
        </form>
      )}

      {/* Resend */}
      <div className="text-center text-sm">
        <span className="text-slate-400">لم تستلم الرمز؟ </span>
        <button
          type="button"
          onClick={resendVerification}
          disabled={!canResend || isLoading}
          className={`
            inline-flex items-center gap-1 font-medium transition-colors
            ${canResend 
              ? 'text-indigo-400 hover:text-indigo-300 cursor-pointer' 
              : 'text-slate-500 cursor-not-allowed'}
          `}
        >
          {!canResend && <Clock className="h-3 w-3" />}
          {canResend ? 'إعادة الإرسال' : `${countdown}ث`}
        </button>
      </div>
    </motion.div>
  );

  const renderVerifyingState = () => (
    <motion.div
      key="verifying"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="text-center space-y-6 py-8"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="mx-auto w-16 h-16 flex items-center justify-center"
      >
        <Loader2 className="h-12 w-12 text-indigo-400" />
      </motion.div>
      <div>
        <h2 className="text-xl font-bold text-white mb-2">جاري التحقق...</h2>
        <p className="text-sm text-slate-400">يرجى الانتظار بينما نتحقق من بريدك الإلكتروني</p>
      </div>
    </motion.div>
  );

  const renderVerifiedState = () => (
    <motion.div
      key="verified"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <CheckCircle className="h-10 w-10 text-white" />
        </motion.div>
      </motion.div>

      <div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-white mb-2"
        >
          تم التحقق بنجاح! 🎉
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-slate-400"
        >
          بريدك الإلكتروني موثق الآن
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Link href="/dashboard">
          <AuthButton fullWidth icon={ArrowRight} iconPosition="right">
            الذهاب للوحة التحكم
          </AuthButton>
        </Link>
      </motion.div>
    </motion.div>
  );

  const renderExpiredState = () => (
    <motion.div
      key="expired"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30"
      >
        <Clock className="h-10 w-10 text-white" />
      </motion.div>

      <div>
        <h2 className="text-xl font-bold text-white mb-2">
          انتهت صلاحية الرابط
        </h2>
        <p className="text-slate-400">
          رابط التحقق منتهي الصلاحية. يمكنك طلب رابط جديد.
        </p>
      </div>

      <AuthButton
        fullWidth
        onClick={resendVerification}
        isLoading={isLoading}
        icon={RefreshCw}
      >
        إرسال رابط جديد
      </AuthButton>
    </motion.div>
  );

  const renderErrorState = () => (
    <motion.div
      key="error"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30"
      >
        <XCircle className="h-10 w-10 text-white" />
      </motion.div>

      <div>
        <h2 className="text-xl font-bold text-white mb-2">
          حدث خطأ
        </h2>
        <p className="text-slate-400">
          {error || 'فشل في التحقق من البريد الإلكتروني'}
        </p>
      </div>

      <div className="space-y-3">
        <AuthButton
          fullWidth
          onClick={resendVerification}
          isLoading={isLoading}
          icon={RefreshCw}
        >
          المحاولة مرة أخرى
        </AuthButton>
        <Link href="/login" className="block">
          <AuthButton fullWidth variant="secondary">
            العودة لتسجيل الدخول
          </AuthButton>
        </Link>
      </div>
    </motion.div>
  );

  return (
    <AuthCard className="w-full max-w-md" showLogo={false}>
      <AnimatePresence mode="wait">
        {status === 'pending' && renderPendingState()}
        {status === 'verifying' && renderVerifyingState()}
        {status === 'verified' && renderVerifiedState()}
        {status === 'expired' && renderExpiredState()}
        {status === 'error' && renderErrorState()}
      </AnimatePresence>
    </AuthCard>
  );
}

export default EmailVerification;

'use client';

/**
 * 📧 ForgotPasswordForm - نموذج طلب استعادة كلمة المرور
 * 
 * الخطوة الأولى: إدخال البريد الإلكتروني
 */

import React, { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, ArrowLeft, Loader2, Shield } from 'lucide-react';
import Link from 'next/link';
import { AuthCard, AuthInput, AuthButton } from '@/components/auth';
import { useForgotPassword } from './useForgotPassword';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ForgotPasswordForm({ onSuccess, onCancel }: ForgotPasswordFormProps) {
  const {
    step,
    email,
    code,
    newPassword,
    confirmPassword,
    isLoading,
    error,
    countdown,
    canResend,
    setEmail,
    setCode,
    setNewPassword,
    setConfirmPassword,
    requestReset,
    verifyCode,
    resetPassword,
    resendCode,
    goBack,
    validateEmail,
    validateCode,
    validatePasswords,
  } = useForgotPassword();

  const handleRequestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await requestReset();
  };

  const handleVerifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    await verifyCode();
  };

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const success = await resetPassword();
    if (success && onSuccess) {
      onSuccess();
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {['request', 'verify', 'reset'].map((s, index) => {
        const stepIndex = ['request', 'verify', 'reset'].indexOf(step);
        const isActive = index === stepIndex;
        const isCompleted = index < stepIndex;
        
        return (
          <div key={s} className="flex items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                transition-colors duration-300
                ${isActive 
                  ? 'bg-indigo-500 text-white' 
                  : isCompleted 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/10 text-slate-400'}
              `}
            >
              {isCompleted ? '✓' : index + 1}
            </motion.div>
            {index < 2 && (
              <div
                className={`
                  w-8 h-0.5 mx-1 transition-colors duration-300
                  ${isCompleted ? 'bg-green-500' : 'bg-white/10'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderRequestStep = () => (
    <motion.form
      key="request"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onSubmit={handleRequestSubmit}
      className="space-y-5"
    >
      <div className="text-center mb-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
          <Mail className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">استعادة كلمة المرور</h2>
        <p className="text-sm text-slate-400">
          أدخل بريدك الإلكتروني وسنرسل لك رمز التحقق
        </p>
      </div>

      <AuthInput
        type="email"
        label="البريد الإلكتروني"
        icon={Mail}
        value={email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        placeholder="example@email.com"
        error={error || undefined}
        disabled={isLoading}
        autoComplete="email"
        dir="ltr"
      />

      <AuthButton
        type="submit"
        fullWidth
        isLoading={isLoading}
        loadingText="جاري الإرسال..."
        icon={ArrowRight}
        iconPosition="right"
      >
        إرسال رمز التحقق
      </AuthButton>

      <div className="flex items-center justify-center gap-2 text-sm">
        <Link
          href="/login"
          className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة لتسجيل الدخول
        </Link>
      </div>
    </motion.form>
  );

  const renderVerifyStep = () => (
    <motion.form
      key="verify"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onSubmit={handleVerifySubmit}
      className="space-y-5"
    >
      <div className="text-center mb-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">التحقق من الرمز</h2>
        <p className="text-sm text-slate-400">
          أدخل رمز التحقق المرسل إلى
          <br />
          <span className="text-indigo-400 font-medium">{email}</span>
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <input
            key={index}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={code[index] || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              if (/^\d*$/.test(value)) {
                const newCode = code.split('');
                newCode[index] = value;
                setCode(newCode.join(''));
                
                // Auto-focus next input
                if (value && index < 5) {
                  const nextInput = e.target.parentElement?.querySelector(
                    `input:nth-child(${index + 2})`
                  ) as HTMLInputElement;
                  nextInput?.focus();
                }
              }
            }}
            onKeyDown={(e) => {
              // Handle backspace
              if (e.key === 'Backspace' && !code[index] && index > 0) {
                const prevInput = e.currentTarget.parentElement?.querySelector(
                  `input:nth-child(${index})`
                ) as HTMLInputElement;
                prevInput?.focus();
              }
            }}
            className={`
              w-12 h-14 text-center text-xl font-bold
              rounded-xl border bg-white/5 text-white
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              transition-all duration-200
              ${error ? 'border-red-500' : 'border-white/20'}
            `}
            disabled={isLoading}
          />
        ))}
      </div>

      {error && (
        <p className="text-center text-sm text-red-400">
          {error}
        </p>
      )}

      <AuthButton
        type="submit"
        fullWidth
        isLoading={isLoading}
        loadingText="جاري التحقق..."
        disabled={code.length !== 6}
      >
        تحقق من الرمز
      </AuthButton>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={goBack}
          className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4" />
          رجوع
        </button>
        <button
          type="button"
          onClick={resendCode}
          disabled={!canResend || isLoading}
          className={`
            transition-colors
            ${canResend ? 'text-indigo-400 hover:text-indigo-300' : 'text-slate-500'}
          `}
        >
          {canResend ? 'إعادة الإرسال' : `إعادة الإرسال (${countdown}ث)`}
        </button>
      </div>
    </motion.form>
  );

  const renderResetStep = () => {
    const errors = validatePasswords();
    
    return (
      <motion.form
        key="reset"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        onSubmit={handleResetSubmit}
        className="space-y-5"
      >
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">تعيين كلمة مرور جديدة</h2>
          <p className="text-sm text-slate-400">
            أدخل كلمة مرور قوية وآمنة
          </p>
        </div>

        <AuthInput
          type="password"
          label="كلمة المرور الجديدة"
          value={newPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
          placeholder="••••••••"
          showPasswordToggle
          error={newPassword ? (errors.password || undefined) : undefined}
          hint="8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم"
          disabled={isLoading}
        />

        <AuthInput
          type="password"
          label="تأكيد كلمة المرور"
          value={confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          showPasswordToggle
          error={confirmPassword ? (errors.confirm || undefined) : undefined}
          disabled={isLoading}
        />

        {/* Password Strength Indicator */}
        {newPassword && (
          <PasswordStrengthIndicator password={newPassword} />
        )}

        <AuthButton
          type="submit"
          fullWidth
          isLoading={isLoading}
          loadingText="جاري التغيير..."
          disabled={!newPassword || !confirmPassword || !!errors.password || !!errors.confirm}
        >
          تغيير كلمة المرور
        </AuthButton>

        <button
          type="button"
          onClick={goBack}
          className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors"
          disabled={isLoading}
        >
          رجوع
        </button>
      </motion.form>
    );
  };

  const renderSuccessStep = () => (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30"
      >
        <svg
          className="h-10 w-10 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          تم بنجاح! 🎉
        </h2>
        <p className="text-slate-400">
          تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
        </p>
      </div>

      <Link href="/login">
        <AuthButton fullWidth icon={ArrowRight} iconPosition="right">
          تسجيل الدخول
        </AuthButton>
      </Link>
    </motion.div>
  );

  return (
    <AuthCard className="w-full max-w-md" showLogo={false}>
      {step !== 'success' && renderStepIndicator()}
      
      <AnimatePresence mode="wait">
        {step === 'request' && renderRequestStep()}
        {step === 'verify' && renderVerifyStep()}
        {step === 'reset' && renderResetStep()}
        {step === 'success' && renderSuccessStep()}
      </AnimatePresence>
    </AuthCard>
  );
}

// Password Strength Indicator Component
function PasswordStrengthIndicator({ password }: { password: string }) {
  const getStrength = (pass: string): { score: number; label: string; color: string } => {
    let score = 0;
    
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    
    if (score <= 2) return { score, label: 'ضعيفة', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'متوسطة', color: 'bg-yellow-500' };
    return { score, label: 'قوية', color: 'bg-green-500' };
  };

  const strength = getStrength(password);
  const percentage = (strength.score / 6) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">قوة كلمة المرور</span>
        <span className={`font-medium ${
          strength.score <= 2 ? 'text-red-400' : 
          strength.score <= 4 ? 'text-yellow-400' : 'text-green-400'
        }`}>
          {strength.label}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${strength.color} transition-all duration-300`}
        />
      </div>
    </div>
  );
}

export default ForgotPasswordForm;

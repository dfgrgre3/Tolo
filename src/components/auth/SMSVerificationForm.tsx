'use client';

/**
 * SMS Verification Form
 * Animated OTP input with countdown timer and email fallback
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Mail, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { AuthErrorAlert } from './AuthErrorAlert';

interface SMSVerificationFormProps {
  phone: string;
  email?: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onFallbackToEmail?: () => void;
  onBack: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  errorCode: string | null;
  expiresInSeconds?: number;
  resendCooldownSeconds?: number;
}

const OTP_LENGTH = 6;

export const SMSVerificationForm: React.FC<SMSVerificationFormProps> = ({
  phone,
  email,
  onVerify,
  onResend,
  onFallbackToEmail,
  onBack,
  isLoading,
  errorMessage,
  errorCode,
  expiresInSeconds = 600, // 10 minutes
  resendCooldownSeconds = 60,
}) => {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendCountdown, setResendCountdown] = useState(resendCooldownSeconds);
  const [codeExpiry, setCodeExpiry] = useState(expiresInSeconds);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Code expiry countdown
  useEffect(() => {
    if (codeExpiry <= 0) return;
    const timer = setInterval(() => {
      setCodeExpiry((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [codeExpiry]);

  // Auto-submit when OTP is complete
  const handleSubmit = useCallback(async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) return;
    
    try {
      await onVerify(code);
      setIsVerified(true);
    } catch {
      // Error handled by parent
    }
  }, [otp, onVerify]);

  useEffect(() => {
    const code = otp.join('');
    if (code.length === OTP_LENGTH && !isLoading) {
      handleSubmit();
    }
  }, [otp, isLoading, handleSubmit]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    if (digit) {
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);
      
      // Auto-focus next input
      if (index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];
      
      if (otp[index]) {
        // Clear current
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        // Move to previous
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      
      // Focus last filled or next empty
      const focusIndex = Math.min(pastedData.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || isResending) return;
    
    setIsResending(true);
    try {
      await onResend();
      setResendCountdown(resendCooldownSeconds);
      setCodeExpiry(expiresInSeconds);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskedPhone = phone.replace(/(\d{3})\d+(\d{2})/, '$1****$2');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"
        >
          <AnimatePresence mode="wait">
            {isVerified ? (
              <motion.div
                key="verified"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </motion.div>
            ) : (
              <motion.div key="phone">
                <Smartphone className="h-8 w-8 text-emerald-300" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        <h2 className="text-2xl font-bold text-white">التحقق برسالة SMS</h2>
        <p className="mt-2 text-sm text-slate-300">
          أدخل الرمز المرسل إلى {maskedPhone}
        </p>
        
        {/* Expiry countdown */}
        <motion.div
          animate={{ 
            color: codeExpiry < 60 ? '#f87171' : codeExpiry < 180 ? '#fbbf24' : '#94a3b8'
          }}
          className="mt-1 text-xs"
        >
          <span className="inline-flex items-center gap-1">
            ⏱️ صالح لمدة {formatTime(codeExpiry)}
          </span>
        </motion.div>
      </motion.div>

      <AuthErrorAlert message={errorMessage} code={errorCode} />

      {/* OTP Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <div 
          className="flex justify-center gap-2 sm:gap-3 rtl:flex-row-reverse"
          role="group"
          aria-label="رمز التحقق"
        >
          {otp.map((digit, index) => (
            <motion.input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={isLoading || isVerified}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                borderColor: digit ? '#818cf8' : 'transparent'
              }}
              whileFocus={{ scale: 1.05, borderColor: '#a5b4fc' }}
              transition={{ delay: 0.1 * index }}
              className={`
                h-12 w-10 sm:h-14 sm:w-12
                rounded-xl border-2 bg-white/10 
                text-center text-xl sm:text-2xl font-bold text-white
                focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
                ${digit ? 'border-indigo-400' : 'border-transparent'}
              `}
              aria-label={`رقم ${index + 1}`}
            />
          ))}
        </div>
        
        {/* Progress indicator */}
        <motion.div className="mt-3 flex justify-center gap-1">
          {otp.map((digit, index) => (
            <motion.div
              key={index}
              animate={{
                backgroundColor: digit ? '#818cf8' : '#475569',
                scale: digit ? 1.2 : 1,
              }}
              className="h-1.5 w-6 rounded-full"
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Resend Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mb-4"
      >
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCountdown > 0 || isResending || isLoading}
          className={`
            inline-flex items-center gap-2 text-sm transition-all
            ${resendCountdown > 0 
              ? 'text-slate-500 cursor-not-allowed' 
              : 'text-indigo-300 hover:text-indigo-200'
            }
          `}
        >
          {isResending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {resendCountdown > 0 
            ? `إعادة الإرسال خلال ${resendCountdown}s`
            : 'إعادة إرسال الرمز'
          }
        </button>
      </motion.div>

      {/* Email Fallback */}
      {email && onFallbackToEmail && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mb-4"
        >
          <button
            type="button"
            onClick={onFallbackToEmail}
            disabled={isLoading}
            className="inline-flex items-center gap-2 text-sm text-amber-300 hover:text-amber-200 transition"
          >
            <Mail className="h-4 w-4" />
            إرسال الرمز عبر البريد الإلكتروني بدلاً من ذلك
          </button>
        </motion.div>
      )}

      {/* Back Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={onBack}
        disabled={isLoading}
        className="w-full text-sm text-slate-300 hover:text-white transition"
      >
        العودة لتسجيل الدخول
      </motion.button>
    </motion.div>
  );
};

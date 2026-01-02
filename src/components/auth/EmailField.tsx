'use client';

import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * خصائص مكون حقل البريد الإلكتروني
 */
interface EmailFieldProps {
  /** قيمة البريد الإلكتروني */
  value: string;
  /** دالة التغيير */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** دالة التركيز */
  onFocus: () => void;
  /** دالة فقدان التركيز */
  onBlur: () => void;
  /** رسالة الخطأ */
  error?: string;
  /** حالة التركيز */
  isFocused: boolean;
  /** حالة التعطيل */
  disabled?: boolean;
  /** مرجع الإدخال */
  inputRef?: React.Ref<HTMLInputElement>;
  /** عرض حالة النجاح */
  showSuccess?: boolean;
  /** نص مساعد */
  helperText?: string;
  /** مطلوب */
  required?: boolean;
  /** placeholder مخصص */
  placeholder?: string;
}

/**
 * مكون حقل البريد الإلكتروني المحسّن
 * 
 * @component
 * @description حقل إدخال محسّن للبريد الإلكتروني مع دعم كامل لإمكانية الوصول
 * 
 * @example
 * ```tsx
 * <EmailField
 *   value={email}
 *   onChange={handleChange}
 *   onFocus={() => setFocused(true)}
 *   onBlur={() => setFocused(false)}
 *   error={emailError}
 *   isFocused={isFocused}
 * />
 * ```
 */
export const EmailField = memo<EmailFieldProps>(({
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  isFocused,
  disabled = false,
  inputRef,
  showSuccess = false,
  helperText,
  required = true,
  placeholder = 'your@email.com',
}) => {
  // حساب حالة الحقل
  const fieldState = useMemo(() => {
    if (error) return 'error';
    if (showSuccess && value) return 'success';
    return 'default';
  }, [error, showSuccess, value]);

  // حساب أيقونة الحالة
  const StatusIcon = useMemo(() => {
    if (fieldState === 'error') return AlertCircle;
    if (fieldState === 'success') return CheckCircle2;
    return Mail;
  }, [fieldState]);

  // حساب لون الأيقونة
  const iconColor = useMemo(() => {
    if (fieldState === 'error') return 'text-red-400';
    if (fieldState === 'success') return 'text-green-400';
    if (isFocused) return 'text-indigo-400';
    return 'text-slate-400';
  }, [fieldState, isFocused]);

  // حساب فئات CSS للإدخال
  const inputClasses = useMemo(() => {
    const baseClasses = 'w-full rounded-xl py-3 pr-12 pl-4 text-white placeholder-slate-400 transition-all duration-200 focus:outline-none';
    const stateClasses = {
      error: 'bg-red-500/10 focus:bg-red-500/20 ring-2 ring-red-400 focus:ring-red-400',
      success: 'bg-green-500/10 focus:bg-green-500/20 ring-2 ring-green-400 focus:ring-green-400',
      default: 'bg-white/10 focus:bg-white/20 focus:ring-2 focus:ring-indigo-400',
    };

    return cn(
      baseClasses,
      stateClasses[fieldState],
      isFocused && fieldState === 'default' && 'ring-2 ring-indigo-400',
      disabled && 'opacity-50 cursor-not-allowed'
    );
  }, [fieldState, isFocused, disabled]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full"
    >
      {/* Label */}
      <label
        htmlFor="email-input"
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        البريد الإلكتروني
        {required && (
          <span className="mr-1 text-red-400" aria-label="مطلوب">
            *
          </span>
        )}
      </label>

      {/* Input Container */}
      <div className="relative">
        {/* Status Icon */}
        <StatusIcon
          className={cn(
            'absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors duration-200',
            iconColor
          )}
          aria-hidden="true"
        />

        {/* Input Field */}
        <input
          ref={inputRef}
          id="email-input"
          type="email"
          name="email"
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className={inputClasses}
          dir="ltr"
          required={required}
          disabled={disabled}
          aria-required={required}
          aria-label="البريد الإلكتروني"
          aria-invalid={!!error}
          aria-describedby={cn(
            error && 'email-error',
            helperText && 'email-helper'
          )}
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          inputMode="email"
        />
      </div>

      {/* Helper Text */}
      <AnimatePresence mode="wait">
        {helperText && !error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            id="email-helper"
            className="mt-1 text-xs text-slate-400"
          >
            {helperText}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-1"
          >
            <p
              id="email-error"
              className="flex items-center gap-1 text-xs text-red-300"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              <span>{error}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// تعيين اسم العرض للمكون (مفيد للتصحيح)
EmailField.displayName = 'EmailField';

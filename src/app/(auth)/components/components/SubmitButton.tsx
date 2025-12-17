'use client';

import { memo, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHapticFeedback, buttonVariants } from '../utils/auth-animations';

/**
 * خصائص مكون زر الإرسال
 */
interface SubmitButtonProps {
  /** حالة التحميل */
  isLoading: boolean;
  /** حالة التعطيل */
  disabled?: boolean;
  /** حالة النجاح */
  isSuccess?: boolean;
  /** محتوى الزر */
  children?: React.ReactNode;
  /** نوع الزر */
  type?: 'button' | 'submit' | 'reset';
  /** aria-label مخصص */
  ariaLabel?: string;
  /** حجم الزر */
  size?: 'sm' | 'md' | 'lg';
  /** نمط الزر */
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  /** onClick handler */
  onClick?: () => void;
}

/**
 * مكون زر الإرسال المحسّن
 * 
 * @component
 * @description زر إرسال محسّن مع دعم كامل لإمكانية الوصول وحالات التحميل
 * 
 * @example
 * ```tsx
 * <SubmitButton
 *   isLoading={isLoading}
 *   disabled={disabled}
 * >
 *   تسجيل الدخول
 * </SubmitButton>
 * ```
 */
export const SubmitButton = memo<SubmitButtonProps>(({
  isLoading,
  disabled = false,
  isSuccess = false,
  children = 'تسجيل الدخول',
  type = 'submit',
  ariaLabel,
  size = 'md',
  variant = 'primary',
  onClick,
}) => {
  // حساب حالة التعطيل الكاملة
  const isDisabled = useMemo(() => isLoading || disabled || isSuccess, [isLoading, disabled, isSuccess]);

  // Trigger haptic feedback on success
  useEffect(() => {
    if (isSuccess) {
      triggerHapticFeedback('success');
    }
  }, [isSuccess]);

  // حساب فئات CSS للزر
  const buttonClasses = useMemo(() => {
    const baseClasses = 'w-full rounded-xl px-6 font-semibold text-white shadow-lg transition relative overflow-hidden';
    
    const sizeClasses = {
      sm: 'py-2 text-sm',
      md: 'py-4 text-base',
      lg: 'py-5 text-lg',
    };

    const variantClasses = {
      primary: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700',
      secondary: 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700',
      danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
      success: 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700',
    };

    // Override variant to success when isSuccess is true
    const effectiveVariant = isSuccess ? 'success' : variant;

    return cn(
      baseClasses,
      sizeClasses[size],
      variantClasses[effectiveVariant],
      isDisabled && !isSuccess && 'opacity-50 cursor-not-allowed'
    );
  }, [size, variant, isDisabled, isSuccess]);

  // حساب aria-label
  const computedAriaLabel = useMemo(() => {
    if (ariaLabel) return ariaLabel;
    if (isSuccess) return 'تم بنجاح';
    if (isLoading) return 'جارٍ المعالجة...';
    return typeof children === 'string' ? children : 'إرسال';
  }, [ariaLabel, isLoading, isSuccess, children]);

  // حساب محتوى الزر
  const buttonContent = useMemo(() => {
    if (isSuccess) {
      return (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          تم بنجاح!
        </motion.span>
      );
    }
    if (isLoading) {
      return (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          جارٍ تسجيل الدخول...
        </span>
      );
    }
    return children;
  }, [isLoading, isSuccess, children]);
  return (
    <motion.button
      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      type={type}
      disabled={isDisabled}
      className={buttonClasses}
      aria-label={computedAriaLabel}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
    >
      {/* Loading Overlay */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '100%', opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-white/20"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Button Content */}
      <span className="relative flex items-center justify-center gap-2">
        <AnimatePresence mode="wait">
          <motion.span
            key={isLoading ? 'loading' : 'content'}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {buttonContent}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.button>
  );
});

// تعيين اسم العرض للمكون (مفيد للتصحيح)
SubmitButton.displayName = 'SubmitButton';


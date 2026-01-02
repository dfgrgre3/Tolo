'use client';

import { memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * خصائص مكون حقل كلمة المرور
 */
export interface PasswordFieldProps {
  /** قيمة كلمة المرور */
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
  /** إظهار كلمة المرور */
  showPassword: boolean;
  /** دالة تبديل إظهار كلمة المرور */
  onTogglePassword: () => void;
  /** حالة التعطيل */
  disabled?: boolean;
  /** مرجع الإدخال */
  inputRef?: React.Ref<HTMLInputElement>;
  /** نص التسمية */
  label?: string;
  /** اسم الحقل */
  name?: string;
  /** قيمة autoComplete */
  autoComplete?: string;
  /** placeholder */
  placeholder?: string;
  /** مطلوب */
  required?: boolean;
}

/**
 * مكون حقل كلمة المرور المحسّن
 * 
 * @component
 * @description حقل إدخال محسّن لكلمة المرور مع دعم كامل لإمكانية الوصول والأمان
 * 
 * @example
 * ```tsx
 * <PasswordField
 *   value={password}
 *   onChange={handleChange}
 *   onFocus={() => setFocused(true)}
 *   onBlur={() => setFocused(false)}
 *   showPassword={showPassword}
 *   onTogglePassword={() => setShowPassword(!showPassword)}
 *   error={passwordError}
 *   isFocused={isFocused}
 * />
 * ```
 */
export const PasswordField = memo<PasswordFieldProps>(({
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  isFocused,
  showPassword,
  onTogglePassword,
  disabled = false,
  inputRef,
  label = 'كلمة المرور',
  name = 'password',
  autoComplete = 'current-password',
  placeholder = '••••••••',
  required = true,
}) => {
  // حساب فئات CSS للإدخال
  const inputClasses = useMemo(() => {
    const baseClasses = 'w-full rounded-xl bg-white/10 py-3 pr-12 pl-12 text-white placeholder-slate-400 transition-all duration-200 focus:bg-white/20 focus:outline-none';
    const stateClasses = error
      ? 'ring-2 ring-red-400 focus:ring-red-400 bg-red-500/10 focus:bg-red-500/20'
      : 'focus:ring-2 focus:ring-indigo-400';
    
    return cn(
      baseClasses,
      stateClasses,
      isFocused && !error && 'ring-2 ring-indigo-400',
      disabled && 'opacity-50 cursor-not-allowed'
    );
  }, [error, isFocused, disabled]);

  // حساب لون أيقونة القفل
  const lockIconColor = useMemo(() => {
    if (error) return 'text-red-400';
    if (isFocused) return 'text-indigo-400';
    return 'text-slate-400';
  }, [error, isFocused]);

  // حساب aria-describedby
  const ariaDescribedBy = useMemo(() => {
    return error ? `${name}-error` : undefined;
  }, [error, name]);

  // معالج تبديل كلمة المرور مع useCallback
  const handleTogglePassword = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onTogglePassword();
  }, [onTogglePassword]);

  // حساب aria-label لزر التبديل
  const toggleButtonAriaLabel = useMemo(() => {
    return showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور';
  }, [showPassword]);
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full"
    >
      {/* Label */}
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        {label}
        {required && (
          <span className="mr-1 text-red-400" aria-label="مطلوب">
            *
          </span>
        )}
      </label>

      {/* Input Container */}
      <div className="relative">
        {/* Lock Icon */}
        <Lock
          className={cn(
            'absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors duration-200',
            lockIconColor
          )}
          aria-hidden="true"
        />

        {/* Input Field */}
        <input
          ref={inputRef}
          id={name}
          type={showPassword ? 'text' : 'password'}
          name={name}
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
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
        />

        {/* Toggle Password Button */}
        <motion.button
          whileHover={{ scale: disabled ? 1 : 1.1 }}
          whileTap={{ scale: disabled ? 1 : 0.9 }}
          type="button"
          onClick={handleTogglePassword}
          disabled={disabled}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={toggleButtonAriaLabel}
          aria-pressed={showPassword}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
        </motion.button>
      </div>

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
              id={`${name}-error`}
              className="flex items-center gap-1 text-xs text-red-300"
              role="alert"
              aria-live="polite"
            >
              <span>{error}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// تعيين اسم العرض للمكون (مفيد للتصحيح)
PasswordField.displayName = 'PasswordField';

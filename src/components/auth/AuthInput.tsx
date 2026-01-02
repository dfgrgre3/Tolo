'use client';

/**
 * 🔤 AuthInput - حقل إدخال محسّن للمصادقة
 * 
 * حقل إدخال مع دعم كامل لـ:
 * - الأيقونات
 * - رسائل الخطأ
 * - حالة النجاح
 * - التحميل
 * - إظهار/إخفاء كلمة المرور
 */

import { forwardRef, InputHTMLAttributes, ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AuthInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  icon?: LucideIcon;
  rightIcon?: ReactNode;
  isLoading?: boolean;
  showPasswordToggle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outline';
}

const sizeClasses = {
  sm: 'h-9 text-sm px-3',
  md: 'h-11 text-base px-4',
  lg: 'h-13 text-lg px-5',
};

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  (
    {
      label,
      error,
      success,
      hint,
      icon: Icon,
      rightIcon,
      isLoading,
      showPasswordToggle,
      size = 'md',
      variant = 'default',
      className,
      type,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputId = id || `auth-input-${Math.random().toString(36).substr(2, 9)}`;
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const hasError = Boolean(error);
    const hasSuccess = Boolean(success) && !hasError;

    return (
      <div className="w-full space-y-2">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'flex items-center gap-2 text-sm font-medium transition-colors',
              hasError ? 'text-red-400' : hasSuccess ? 'text-green-400' : 'text-slate-300',
              isFocused && !hasError && !hasSuccess && 'text-indigo-400'
            )}
          >
            {Icon && <Icon className={iconSizeClasses[size]} />}
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {Icon && !label && (
            <div
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 transition-colors',
                hasError
                  ? 'text-red-400'
                  : hasSuccess
                  ? 'text-green-400'
                  : isFocused
                  ? 'text-indigo-400'
                  : 'text-slate-400'
              )}
            >
              <Icon className={iconSizeClasses[size]} />
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            disabled={disabled || isLoading}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              'w-full rounded-xl border bg-white/5 backdrop-blur-sm',
              'text-white placeholder:text-slate-500',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              sizeClasses[size],
              Icon && !label && 'pl-11',
              (showPasswordToggle || rightIcon || isLoading) && 'pr-11',
              hasError
                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                : hasSuccess
                ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500/30'
                : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/30 hover:border-white/20',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              hasError
                ? `${inputId}-error`
                : hint
                ? `${inputId}-hint`
                : undefined
            }
            {...props}
          />

          {/* Right Side Elements */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Loading Spinner */}
            {isLoading && (
              <Loader2 className={cn('animate-spin text-slate-400', iconSizeClasses[size])} />
            )}

            {/* Status Icons */}
            {!isLoading && hasError && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-red-400"
              >
                <AlertCircle className={iconSizeClasses[size]} />
              </motion.div>
            )}
            {!isLoading && hasSuccess && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-green-400"
              >
                <CheckCircle className={iconSizeClasses[size]} />
              </motion.div>
            )}

            {/* Password Toggle */}
            {!isLoading && showPasswordToggle && isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-white transition-colors focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? (
                  <EyeOff className={iconSizeClasses[size]} />
                ) : (
                  <Eye className={iconSizeClasses[size]} />
                )}
              </button>
            )}

            {/* Custom Right Icon */}
            {!isLoading && rightIcon}
          </div>
        </div>

        {/* Error/Success/Hint Messages */}
        <AnimatePresence mode="wait">
          {hasError && (
            <motion.p
              id={`${inputId}-error`}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-red-400 flex items-center gap-1"
            >
              <AlertCircle className="h-3 w-3" />
              {error}
            </motion.p>
          )}
          {hasSuccess && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-green-400 flex items-center gap-1"
            >
              <CheckCircle className="h-3 w-3" />
              {success}
            </motion.p>
          )}
          {!hasError && !hasSuccess && hint && (
            <motion.p
              id={`${inputId}-hint`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-slate-500"
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';

export default AuthInput;

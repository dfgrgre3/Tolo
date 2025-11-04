'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  error?: string;
  focused: boolean;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function PasswordField({
  value,
  onChange,
  onFocus,
  onBlur,
  showPassword,
  onTogglePassword,
  error,
  focused,
  disabled,
  inputRef,
}: PasswordFieldProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      <label
        htmlFor="password"
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        كلمة المرور
      </label>
      <div className="relative">
        <Lock
          className={cn(
            'absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors',
            focused ? 'text-indigo-400' : 'text-slate-400'
          )}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="••••••••"
          className={cn(
            'w-full rounded-xl bg-white/10 py-3 pr-12 pl-12 text-white placeholder-slate-400 transition-all duration-200',
            'focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400',
            focused && 'ring-2 ring-indigo-400'
          )}
          dir="ltr"
          required
          aria-required="true"
          aria-label="كلمة المرور"
          {...(error
            ? { 'aria-invalid': true as const, 'aria-describedby': 'password-error' }
            : {})}
          autoComplete="current-password"
          disabled={disabled}
        />
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={onTogglePassword}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          aria-pressed={showPassword}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
        </motion.button>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            id="password-error"
            className="mt-1 text-xs text-red-300"
            role="alert"
            aria-live="polite"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


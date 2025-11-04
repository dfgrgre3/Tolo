'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  error?: string;
  focused: boolean;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function EmailField({
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  focused,
  disabled,
  inputRef,
}: EmailFieldProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
    >
      <label
        htmlFor="email"
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        البريد الإلكتروني
      </label>
      <div className="relative">
        <Mail
          className={cn(
            'absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors',
            focused ? 'text-indigo-400' : 'text-slate-400'
          )}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="email"
          type="email"
          name="email"
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="your@email.com"
          className={cn(
            'w-full rounded-xl bg-white/10 py-3 pr-12 pl-4 text-white placeholder-slate-400 transition-all duration-200',
            'focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400',
            focused && 'ring-2 ring-indigo-400'
          )}
          dir="ltr"
          required
          aria-required="true"
          aria-label="البريد الإلكتروني"
          {...(error
            ? { 'aria-invalid': true as const, 'aria-describedby': 'email-error' }
            : {})}
          autoComplete="email"
          disabled={disabled}
        />
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            id="email-error"
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


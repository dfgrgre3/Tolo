'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NameFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  error?: string;
  isFocused: boolean;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const NameField: React.FC<NameFieldProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  isFocused,
  disabled,
  inputRef,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
    >
      <label
        htmlFor="name"
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        الاسم الكامل
      </label>
      <div className="relative">
        <User
          className={cn(
            'absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors',
            isFocused ? 'text-indigo-400' : 'text-slate-400'
          )}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="name"
          type="text"
          name="name"
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="أحمد محمد"
          className={cn(
            'w-full rounded-xl bg-white/10 py-3 pr-12 pl-4 text-white placeholder-slate-400 transition-all duration-200',
            'focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400',
            isFocused && 'ring-2 ring-indigo-400'
          )}
          required
          aria-required="true"
          aria-label="الاسم الكامل"
          {...(error
            ? { 'aria-invalid': true as const, 'aria-describedby': 'name-error' }
            : {})}
          autoComplete="name"
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
            id="name-error"
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
};

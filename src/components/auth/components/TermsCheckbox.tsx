'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TermsCheckboxProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
}

export const TermsCheckbox: React.FC<TermsCheckboxProps> = ({
  checked,
  onChange,
  error,
  disabled,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative flex items-center mt-0.5">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="peer h-5 w-5 appearance-none rounded border-2 border-slate-500 bg-transparent checked:border-indigo-500 checked:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all"
            aria-describedby={error ? 'terms-error' : undefined}
          />
          <svg
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
          أوافق على{' '}
          <a href="/terms" className="text-indigo-400 hover:text-indigo-300 underline decoration-indigo-400/30 hover:decoration-indigo-300 transition-all">
            الشروط والأحكام
          </a>{' '}
          و{' '}
          <a href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline decoration-indigo-400/30 hover:decoration-indigo-300 transition-all">
            سياسة الخصوصية
          </a>
        </div>
      </label>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0, y: -5 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            id="terms-error"
            className="mt-1 text-xs text-red-300 mr-8"
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

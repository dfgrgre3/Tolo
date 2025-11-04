'use client';

import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';

interface LoginErrorBannerProps {
  message: string | null;
  errorCode?: string | null;
  id?: string;
}

export function LoginErrorBanner({
  message,
  errorCode,
  id = 'login-error-banner',
}: LoginErrorBannerProps) {
  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={id}
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-5 rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-sm text-red-100"
        role="alert"
        aria-live="assertive"
      >
        <p className="font-semibold">حدث خطأ أثناء تسجيل الدخول</p>
        <p className="mt-1">{message}</p>
        {errorCode && (
          <p className="mt-2 text-xs text-red-200">
            رمز الخطأ:{' '}
            <span className="font-mono tracking-wide text-red-100">
              {errorCode}
            </span>
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}


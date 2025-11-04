'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Chrome, Sparkles } from 'lucide-react';

interface AlternativeLoginMethodsProps {
  onBiometricLogin: () => void;
  onGoogleLogin: () => void;
  onTestAccountLogin?: () => void;
  isLoading?: boolean;
  showBiometric?: boolean;
  showTestAccount?: boolean;
}

export function AlternativeLoginMethods({
  onBiometricLogin,
  onGoogleLogin,
  onTestAccountLogin,
  isLoading = false,
  showBiometric = true,
  showTestAccount = false,
}: AlternativeLoginMethodsProps) {
  return (
    <>
      {/* Divider */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative"
      >
        <div className="absolute inset-0 flex items-center">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            className="w-full border-t border-slate-600"
          />
        </div>
        <div className="relative flex justify-center text-sm">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.65, type: 'spring', stiffness: 200 }}
            className="bg-slate-900 px-4 text-slate-400"
          >
            أو
          </motion.span>
        </div>
      </motion.div>

      {/* Alternative Login Methods */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid gap-3"
      >
        {/* Biometric Login */}
        <AnimatePresence>
          {showBiometric && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: 0.65 }}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onBiometricLogin}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
              aria-label="تسجيل الدخول باستخدام البصمة"
            >
              <Fingerprint className="h-5 w-5" aria-hidden="true" />
              تسجيل الدخول بالبصمة
            </motion.button>
          )}
        </AnimatePresence>

        {/* Google Login */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onGoogleLogin}
          disabled={isLoading}
          className="flex items-center justify-center gap-3 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
          aria-label="تسجيل الدخول باستخدام حساب جوجل"
        >
          <Chrome className="h-5 w-5" aria-hidden="true" />
          تسجيل الدخول بجوجل
        </motion.button>

        {/* Test Account Login - Only in development */}
        {showTestAccount && onTestAccountLogin && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.75 }}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onTestAccountLogin}
            disabled={isLoading}
            className="flex items-center justify-center gap-3 rounded-xl bg-blue-500/20 border border-blue-400/30 px-6 py-3 text-sm font-medium text-blue-200 transition hover:bg-blue-500/30 disabled:opacity-50"
            aria-label="تسجيل الدخول بحساب تجريبي"
          >
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            تسجيل الدخول بحساب تجريبي
          </motion.button>
        )}
      </motion.div>
    </>
  );
}


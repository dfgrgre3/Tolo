'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { LoginErrorBanner } from './LoginErrorBanner';

interface TwoFactorFormProps {
  code: string;
  onCodeChange: (code: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  errorCode?: string | null;
}

export function TwoFactorForm({
  code,
  onCodeChange,
  onSubmit,
  onBack,
  isLoading = false,
  errorMessage,
  errorCode,
}: TwoFactorFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20"
        >
          <ShieldCheck className="h-8 w-8 text-indigo-300" aria-hidden="true" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white">التحقق بخطوتين</h2>
        <p className="mt-2 text-sm text-slate-300">
          أدخل الرمز المرسل إلى بريدك الإلكتروني
        </p>
      </motion.div>

      <LoginErrorBanner
        message={errorMessage}
        errorCode={errorCode}
        id="twofactor-error-banner"
      />

      <form onSubmit={onSubmit} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <input
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full rounded-xl bg-white/10 px-6 py-4 text-center text-2xl tracking-widest text-white placeholder-slate-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
            maxLength={6}
            autoFocus
            aria-label="رمز التحقق بخطوتين"
            aria-required="true"
            aria-describedby="two-factor-help"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            id="two-factor-help"
            className="mt-2 text-xs text-center text-slate-400"
          >
            أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك الإلكتروني
          </motion.p>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading || code.length !== 6}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="تحقق من الرمز"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              جارٍ التحقق...
            </span>
          ) : (
            'تحقق'
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onBack}
          className="w-full text-sm text-slate-300 hover:text-white transition"
          aria-label="العودة إلى نموذج تسجيل الدخول"
        >
          العودة لتسجيل الدخول
        </motion.button>
      </form>
    </motion.div>
  );
}


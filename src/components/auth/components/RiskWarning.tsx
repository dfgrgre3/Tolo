'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface RiskWarningProps {
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
}

export function RiskWarning({ riskLevel }: RiskWarningProps) {
  if (!riskLevel || (riskLevel !== 'high' && riskLevel !== 'medium')) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 rounded-xl bg-yellow-500/20 border border-yellow-500/30 p-4 flex items-start gap-3"
        role="alert"
        aria-live="polite"
      >
        <AlertTriangle className="h-5 w-5 text-yellow-300 mt-0.5" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-semibold text-yellow-200">تنبيه أمني</p>
          <p className="text-yellow-100">
            تم اكتشاف نشاط غير معتاد. تأكد من أنك تستخدم جهازك الشخصي.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


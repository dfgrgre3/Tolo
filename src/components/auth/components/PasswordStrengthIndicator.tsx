'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { getPasswordStrengthDisplay } from '@/components/auth/utils/password-strength';
import type { PasswordStrengthDisplay } from '@/components/auth/utils/password-strength';
import { useEffect, useState } from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
}) => {
  const [strength, setStrength] = useState<PasswordStrengthDisplay>(
    getPasswordStrengthDisplay('')
  );

  useEffect(() => {
    setStrength(getPasswordStrengthDisplay(password));
  }, [password]);

  if (!password) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "mt-3 rounded-xl border p-4 space-y-3",
          strength.bgColor,
          strength.borderColor
        )}
      >
        {/* Strength Label and Score */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">قوة كلمة المرور:</span>
          <div className="flex items-center gap-2">
            <motion.span
              key={strength.label}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "text-xs font-bold px-3 py-1 rounded-full",
                strength.score >= 80 ? "text-green-300 bg-green-500/20" :
                strength.score >= 60 ? "text-blue-300 bg-blue-500/20" :
                strength.score >= 40 ? "text-yellow-300 bg-yellow-500/20" :
                strength.score >= 20 ? "text-orange-300 bg-orange-500/20" :
                "text-red-300 bg-red-500/20"
              )}
            >
              {strength.label}
            </motion.span>
            <span className="text-xs text-slate-400">
              {strength.score}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-white/10 backdrop-blur">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${strength.score}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn(
                "h-full rounded-full shadow-lg",
                strength.color
              )}
            />
          </div>
          {/* Segment Indicators */}
          <div className="flex gap-1 h-1">
            {[0, 20, 40, 60, 80, 100].slice(0, -1).map((threshold) => (
              <div
                key={threshold}
                className={cn(
                  "flex-1 rounded-full transition-all",
                  strength.score >= threshold
                    ? strength.color
                    : "bg-white/5"
                )}
              />
            ))}
          </div>
        </div>

        {/* Password Requirements */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            { check: strength.checks.minLength, label: '8 أحرف على الأقل', key: 'minLength' },
            { check: strength.checks.hasUpper, label: 'حرف كبير (A-Z)', key: 'hasUpper' },
            { check: strength.checks.hasLower, label: 'حرف صغير (a-z)', key: 'hasLower' },
            { check: strength.checks.hasNumber, label: 'رقم (0-9)', key: 'hasNumber' },
            { check: strength.checks.hasSpecial, label: 'رمز خاص (!@#$%)', key: 'hasSpecial' },
          ].map((req, index) => (
            <motion.div
              key={req.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center gap-2 transition-colors duration-300",
                req.check ? "text-green-400" : "text-slate-400"
              )}
            >
              {req.check ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border border-slate-500/50" />
              )}
              <span>{req.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

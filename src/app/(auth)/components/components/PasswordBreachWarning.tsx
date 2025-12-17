'use client';

/**
 * 🚨 PasswordBreachWarning - تحذير تسريب كلمة المرور
 * 
 * يعرض تحذيراً للمستخدم إذا كانت كلمة المرور قد تسربت
 * في عمليات اختراق سابقة
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Shield, Info, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkPasswordBreachClient, BreachCheckResult } from '@/lib/security/password-breach-checker';
import { logger } from '@/lib/logger';

interface PasswordBreachWarningProps {
  /** كلمة المرور للتحقق منها */
  password: string;
  /** تأخير قبل التحقق (بالميلي ثانية) */
  debounceMs?: number;
  /** الحد الأدنى لطول كلمة المرور قبل التحقق */
  minLength?: number;
  /** إظهار حتى لو لم تكن مخترقة */
  showSafeMessage?: boolean;
  /** callback عند التحقق */
  onBreachCheck?: (result: BreachCheckResult) => void;
  /** CSS classes إضافية */
  className?: string;
}

export function PasswordBreachWarning({
  password,
  debounceMs = 500,
  minLength = 8,
  showSafeMessage = false,
  onBreachCheck,
  className,
}: PasswordBreachWarningProps) {
  const [result, setResult] = useState<BreachCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Debounced password check
  const checkPassword = useCallback(async () => {
    if (!password || password.length < minLength) {
      setResult(null);
      return;
    }

    setIsChecking(true);
    try {
      const checkResult = await checkPasswordBreachClient(password);
      setResult(checkResult);
      onBreachCheck?.(checkResult);
    } catch (error) {
      logger.error('Breach check error:', error);
      setResult(null);
    } finally {
      setIsChecking(false);
    }
  }, [password, minLength, onBreachCheck]);

  // Debounce effect
  useEffect(() => {
    setIsDismissed(false);
    const timer = setTimeout(checkPassword, debounceMs);
    return () => clearTimeout(timer);
  }, [password, debounceMs, checkPassword]);

  // Don't show if no result or dismissed
  if (!result || isDismissed) return null;

  // Don't show safe message unless requested
  if (!result.breached && !showSafeMessage) return null;

  const severityConfig = {
    critical: {
      bgColor: 'bg-red-500/10 border-red-500/50',
      textColor: 'text-red-400',
      iconColor: 'text-red-500',
      Icon: AlertTriangle,
    },
    high: {
      bgColor: 'bg-orange-500/10 border-orange-500/50',
      textColor: 'text-orange-400',
      iconColor: 'text-orange-500',
      Icon: AlertTriangle,
    },
    medium: {
      bgColor: 'bg-yellow-500/10 border-yellow-500/50',
      textColor: 'text-yellow-400',
      iconColor: 'text-yellow-500',
      Icon: Info,
    },
    low: {
      bgColor: 'bg-blue-500/10 border-blue-500/50',
      textColor: 'text-blue-400',
      iconColor: 'text-blue-500',
      Icon: Info,
    },
    safe: {
      bgColor: 'bg-green-500/10 border-green-500/50',
      textColor: 'text-green-400',
      iconColor: 'text-green-500',
      Icon: Shield,
    },
  };

  const config = result.breached
    ? severityConfig[result.severity || 'medium']
    : severityConfig.safe;

  const { bgColor, textColor, iconColor, Icon } = config;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0, marginTop: 0 }}
        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
        exit={{ opacity: 0, height: 0, marginTop: 0 }}
        className={cn(
          'relative overflow-hidden rounded-lg border p-3',
          bgColor,
          className
        )}
      >
        {/* Loading Overlay */}
        {isChecking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </motion.div>
        )}

        {/* Content */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className={cn('flex-shrink-0 mt-0.5', iconColor)}
          >
            <Icon className="w-5 h-5" />
          </motion.div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', textColor)}>
              {result.breached ? (
                <>
                  {result.count && result.count >= 1000000 ? (
                    <>⚠️ تحذير خطير!</>
                  ) : result.count && result.count >= 10000 ? (
                    <>⚠️ تحذير!</>
                  ) : null}
                  {' '}
                  كلمة المرور هذه ظهرت في{' '}
                  <strong className="font-bold">
                    {result.count?.toLocaleString('ar-EG') || 'عدة'}
                  </strong>
                  {' '}عملية اختراق.
                </>
              ) : (
                <>✓ كلمة المرور لم تظهر في أي عمليات اختراق معروفة.</>
              )}
            </p>

            {/* Recommendation */}
            {result.breached && (
              <p className="text-xs text-gray-400 mt-1">
                ننصحك باختيار كلمة مرور مختلفة للحفاظ على أمان حسابك.
              </p>
            )}

            {/* Learn More Link */}
            {result.breached && (
              <a
                href="https://haveibeenpwned.com/Passwords"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-1 text-xs mt-2 hover:underline',
                  textColor
                )}
              >
                <span>تعرف على المزيد</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Dismiss Button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="إغلاق التحذير"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Animated Border */}
        {result.breached && result.severity === 'critical' && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              border: '1px solid rgba(239, 68, 68, 0.5)',
            }}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(239, 68, 68, 0)',
                '0 0 0 4px rgba(239, 68, 68, 0.2)',
                '0 0 0 0 rgba(239, 68, 68, 0)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default PasswordBreachWarning;

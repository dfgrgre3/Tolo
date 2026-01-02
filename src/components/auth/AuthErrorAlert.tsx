'use client';

import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * خصائص مكون لوحة الخطأ
 */
interface AuthErrorAlertProps {
  /** رسالة الخطأ */
  message: string | null;
  /** كود الخطأ (اختياري) */
  code?: string | null;
  /** نوع الخطأ (للتنسيق) */
  type?: 'error' | 'warning' | 'info';
  /** عنوان مخصص */
  title?: string;
  /** معرف مخصص */
  id?: string;
  /** دالة الإغلاق (اختياري) */
  onDismiss?: () => void;
}

/**
 * مكون لوحة الخطأ المحسّن
 * 
 * @component
 * @description مكون محسّن لعرض رسائل الأخطاء مع دعم كامل لإمكانية الوصول
 * 
 * @example
 * ```tsx
 * <AuthErrorAlert
 *   message="حدث خطأ أثناء تسجيل الدخول"
 *   code="AUTH_ERROR"
 *   type="error"
 * />
 * ```
 */
export const AuthErrorAlert = memo<AuthErrorAlertProps>(({
  message,
  code,
  type = 'error',
  title,
  id = 'error-banner',
  onDismiss,
}) => {
  // حساب فئات CSS بناءً على نوع الخطأ
  const bannerClasses = useMemo(() => {
    const baseClasses = 'mb-5 rounded-xl border p-4 text-sm transition-all duration-200';
    
    const typeClasses = {
      error: 'border-red-500/40 bg-red-500/15 text-red-100',
      warning: 'border-yellow-500/40 bg-yellow-500/15 text-yellow-100',
      info: 'border-blue-500/40 bg-blue-500/15 text-blue-100',
    };

    return cn(baseClasses, typeClasses[type]);
  }, [type]);

  // حساب العنوان
  const displayTitle = useMemo(() => {
    if (title) return title;
    switch (type) {
      case 'error':
        return 'حدث خطأ';
      case 'warning':
        return 'تحذير';
      case 'info':
        return 'معلومة';
      default:
        return 'حدث خطأ';
    }
  }, [title, type]);

  // إذا لم تكن هناك رسالة، لا نعرض المكون
  if (!message) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ duration: 0.25 }}
        className={bannerClasses}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        id={id}
      >
        <div className="flex items-start gap-2">
          <AlertCircle
            className={cn(
              'h-5 w-5 flex-shrink-0 mt-0.5',
              type === 'error' && 'text-red-300',
              type === 'warning' && 'text-yellow-300',
              type === 'info' && 'text-blue-300'
            )}
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="font-semibold">{displayTitle}</p>
            <p className="mt-1">{message}</p>
            {code && (
              <p className="mt-2 text-xs opacity-75">
                رمز الخطأ:{' '}
                <span className="font-mono tracking-wide">{code}</span>
              </p>
            )}
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
              aria-label="إغلاق"
            >
              ×
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

// تعيين اسم العرض للمكون (مفيد للتصحيح)
AuthErrorAlert.displayName = 'AuthErrorAlert';


"use client";

import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * أنواع التنبيهات
 */
export type AlertType = 'success' | 'error' | 'warning' | 'info';

/**
 * خصائص مكون التنبيه
 */
export interface AlertProps {
  /** نوع التنبيه */
  type: AlertType;
  /** عنوان التنبيه */
  title?: string;
  /** رسالة التنبيه */
  message: string;
  /** هل يمكن إغلاق التنبيه؟ */
  dismissible?: boolean;
  /** دالة callback عند الإغلاق */
  onDismiss?: () => void;
  /** فئة CSS إضافية */
  className?: string;
  /** إجراءات إضافية */
  actions?: React.ReactNode;
}

/**
 * تكوين الأيقونات والألوان لكل نوع
 */
const alertConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
    textColor: 'text-green-900 dark:text-green-100',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400',
    textColor: 'text-red-900 dark:text-red-100',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    textColor: 'text-yellow-900 dark:text-yellow-100',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    textColor: 'text-blue-900 dark:text-blue-100',
  },
};

/**
 * مكون التنبيه
 * 
 * يعرض رسالة تنبيه مع أيقونة وألوان مناسبة
 * 
 * @example
 * ```tsx
 * <Alert 
 *   type="success"
 *   title="نجح!"
 *   message="تم حفظ التغييرات بنجاح"
 *   dismissible
 *   onDismiss={() => console.log('Dismissed')}
 * />
 * ```
 */
export const Alert: React.FC<AlertProps> = React.memo(({
  type,
  title,
  message,
  dismissible = false,
  onDismiss,
  className = '',
  actions,
}) => {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        ${config.bgColor} 
        ${config.borderColor} 
        border rounded-lg p-4 
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className={`${config.iconColor} h-5 w-5 flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`font-semibold ${config.textColor} mb-1`}>
              {title}
            </h3>
          )}
          <p className={`text-sm ${config.textColor}`}>
            {message}
          </p>
          {actions && (
            <div className="mt-3">
              {actions}
            </div>
          )}
        </div>

        {dismissible && (
          <button
            onClick={onDismiss}
            className={`
              ${config.iconColor} 
              hover:opacity-70 
              transition-opacity 
              flex-shrink-0
            `}
            aria-label="إغلاق التنبيه"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
});

Alert.displayName = 'Alert';

/**
 * خصائص مكون حاوية التنبيهات
 */
export interface AlertContainerProps {
  /** التنبيهات المعروضة */
  alerts: Array<AlertProps & { id: string }>;
  /** موضع الحاوية */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

/**
 * أنماط المواضع
 */
const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

/**
 * مكون حاوية التنبيهات
 * 
 * يعرض عدة تنبيهات في موضع محدد
 * 
 * @example
 * ```tsx
 * <AlertContainer 
 *   alerts={[
 *     { id: '1', type: 'success', message: 'تم بنجاح' }
 *   ]}
 *   position="top-right"
 * />
 * ```
 */
export const AlertContainer: React.FC<AlertContainerProps> = React.memo(({
  alerts,
  position = 'top-right',
}) => {
  return (
    <div 
      className={`fixed ${positionClasses[position]} z-50 space-y-2 max-w-md w-full`}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {alerts.map((alert) => (
          <Alert key={alert.id} {...alert} />
        ))}
      </AnimatePresence>
    </div>
  );
});

AlertContainer.displayName = 'AlertContainer';

export default Alert;

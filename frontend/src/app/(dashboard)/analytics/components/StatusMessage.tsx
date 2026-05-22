import React from 'react';

/**
 * خصائص مكون رسالة الحالة
 */
interface StatusMessageProps {
  /** نص الرسالة */
  text: string;
  /** هل هذه رسالة خطأ؟ */
  isError?: boolean;
  /** فئة CSS إضافية */
  className?: string;
}

/**
 * مكون رسالة الحالة
 * 
 * يعرض رسالة تحميل أو خطأ مع أيقونة مناسبة
 * 
 * @example
 * ```tsx
 * <StatusMessage text="جارٍ التحميل..." />
 * <StatusMessage text="حدث خطأ" isError={true} />
 * ```
 */
const StatusMessage: React.FC<StatusMessageProps> = ({ 
  text, 
  isError = false,
  className = ''
}) => {
  const iconClasses = isError 
    ? 'text-red-500' 
    : 'animate-spin text-indigo-500';
  
  const textClasses = isError 
    ? 'text-red-600 dark:text-red-400' 
    : 'text-gray-500 dark:text-gray-400';

  return (
    <div 
      className={`text-center py-12 ${className}`}
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
    >
      <svg 
        className={`h-6 w-6 mx-auto mb-3 ${iconClasses}`}
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {isError ? (
          <path 
            fill="currentColor" 
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
          />
        ) : (
          <>
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </>
        )}
      </svg>
      <p className={`font-semibold ${textClasses}`}>
        {text}
      </p>
    </div>
  );
};

StatusMessage.displayName = 'StatusMessage';

export default StatusMessage;

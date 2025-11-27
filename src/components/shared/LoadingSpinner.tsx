import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * خصائص مكون التحميل
 */
export interface LoadingSpinnerProps {
  /** حجم المؤشر */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** نص التحميل */
  text?: string;
  /** ملء الشاشة؟ */
  fullScreen?: boolean;
  /** لون المؤشر */
  color?: string;
}

/**
 * أحجام المؤشر
 */
const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

/**
 * مكون مؤشر التحميل
 * 
 * مؤشر تحميل متحرك مع نص اختياري
 * 
 * @example
 * ```tsx
 * <LoadingSpinner size="md" text="جارٍ التحميل..." />
 * ```
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(({
  size = 'md',
  text,
  fullScreen = false,
  color = 'text-primary',
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 
        className={`${sizeClasses[size]} ${color} animate-spin`}
        aria-label="جارٍ التحميل"
      />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
        role="status"
        aria-live="polite"
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div 
      className="flex items-center justify-center p-8"
      role="status"
      aria-live="polite"
    >
      {content}
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * خصائص مكون هيكل التحميل
 */
export interface SkeletonLoaderProps {
  /** عدد الأسطر */
  lines?: number;
  /** ارتفاع كل سطر */
  height?: string;
  /** فئة CSS إضافية */
  className?: string;
}

/**
 * مكون هيكل التحميل
 * 
 * يعرض هيكل تحميل متحرك
 * 
 * @example
 * ```tsx
 * <SkeletonLoader lines={3} />
 * ```
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = React.memo(({
  lines = 3,
  height = 'h-4',
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="جارٍ التحميل">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`${height} bg-muted rounded animate-pulse`}
          style={{
            width: index === lines - 1 ? '80%' : '100%',
          }}
        />
      ))}
    </div>
  );
});

SkeletonLoader.displayName = 'SkeletonLoader';

/**
 * خصائص مكون بطاقة التحميل
 */
export interface LoadingCardProps {
  /** عدد البطاقات */
  count?: number;
}

/**
 * مكون بطاقة التحميل
 * 
 * يعرض بطاقات تحميل متحركة
 * 
 * @example
 * ```tsx
 * <LoadingCard count={3} />
 * ```
 */
export const LoadingCard: React.FC<LoadingCardProps> = React.memo(({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="border rounded-lg p-4 space-y-3"
          role="status"
          aria-label="جارٍ التحميل"
        >
          <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-4 bg-muted rounded animate-pulse w-full" />
          <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
        </div>
      ))}
    </>
  );
});

LoadingCard.displayName = 'LoadingCard';

export default LoadingSpinner;

'use client';

/**
 * 🎴 AuthCard - بطاقة المصادقة الأساسية
 * 
 * مكون قابل لإعادة الاستخدام مع تصميم Glassmorphism
 * يستخدم في جميع صفحات المصادقة
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface AuthCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showLogo?: boolean;
  gradient?: 'indigo' | 'purple' | 'teal' | 'rose';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const gradientClasses = {
  indigo: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30',
  purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  teal: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30',
  rose: 'from-rose-500/20 to-orange-500/20 border-rose-500/30',
};

export function AuthCard({
  children,
  title,
  subtitle,
  icon: Icon,
  className,
  maxWidth = 'md',
  showLogo = true,
  gradient = 'indigo',
}: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'w-full',
        maxWidthClasses[maxWidth],
        'mx-auto'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl',
          'bg-gradient-to-br backdrop-blur-xl',
          'border shadow-2xl',
          gradientClasses[gradient],
          'p-8',
          className
        )}
      >
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl" />

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          {showLogo && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30"
            >
              {Icon ? (
                <Icon className="h-8 w-8 text-white" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-8 w-8 text-white"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              )}
            </motion.div>
          )}

          {/* Title */}
          {title && (
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-2 text-center text-2xl font-bold text-white"
            >
              {title}
            </motion.h1>
          )}

          {/* Subtitle */}
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6 text-center text-sm text-slate-300"
            >
              {subtitle}
            </motion.p>
          )}

          {/* Children */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default AuthCard;

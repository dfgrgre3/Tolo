'use client';

/**
 * 🔘 AuthButton - زر المصادقة المحسّن
 * 
 * زر مع تأثيرات متقدمة:
 * - Gradient backgrounds
 * - Loading state
 * - Hover animations
 * - Multiple variants
 */

import { forwardRef, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AuthButtonProps extends Omit<HTMLMotionProps<"button">, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  gradient?: boolean;
}

const variantClasses = {
  primary: cn(
    'bg-gradient-to-r from-indigo-500 to-purple-600',
    'hover:from-indigo-600 hover:to-purple-700',
    'text-white shadow-lg shadow-indigo-500/30',
    'border border-indigo-400/20'
  ),
  secondary: cn(
    'bg-white/10 hover:bg-white/20',
    'text-white',
    'border border-white/20'
  ),
  outline: cn(
    'bg-transparent hover:bg-white/5',
    'text-white',
    'border-2 border-indigo-500/50 hover:border-indigo-500'
  ),
  ghost: cn(
    'bg-transparent hover:bg-white/10',
    'text-slate-300 hover:text-white'
  ),
  danger: cn(
    'bg-gradient-to-r from-red-500 to-rose-600',
    'hover:from-red-600 hover:to-rose-700',
    'text-white shadow-lg shadow-red-500/30',
    'border border-red-400/20'
  ),
};

const sizeClasses = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-11 px-6 text-base gap-2',
  lg: 'h-13 px-8 text-lg gap-2.5',
};

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading,
      loadingText,
      icon: Icon,
      iconPosition = 'left',
      fullWidth,
      gradient = true,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        whileHover={!isDisabled ? { scale: 1.02 } : undefined}
        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
        disabled={isDisabled}
        className={cn(
          'relative overflow-hidden rounded-xl font-semibold',
          'flex items-center justify-center',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-transparent',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          isDisabled && 'opacity-60 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {/* Shimmer Effect for Primary */}
        {variant === 'primary' && !isDisabled && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />
        )}

        {/* Content */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className={cn('animate-spin', iconSizeClasses[size])} />
              {loadingText || 'جاري التحميل...'}
            </>
          ) : (
            <>
              {Icon && iconPosition === 'left' && (
                <Icon className={iconSizeClasses[size]} />
              )}
              {children}
              {Icon && iconPosition === 'right' && (
                <Icon className={iconSizeClasses[size]} />
              )}
            </>
          )}
        </span>
      </motion.button>
    );
  }
);

AuthButton.displayName = 'AuthButton';

// Social Login Button Variant
export interface SocialButtonProps extends Omit<AuthButtonProps, 'variant' | 'icon' | 'children'> {
  provider: 'google' | 'github' | 'twitter' | 'facebook' | 'apple';
  children?: ReactNode;
}

const socialConfig = {
  google: {
    label: 'Google',
    className: 'bg-white hover:bg-gray-100 text-gray-800',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
  github: {
    label: 'GitHub',
    className: 'bg-[#24292e] hover:bg-[#2f363d] text-white',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  twitter: {
    label: 'Twitter',
    className: 'bg-black hover:bg-gray-900 text-white',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  facebook: {
    label: 'Facebook',
    className: 'bg-[#1877f2] hover:bg-[#166fe5] text-white',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  apple: {
    label: 'Apple',
    className: 'bg-black hover:bg-gray-900 text-white',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
  },
};

export function SocialButton({
  provider,
  children,
  className,
  ...props
}: SocialButtonProps) {
  const config = socialConfig[provider];

  return (
    <AuthButton
      variant="secondary"
      className={cn(config.className, 'border-0', className)}
      {...props}
    >
      {config.icon}
      <span>{children || config.label}</span>
    </AuthButton>
  );
}

export default AuthButton;

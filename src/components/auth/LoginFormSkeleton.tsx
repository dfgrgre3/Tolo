'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Login Form Skeleton Component
 * Shows a loading skeleton while the login form is being loaded
 */
export function LoginFormSkeleton() {
  return (
    <div
      className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl animate-pulse"
      role="status"
      aria-label="جارٍ تحميل نموذج تسجيل الدخول"
    >
      {/* Header Skeleton */}
      <div className="mb-6 text-center">
        <div className="h-8 w-40 bg-white/20 rounded-lg mx-auto mb-3" />
        <div className="h-4 w-56 bg-white/10 rounded mx-auto" />
      </div>

      {/* Email Field Skeleton */}
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-white/15 rounded" />
          <div className="h-12 w-full bg-white/10 rounded-xl" />
        </div>

        {/* Password Field Skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-20 bg-white/15 rounded" />
          <div className="h-12 w-full bg-white/10 rounded-xl" />
        </div>

        {/* Remember Me & Forgot Password Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-white/15 rounded" />
            <div className="h-4 w-16 bg-white/10 rounded" />
          </div>
          <div className="h-4 w-28 bg-white/10 rounded" />
        </div>

        {/* Submit Button Skeleton */}
        <div className="h-12 w-full bg-indigo-500/30 rounded-xl" />

        {/* Divider Skeleton */}
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-white/10" />
          <div className="h-4 w-20 bg-white/10 rounded" />
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* OAuth Buttons Skeleton */}
        <div className="space-y-3">
          <div className="h-11 w-full bg-white/10 rounded-xl" />
          <div className="h-11 w-full bg-white/10 rounded-xl" />
        </div>
      </div>

      {/* Screen reader text */}
      <span className="sr-only">جارٍ تحميل نموذج تسجيل الدخول...</span>
    </div>
  );
}

/**
 * Generic Skeleton Line Component
 */
interface SkeletonLineProps {
  className?: string;
  width?: string;
  height?: string;
}

export function SkeletonLine({ className, width = 'w-full', height = 'h-4' }: SkeletonLineProps) {
  return (
    <div
      className={cn(
        'bg-white/15 rounded animate-pulse',
        width,
        height,
        className
      )}
    />
  );
}

/**
 * OAuth Button Skeleton
 */
export function OAuthButtonSkeleton() {
  return (
    <div className="h-11 w-full bg-white/10 rounded-xl animate-pulse flex items-center justify-center gap-3 px-4">
      <div className="h-5 w-5 bg-white/20 rounded" />
      <div className="h-4 w-32 bg-white/15 rounded" />
    </div>
  );
}

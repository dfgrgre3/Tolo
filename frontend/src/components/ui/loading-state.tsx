'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-16 w-16", className)}>
      {/* Pure CSS animated spinner - no framer-motion needed */}
      <div className="absolute inset-[-4px] rounded-full bg-primary/20 blur-md animate-pulse" />

      {/* Background Circle */}
      <div className="absolute inset-0 rounded-full border-4 border-primary/10" />

      {/* Main Spinner Ring - CSS animation */}
      <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />

      {/* Inner Fast Ring - CSS animation */}
      <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-primary/60 border-b-transparent border-l-transparent animate-[spin_0.8s_linear_infinite_reverse]" />

      {/* Center Dot */}
      <div className="absolute inset-[45%] rounded-full bg-primary shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-[pulse_1.5s_ease-in-out_infinite]" />
    </div>
  );
}

function LoadingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      {/* Top Progress Bar - CSS animation */}
      <div className="fixed top-0 left-0 right-0 h-1.5 z-50 overflow-hidden bg-primary/10">
        <div className="h-full bg-gradient-to-r from-primary via-orange-500 to-amber-500 animate-[slide_1.5s_ease-in-out_infinite]"
          style={{ animation: 'slide 1.5s ease-in-out infinite' }} />
      </div>

      <div className="flex flex-col items-center gap-8">
        <LoadingSpinner />

        <div className="flex flex-col items-center gap-2 text-center px-4">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent animate-[fadeInUp_0.5s_ease-out]">
            جاري تحضير المحتوى...
          </h3>
          <p className="text-muted-foreground max-w-xs animate-[fadeIn_0.7s_ease-out]">
            نحن نجهز لك تجربة تعليمية فريدة ومنظمة.
          </p>
        </div>
      </div>

      {/* Static Background Elements - no animation needed */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rpg-card flex flex-col gap-4">
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex justify-between items-center mt-4">
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  );
}

function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function UnifiedLayoutSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-10 min-h-screen animate-in fade-in duration-700">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-14 w-1/3 max-w-sm rounded-2xl" />
        <Skeleton className="h-5 w-1/2 max-w-lg rounded-xl" />
      </div>

      {/* Hero Skeleton */}
      <Skeleton className="h-[350px] w-full rounded-[2.5rem]" />

      {/* Grid Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>

      {/* Content Grid */}
      <SkeletonGrid count={3} />
    </div>
  );
}

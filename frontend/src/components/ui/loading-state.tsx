'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="جاري التحميل"
      className={cn(
        "h-8 w-8 rounded-full border-2 border-muted border-t-primary animate-spin shrink-0",
        className
      )}
    />
  );
}

export function LoadingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <LoadingSpinner className="h-10 w-10 border-3" />
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">
            جاري تحضير المحتوى...
          </h3>
          <p className="text-sm text-muted-foreground">
            يرجى الانتظار لحظات
          </p>
        </div>
      </div>
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
    <div className="container mx-auto p-6 space-y-10 min-h-screen">
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

// Default export for convenient imports
export default {
  LoadingSpinner,
  LoadingPage,
  UnifiedLayoutSkeleton,
};

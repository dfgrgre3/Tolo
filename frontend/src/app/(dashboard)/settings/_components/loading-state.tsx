import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingState() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/10">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48 bg-white/10 rounded-lg" />
          <Skeleton className="h-4 w-72 bg-white/5 rounded" />
        </div>
        <Skeleton className="h-10 w-32 bg-white/10 rounded-xl" />
      </div>

      {/* Card Skeletons */}
      {[...Array(2)].map((_, cardIndex) => (
        <div key={cardIndex} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden p-6 space-y-6">
          <div className="space-y-2 border-b border-white/5 pb-4">
            <Skeleton className="h-6 w-36 bg-white/10 rounded" />
            <Skeleton className="h-3 w-56 bg-white/5 rounded" />
          </div>
          
          <div className="space-y-4">
            {[...Array(3)].map((_, toggleIndex) => (
              <div key={toggleIndex} className="flex items-center justify-between py-2">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48 bg-white/10 rounded" />
                  <Skeleton className="h-3 w-80 bg-white/5 rounded" />
                </div>
                <Skeleton className="h-6 w-11 bg-white/10 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


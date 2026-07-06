"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeachingLoading() {
  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900/40 text-right" dir="rtl">
      {/* Sidebar Skeleton */}
      <aside className="hidden lg:flex flex-col w-64 border-l border-slate-200 dark:border-slate-800 bg-card p-6 gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex flex-col gap-4 mt-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </aside>

      {/* Main Panel Skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Skeleton */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-card px-8 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </header>

        {/* Content Skeleton */}
        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Hero Banner Skeleton */}
          <Skeleton className="h-44 w-full rounded-2xl" />

          {/* Cards Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>

          {/* Charts/Content Area Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </main>
      </div>
    </div>
  );
}

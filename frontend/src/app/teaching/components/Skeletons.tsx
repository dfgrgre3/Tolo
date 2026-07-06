"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton() {
  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-card space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InboxSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 h-[600px] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-card">
      <div className="border-l border-slate-200 dark:border-slate-800 p-4 space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 py-2 border-b border-slate-50 dark:border-slate-900">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
      <div className="col-span-2 flex flex-col p-6 justify-between">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex-1 py-6 space-y-4">
          <div className="flex gap-3 max-w-[70%]">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="flex gap-3 max-w-[70%] mr-auto flex-row-reverse">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

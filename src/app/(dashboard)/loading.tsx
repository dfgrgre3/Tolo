"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64 bg-primary/10 rounded-xl" />
          <Skeleton className="h-4 w-96 bg-muted/50 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-32 bg-primary/5 rounded-xl hidden sm:block" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) =>
        <Skeleton key={i} className="h-32 w-full rounded-2xl bg-card border border-border" />
        )}
      </div>
      
      <Skeleton className="h-[400px] w-full rounded-[2rem] bg-card/40 border border-white/5 mt-8" />
    </div>);

}
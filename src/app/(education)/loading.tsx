"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function EducationLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 mb-8">
        <Skeleton className="h-12 w-3/4 max-w-md bg-primary/10 rounded-xl" />
        <Skeleton className="h-4 w-1/2 bg-muted/50 rounded-lg" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between gap-4 mb-6">
         <Skeleton className="h-10 w-full max-w-sm rounded-xl bg-card" />
         <Skeleton className="h-10 w-24 rounded-xl bg-card" />
      </div>

      {/* Grid of Course/Resource cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col h-96 rounded-[2rem] bg-card/40 border border-border p-4 gap-4 overflow-hidden">
             <Skeleton className="w-full h-48 rounded-xl bg-muted/20" />
             <Skeleton className="h-6 w-3/4 bg-primary/5 rounded-md mt-2" />
             <Skeleton className="h-4 w-full bg-muted/10 rounded-md mt-2" />
             <Skeleton className="h-4 w-2/3 bg-muted/10 rounded-md" />
             <div className="mt-auto pt-4 flex justify-between">
                <Skeleton className="h-10 w-24 rounded-lg bg-primary/10" />
                <Skeleton className="h-10 w-10 rounded-lg bg-muted/20" />
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

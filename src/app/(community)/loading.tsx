"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CommunityLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 mb-8">
        <Skeleton className="h-10 w-64 bg-primary/10 rounded-xl" />
        <Skeleton className="h-4 w-96 bg-muted/50 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-3 space-y-6">
           <Skeleton className="h-32 w-full rounded-2xl bg-card/50 border border-border" />
           {[...Array(4)].map((_, i) => (
             <div key={i} className="flex flex-col rounded-2xl bg-card/30 border border-border p-6 gap-4">
                <div className="flex items-center gap-4">
                   <Skeleton className="h-12 w-12 rounded-full bg-muted/30" />
                   <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32 bg-primary/10 rounded-md" />
                      <Skeleton className="h-3 w-20 bg-muted/20 rounded-md" />
                   </div>
                </div>
                <Skeleton className="h-20 w-full bg-muted/10 rounded-xl" />
             </div>
           ))}
        </div>
        {/* Sidebar */}
        <div className="hidden lg:flex lg:col-span-1 flex-col gap-6">
           <Skeleton className="h-64 w-full rounded-2xl bg-card border border-border" />
           <Skeleton className="h-96 w-full rounded-2xl bg-card border border-border" />
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";

export default function LoadingSkeleton() {
  return (
    <div className="space-y-8" dir="rtl">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border/50 bg-card/30 p-8 backdrop-blur-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-72 rounded-xl bg-muted" />
          <div className="h-5 w-96 rounded-xl bg-muted" />
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted/60" />
            ))}
          </div>
        </div>
      </div>
      <div className="h-12 rounded-2xl bg-muted/40" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 rounded-2xl bg-muted/30" />
        ))}
      </div>
    </div>
  );
}

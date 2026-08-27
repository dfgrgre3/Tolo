import React from "react";
import { DASH_CONTAINER } from "./design-system";

/**
 * Layout-matched placeholder for the student dashboard: hero banner plus
 * the same stacked flat panels UserHome renders, so there is no shift
 * when real sections stream in.
 */
export const UserHomeSkeleton = () => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className={`${DASH_CONTAINER.page} py-4 sm:py-6 lg:py-8`}>
        {/* Hero banner */}
        <div className="rounded-xl bg-muted border border-border p-5 sm:p-7 md:p-8 animate-pulse">
          <div className="flex gap-2 mb-4">
            <div className="h-7 w-36 rounded-full bg-background" />
            <div className="h-7 w-40 rounded-full bg-background/70" />
          </div>
          <div className="h-9 w-52 rounded-lg bg-background mb-3" />
          <div className="h-4 w-full max-w-xl rounded bg-background mb-6" />
          {/* Level / XP strip */}
          <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-background/60 p-4">
            <div className="h-14 w-14 shrink-0 rounded-full bg-background" />
            <div className="h-10 w-32 rounded-md bg-background" />
            <div className="h-2.5 flex-1 rounded-full bg-background" />
          </div>
        </div>

        {/* Stacked panels */}
        <div className={`${DASH_CONTAINER.stack} mt-4 sm:mt-5`}>
          {[208, 420, 240, 460].map((height, i) => (
            <div
              key={i}
              className="w-full rounded-xl border border-border bg-card p-4 sm:p-5 animate-pulse"
              style={{ height }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-1 rounded-full bg-muted" />
                  <div className="h-5 w-44 rounded bg-muted" />
                </div>
                <div className="h-7 w-20 rounded-md bg-muted" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-24 rounded-lg bg-muted" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

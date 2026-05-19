"use client";

export function UserSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="h-10 w-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-5 w-80 bg-muted animate-pulse rounded-md" />
        </div>
        <div className="h-11 w-36 bg-muted animate-pulse rounded-xl" />
      </div>
      <div className="grid gap-8 lg:grid-cols-4">
        <div className="lg:col-span-1 space-y-8">
          <div className="rounded-2xl border bg-card p-8 flex flex-col items-center gap-6">
            <div className="h-32 w-32 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2 w-full">
              <div className="h-7 w-3/4 mx-auto bg-muted animate-pulse rounded" />
              <div className="h-5 w-1/2 mx-auto bg-muted animate-pulse rounded" />
            </div>
            <div className="h-8 w-24 bg-muted animate-pulse rounded-full" />
          </div>
        </div>
        <div className="lg:col-span-3 space-y-8">
          <div className="grid gap-6 md:grid-cols-4">
            {[...Array(4)].map((_, i) =>
            <div key={i} className="rounded-2xl border bg-card p-6 space-y-4">
                <div className="h-10 w-10 bg-muted animate-pulse rounded-xl" />
                <div className="space-y-2">
                  <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                </div>
              </div>
            )}
          </div>
          <div className="h-96 w-full bg-muted animate-pulse rounded-2xl border" />
        </div>
      </div>
    </div>
  );
}

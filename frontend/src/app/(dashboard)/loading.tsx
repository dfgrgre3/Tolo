import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-32 rounded-xl hidden sm:block" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) =>
        <Skeleton key={i} className="h-32 w-full rounded-xl border border-border" />
        )}
      </div>
      
      <Skeleton className="h-[400px] w-full rounded-xl border border-border mt-8" />
    </div>);

}

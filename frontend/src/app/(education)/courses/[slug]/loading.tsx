/**
 * Streaming UI for the course detail page. The server component waits on the
 * hydration API; this skeleton keeps the layout stable instead of a blank page
 * and prevents layout shift once content arrives.
 */
export default function CourseDetailLoading() {
  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-[#0B0D14] pb-20"
      dir="rtl"
      aria-busy="true"
      aria-label="جارٍ تحميل تفاصيل الدورة"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-white/5" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <div className="flex gap-2">
              <div className="h-7 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-white/5" />
              <div className="h-7 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-white/5" />
              <div className="h-7 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-white/5" />
            </div>
            <div className="h-10 w-3/4 animate-pulse rounded-lg bg-gray-200 dark:bg-white/5" />
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-white/5" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-white/5" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-white/5" />
            </div>
            <div className="flex gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 w-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/5"
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="h-80 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

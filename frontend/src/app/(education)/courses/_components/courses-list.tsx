"use client";

import { Search } from "lucide-react";
import { CourseCard } from "./course-card";
import type { CourseSummary } from "./types";
import { ComponentErrorBoundary } from "@/components/ui/error-boundary";

export function CoursesList({
  loading,
  error,
  filteredCourses,
}: {
  loading: boolean;
  error: string | null;
  filteredCourses: CourseSummary[];
}) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white dark:border-white/10 dark:bg-slate-950/70"
          >
            <div className="aspect-[16/10] animate-pulse bg-slate-200 dark:bg-white/5" />
            <div className="space-y-4 p-6">
              <div className="h-6 w-2/3 animate-pulse rounded-full bg-slate-200 dark:bg-white/5" />
              <div className="h-4 w-full animate-pulse rounded-full bg-slate-200 dark:bg-white/5" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200 dark:bg-white/5" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[32px] border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-500/20 dark:bg-rose-500/10">
        <h3 className="text-xl font-black text-rose-700 dark:text-rose-300">
          تعذر تحميل الدورات
        </h3>
        <p className="mt-3 text-sm leading-7 text-rose-600 dark:text-rose-200/80">
          {error}
        </p>
      </div>
    );
  }

  if (filteredCourses.length === 0) {
    return (
      <div className="rounded-[32px] border-2 border-dashed border-slate-300 bg-white/70 p-10 text-center dark:border-white/10 dark:bg-slate-950/60">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
          <Search className="h-6 w-6" />
        </div>
        <h3 className="text-2xl font-black">لا توجد نتائج مطابقة الآن</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
          جرّب تعديل كلمات البحث أو إعادة ضبط الفلاتر، أو افتح جميع المواد
          لرؤية مزيد من الدورات.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {filteredCourses.map((course, index) => (
        <ComponentErrorBoundary key={course.id}>
          <CourseCard course={course} index={index} />
        </ComponentErrorBoundary>
      ))}
    </div>
  );
}

"use client";

import React from "react";
import { m } from "framer-motion";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

// Skeleton shimmer component
const Shimmer: React.FC<{className?: string;}> = ({ className }) =>
<div className={cn("animate-pulse rounded-xl bg-gray-200 dark:bg-white/5", className)} />;


// Course card skeleton
const CourseCardSkeleton: React.FC<{index?: number;}> = ({ index = 0 }) =>
<m.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.05 }}
  className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 overflow-hidden">
  
    <Shimmer className="h-48 rounded-none" />
    <div className="p-5 space-y-3">
      <Shimmer className="h-5 w-3/4" />
      <Shimmer className="h-4 w-1/2" />
      <Shimmer className="h-3 w-full" />
      <Shimmer className="h-3 w-5/6" />
      <div className="flex gap-2 pt-2">
        <Shimmer className="h-8 w-20 rounded-lg" />
        <Shimmer className="h-8 w-20 rounded-lg" />
        <Shimmer className="h-8 w-20 rounded-lg" />
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-white/5">
        <Shimmer className="h-7 w-16" />
        <Shimmer className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  </m.div>;


// Full page loading skeleton
export const CoursesLoadingSkeleton: React.FC = () =>
<div className="min-h-screen bg-gray-50 dark:bg-[#0B0D14]" dir="rtl">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Hero skeleton */}
      <div className="rounded-3xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-12">
        <div className="flex flex-col items-center gap-6">
          <Shimmer className="h-8 w-48 rounded-full" />
          <Shimmer className="h-14 w-96 max-w-full" />
          <Shimmer className="h-5 w-80 max-w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl mt-4">
            {Array.from({ length: 4 }).map((_, i) =>
          <Shimmer key={i} className="h-28 rounded-2xl" />
          )}
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) =>
      <Shimmer key={i} className="h-20 rounded-xl" />
      )}
      </div>

      {/* Filter skeleton */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <Shimmer className="h-11 flex-1 rounded-xl" />
          <Shimmer className="h-11 w-28 rounded-xl" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) =>
        <Shimmer key={i} className="h-9 w-24 rounded-xl" />
        )}
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) =>
      <CourseCardSkeleton key={i} index={i} />
      )}
      </div>
    </div>
  </div>;


// Empty state
export const CoursesEmptyState: React.FC = () =>
<m.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex flex-col items-center justify-center py-20 text-center">
  
    <div className="relative mb-6">
      <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
      <div className="relative h-20 w-20 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
        <Search className="h-8 w-8 text-gray-400" />
      </div>
    </div>
    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">لا توجد نتائج</h3>
    <p className="text-sm text-gray-500 max-w-sm mb-6">
      لم نجد أي دورات تطابق معايير البحث. جرب تغيير الفلاتر أو ابحث بكلمات مختلفة.
    </p>
  </m.div>;


// Inline loader
export const CoursesPageLoader: React.FC = () =>
<div className="flex items-center justify-center py-8">
    <div className="flex items-center gap-3 rounded-xl bg-gray-100 dark:bg-white/5 px-5 py-3">
      <div className="h-5 w-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      <span className="text-sm font-medium text-gray-500">جاري التحميل...</span>
    </div>
  </div>;


export default CoursesLoadingSkeleton;
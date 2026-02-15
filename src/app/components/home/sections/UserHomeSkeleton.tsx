import React from "react";

export const UserHomeSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-pulse dir-rtl">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
        </div>
        <div className="h-10 w-40 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
      </div>

      {/* Level Progress Skeleton */}
      <div className="h-64 w-full rounded-3xl bg-gray-200 dark:bg-gray-800"></div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column (Sidebar) */}
        <div className="xl:col-span-3 space-y-6 order-2 xl:order-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
          ))}
        </div>

        {/* Center/Right Column */}
        <div className="xl:col-span-9 space-y-8 order-1 xl:order-2">
          {/* Search */}
          <div className="h-16 rounded-xl bg-gray-200 dark:bg-gray-800"></div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
            <div className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
          </div>

          {/* Performance Chart */}
          <div className="h-96 rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
          
          {/* Other Sections */}
          <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
        </div>
      </div>
    </div>
  );
};

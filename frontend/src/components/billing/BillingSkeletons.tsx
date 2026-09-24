import React from "react";

export const CardSkeleton = () => (
  <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[2rem] p-6 space-y-4">
    <div className="flex justify-between items-center">
      <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded" />
      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-xl" />
    </div>
    <div className="h-8 w-32 bg-gray-200 dark:bg-white/10 rounded" />
  </div>
);

export const TransactionSkeleton = () => (
  <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-[2rem]">
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 bg-gray-200 dark:bg-white/10 rounded-[1.2rem]" />
      <div className="space-y-2">
        <div className="h-4 w-40 bg-gray-200 dark:bg-white/10 rounded" />
        <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 rounded" />
      </div>
    </div>
    <div className="space-y-2 text-left">
      <div className="h-6 w-20 bg-gray-200 dark:bg-white/10 rounded" />
      <div className="h-3 w-12 bg-gray-200 dark:bg-white/10 rounded mx-auto md:mx-0" />
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="h-[250px] w-full bg-gray-50 dark:bg-white/5 rounded-[2.5rem] p-6 border border-gray-200 dark:border-white/10 flex items-center justify-center">
    <div className="space-y-4 w-full px-10">
       <div className="h-4 w-1/4 bg-gray-200 dark:bg-white/10 rounded mb-10" />
       <div className="h-32 w-full bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 border-dashed" />
    </div>
  </div>
);

export const WalletHeroSkeleton = () => (
  <div className="rounded-[3rem] bg-gray-50 dark:bg-white/5 p-8 md:p-14 border border-gray-200 dark:border-white/10">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-8">
        <div className="h-8 w-48 bg-gray-200 dark:bg-white/10 rounded-xl" />
        <div className="h-16 w-64 bg-gray-200 dark:bg-white/10 rounded-2xl" />
        <div className="flex gap-4">
          <div className="h-14 w-40 bg-gray-200 dark:bg-white/10 rounded-2xl" />
          <div className="h-14 w-40 bg-gray-200 dark:bg-white/10 rounded-2xl" />
        </div>
      </div>
      <ChartSkeleton />
    </div>
  </div>
);

"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap } from "lucide-react";

export const CoursesLoadingSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08 }}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <GraduationCap className="h-16 w-16 text-slate-300 dark:text-slate-600" />
              </motion.div>
            </div>
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
          </div>

          <div className="space-y-4 p-5">
            <div className="space-y-2">
              <div className="h-5 w-3/4 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-1/2 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700/50" />
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-700/50" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-700/50" />
            </div>

            <div className="flex justify-between">
              <div className="h-4 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-700/50" />
              <div className="h-4 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-700/50" />
              <div className="h-4 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-700/50" />
            </div>

            <div className="flex gap-2">
              <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700/50" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700/50" />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700">
              <div className="h-6 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-10 w-28 animate-pulse rounded-xl bg-gradient-to-r from-blue-400/50 to-indigo-400/50" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

interface CoursesEmptyStateProps {
  title?: string;
  description?: string;
  showAction?: boolean;
  onAction?: () => void;
  actionLabel?: string;
}

export const CoursesEmptyState: React.FC<CoursesEmptyStateProps> = ({
  title = "لا توجد دورات",
  description = "لم نتمكن من العثور على دورات تطابق معايير البحث.",
  showAction = true,
  onAction,
  actionLabel = "عرض جميع الدورات",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center px-4 py-20"
    >
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, 4, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 opacity-20 blur-2xl" />
        <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
          <BookOpen className="h-16 w-16 text-slate-400 dark:text-slate-500" />
        </div>
      </motion.div>

      <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mb-6 max-w-md text-center text-slate-500 dark:text-slate-400">{description}</p>

      {showAction && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/25 transition-shadow hover:shadow-xl"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
};

export const CoursesPageLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="relative"
      >
        <div className="h-16 w-16 rounded-full border-4 border-slate-200 dark:border-slate-700" />
        <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-blue-500" />
      </motion.div>
      <p className="mt-4 font-medium text-slate-500 dark:text-slate-400">جاري تحميل الدورات...</p>
    </div>
  );
};

export default CoursesLoadingSkeleton;

"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Loader2 } from "lucide-react";

export const CoursesLoadingSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
        >
          {/* Thumbnail skeleton */}
          <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity 
                }}
              >
                <GraduationCap className="h-16 w-16 text-slate-300 dark:text-slate-600" />
              </motion.div>
            </div>
            {/* Shimmer effect */}
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
          </div>

          {/* Content skeleton */}
          <div className="p-5 space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 animate-pulse" />
              <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg w-1/2 animate-pulse" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-full animate-pulse" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-5/6 animate-pulse" />
            </div>

            {/* Stats */}
            <div className="flex justify-between">
              <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-16 animate-pulse" />
              <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-16 animate-pulse" />
              <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-16 animate-pulse" />
            </div>

            {/* Tags */}
            <div className="flex gap-2">
              <div className="h-6 bg-slate-100 dark:bg-slate-700/50 rounded-full w-16 animate-pulse" />
              <div className="h-6 bg-slate-100 dark:bg-slate-700/50 rounded-full w-20 animate-pulse" />
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse" />
              <div className="h-10 bg-gradient-to-r from-blue-400/50 to-purple-400/50 rounded-xl w-28 animate-pulse" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export const CoursesEmptyState: React.FC<{ 
  title?: string; 
  description?: string;
  showAction?: boolean;
  onAction?: () => void;
}> = ({ 
  title = "لا توجد دورات", 
  description = "لم نتمكن من العثور على دورات تطابق معايير البحث",
  showAction = true,
  onAction
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <motion.div
        animate={{ 
          y: [0, -10, 0],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity,
          repeatType: "reverse"
        }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 blur-2xl opacity-20" />
        <div className="relative h-32 w-32 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
          <BookOpen className="h-16 w-16 text-slate-400 dark:text-slate-500" />
        </div>
      </motion.div>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
        {description}
      </p>

      {showAction && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl transition-shadow"
        >
          عرض جميع الدورات
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
      <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">
        جاري تحميل الدورات...
      </p>
    </div>
  );
};

export default CoursesLoadingSkeleton;

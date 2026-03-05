"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { CourseCard, CourseCardProps } from "./CourseCard";

interface FeaturedCoursesProps {
  courses: CourseCardProps[];
  onEnroll: (courseId: string) => void;
  onUnenroll: (courseId: string) => void;
  enrollingId?: string | null;
}

export const FeaturedCourses: React.FC<FeaturedCoursesProps> = ({
  courses,
  onEnroll,
  onUnenroll,
  enrollingId = null,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === "right" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  if (courses.length === 0) return null;

  return (
    <section className="mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity 
            }}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30"
          >
            <Sparkles className="h-5 w-5 text-white" />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              ط§ظ„ط¯ظˆط±ط§طھ ط§ظ„ظ…ظ…ظٹط²ط©
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ط£ظپط¶ظ„ ط§ظ„ط¯ظˆط±ط§طھ ط§ظ„ظ…ط®طھط§ط±ط© ظ„ظƒ
            </p>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll("right")}
            className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-500 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll("left")}
            className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-500 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div className="relative">
        {/* Gradient fades */}
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-transparent to-background z-10 pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-background z-10 pointer-events-none" />
        
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {courses.map((course, index) => (
            <div key={course.id} className="min-w-[340px] max-w-[340px]">
              <CourseCard
                {...course}
                featured={true}
                index={index}
                isProcessing={enrollingId === course.id}
                onEnroll={() => onEnroll(course.id)}
                onUnenroll={() => onUnenroll(course.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCourses;

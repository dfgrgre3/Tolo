"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, Sparkles } from "lucide-react";
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
    if (!scrollRef.current) return;
    const scrollAmount = Math.min(scrollRef.current.clientWidth * 0.85, 420);
    scrollRef.current.scrollBy({
      left: direction === "right" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (courses.length === 0) return null;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20">
            <Star className="h-5 w-5 fill-white text-white" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">الدورات المميزة</h2>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-sm text-gray-500 max-w-lg">
              أعلى الدورات تقييمًا وأكثرها طلبًا - ابدأ من هنا لأفضل تجربة تعليمية.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll("right")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/80 text-gray-500 hover:text-gray-700 dark:hover:text-white transition-all hover:border-gray-300 dark:hover:border-white/20"
            aria-label="التمرير يمينًا"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("left")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/80 text-gray-500 hover:text-gray-700 dark:hover:text-white transition-all hover:border-gray-300 dark:hover:border-white/20"
            aria-label="التمرير يسارًا"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Fade edges */}
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 hidden w-16 bg-gradient-to-r from-gray-50 dark:from-[#0B0D14] to-transparent md:block" />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 hidden w-16 bg-gradient-to-l from-gray-50 dark:from-[#0B0D14] to-transparent md:block" />

        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pt-2 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              className="w-[85vw] min-w-[85vw] snap-start sm:w-[380px] sm:min-w-[380px]"
            >
              <CourseCard
                {...course}
                featured
                index={index}
                isProcessing={enrollingId === course.id}
                onEnroll={() => onEnroll(course.id)}
                onUnenroll={() => onUnenroll(course.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCourses;

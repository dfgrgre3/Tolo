"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
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
    <section className="mb-20 space-y-8">
      <div className="flex flex-col gap-5 px-1 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4 text-right">
          <motion.div
            animate={{ rotate: [0, 4, -4, 0], scale: [1, 1.04, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-tr from-amber-500 to-orange-600 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
          >
            <Star className="h-7 w-7 fill-black text-black" />
          </motion.div>

          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">مختارات الأسبوع</p>
            <h2 className="text-2xl font-black text-white sm:text-3xl">دورات مميزة تستحق البداية الآن</h2>
            <p className="max-w-2xl text-sm leading-7 text-gray-400">
              اختيار سريع للدورات الأعلى تقييمًا حتى تبدأ من أفضل نقطة بدل التنقل العشوائي بين النتائج.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <motion.button
            whileHover={{ scale: 1.06, backgroundColor: "rgba(255,255,255,0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => scroll("right")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-3xl transition-all"
            aria-label="التمرير يمينًا"
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.06, backgroundColor: "rgba(255,255,255,0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => scroll("left")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-3xl transition-all"
            aria-label="التمرير يسارًا"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 hidden w-20 bg-gradient-to-r from-[#0A0A0F] to-transparent md:block" />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 hidden w-20 bg-gradient-to-l from-[#0A0A0F] to-transparent md:block" />

        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-2 pt-4 scrollbar-hide sm:gap-6"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              className="w-[88vw] min-w-[88vw] snap-start sm:w-[420px] sm:min-w-[420px]"
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

        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-1/2 w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/5 blur-[120px]" />
      </div>
    </section>
  );
};

export default FeaturedCourses;

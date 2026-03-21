"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Star, Zap } from "lucide-react";
import { CourseCard, CourseCardProps } from "./CourseCard";

interface FeaturedCoursesProps {
  courses: CourseCardProps[];
  onEnroll: (courseId: string) => void;
  onUnenroll: (courseId: string) => void;
  enrollingId?: string | null;
}

const STYLES = {
  glass: "relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-6",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

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
    <section className="mb-20 space-y-8">
      {/* --- Section Header --- */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-4 text-center md:text-right">
           <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)] border-2 border-white/20"
           >
              <Star className="h-8 w-8 text-black fill-black" />
           </motion.div>
           <div className="space-y-1">
              <h2 className="text-3xl font-black text-white">المخطوطات الأسطورية</h2>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">أفضل العلوم المختارة بمعايير ملكية</p>
           </div>
        </div>

        {/* Custom Navigation */}
        <div className="flex items-center gap-3">
           <motion.button
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.9 }}
              onClick={() => scroll("right")}
              className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white transition-all shadow-xl backdrop-blur-3xl"
           >
              <ChevronRight className="h-6 w-6" />
           </motion.button>
           <motion.button
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.9 }}
              onClick={() => scroll("left")}
              className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white transition-all shadow-xl backdrop-blur-3xl"
           >
              <ChevronLeft className="h-6 w-6" />
           </motion.button>
        </div>
      </div>

      {/* --- Carousel Container --- */}
      <div className="relative group/carousel">
        {/* Magic Fades at edges */}
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0A0A0F] to-transparent z-10 pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0A0A0F] to-transparent z-10 pointer-events-none" />
        
        <div
          ref={scrollRef}
          className="flex gap-8 overflow-x-auto px-12 py-8 scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {courses.map((course, index) => (
            <motion.div 
              key={course.id} 
              className="min-w-[400px] max-w-[400px]"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <CourseCard
                {...course}
                featured={true}
                index={index}
                isProcessing={enrollingId === course.id}
                onEnroll={() => onEnroll(course.id)}
                onUnenroll={() => onUnenroll(course.id)}
              />
            </motion.div>
          ))}
        </div>
        
        {/* Floating background spark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-1/2 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      </div>
    </section>
  );
};

export default FeaturedCourses;

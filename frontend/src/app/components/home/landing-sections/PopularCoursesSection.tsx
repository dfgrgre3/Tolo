"use client";

import React, { useEffect, useState } from "react";
import { m } from "framer-motion";
import { Star, Users, Clock, BookOpen, Flame, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/api-client";
import { logger } from "@/lib/logger";
import type { CourseSummary } from "@/app/(education)/courses/_components/types";

interface PopularCoursesSectionProps {
  shouldReduceMotion: boolean;
}

export function PopularCoursesSection({ shouldReduceMotion }: PopularCoursesSectionProps) {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPopularCourses() {
      try {
        const payload = await apiClient.get<any>("/courses?limit=12");
        const data = payload?.data ?? payload;
        const coursesData = data?.courses ?? data?.items ?? data?.subjects ?? [];

        if (Array.isArray(coursesData) && coursesData.length > 0) {
          // Sort by enrolledCount or rating to get popular ones
          const mapped: CourseSummary[] = coursesData.map((course: any) => ({
            id: course.id || "",
            title: course.name || course.nameAr || "",
            description: course.description || "",
            instructor: course.instructorName || "",
            subject: course.nameAr || course.name || "",
            categoryId: course.categoryId || "",
            categoryName: course.categoryName || "",
            level: course.level || "BEGINNER",
            duration: course.durationHours || 0,
            thumbnailUrl: course.thumbnailUrl,
            price: course.price || 0,
            rating: course.rating || 0,
            enrolledCount: course.enrolledCount || course._count?.enrollments || 0,
            createdAt: course.createdAt || "",
            isFeatured: course.isFeatured || false,
            lessonsCount: course._count?.topics || course.topics?.length || 0,
            enrolled: false
          }));

          // Sort by popularity: enrolledCount desc
          const sorted = mapped.sort((a, b) => b.enrolledCount - a.enrolledCount);
          setCourses(sorted.slice(0, 3));
        } else {
          setCourses([]);
        }
      } catch (err) {
        logger.error("Failed to fetch popular courses for landing page", err);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }

    loadPopularCourses();
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion ? { duration: 0 } : { delay: i * 0.1, type: "spring" as const, stiffness: 80, damping: 15 }
    })
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case "ADVANCED":
        return "مستوى متقدم";
      case "INTERMEDIATE":
        return "مستوى متوسط";
      case "BEGINNER":
      default:
        return "مستوى مبتدئ";
    }
  };

  if (!loading && courses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-16 py-12">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-4 text-center md:text-right">
          <div className="inline-flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            <Flame className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span>انطلق في التعلم</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black leading-tight">
            الدورات التعليمية <span className="rpg-neon-text">الأكثر شيوعاً</span> 🔥
          </h2>
          <p className="text-lg text-gray-400 font-medium max-w-2xl">
            انضم إلى زملائك في أقوى الدورات والمناهج المشروحة بأحدث الأساليب التعليمية والتفاعلية.
          </p>
        </div>

        <Link href="/courses">
          <Button variant="outline" className="h-16 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 transition-all font-black text-sm group flex items-center gap-3">
            <span>كل الدورات</span>
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-2" />
          </Button>
        </Link>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 rounded-[2.5rem] bg-card/20 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {courses.map((course, idx) => (
            <m.div
              key={course.id}
              custom={idx}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={cardVariants}
              className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5 p-8 flex flex-col justify-between group hover:border-primary/50 transition-all cursor-default"
            >
              {/* Decorative top glow on hover */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div>
                {/* Header Category & Badge */}
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-black text-primary/80 bg-primary/5 border border-primary/20 px-3 py-1 rounded-lg">
                    {course.categoryName || course.subject || "منهج دراسي"}
                  </span>
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{(course.rating || 5.0).toFixed(1)}</span>
                  </div>
                </div>

                {/* Course Title */}
                <h3 className="text-2xl font-black mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>

                {/* Course Description */}
                <p className="text-gray-400 font-medium text-sm leading-relaxed mb-6 line-clamp-3">
                  {course.description || "شرح وافٍ وتدريبات شاملة لكل أجزاء الدرس مع مراجعات دورية لضمان التفوق التام."}
                </p>
              </div>

              {/* Stats Footer & Actions */}
              <div className="space-y-6 mt-auto">
                <div className="grid grid-cols-3 gap-2 border-y border-white/5 py-4 text-xs font-bold text-gray-500">
                  <div className="flex flex-col items-center gap-1">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{(course.enrolledCount || 0).toLocaleString("ar-EG")} طالب</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 border-x border-white/5">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{course.duration ? `${course.duration} س` : "مفتوح"}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <span>{course.lessonsCount || 0} مهمة</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">التكلفة</span>
                    <span className="text-xl font-black text-white">
                      {course.price === 0 ? "مجانية" : `${course.price} ج.م`}
                    </span>
                  </div>
                  
                  <Link href={`/courses/${course.id}`}>
                    <Button className="rounded-xl px-5 py-3 h-auto font-black bg-primary text-black hover:scale-105 transition-all text-xs">
                      ابدأ التعلم
                    </Button>
                  </Link>
                </div>
              </div>
            </m.div>
          ))}
        </div>
      )}
    </div>
  );
}

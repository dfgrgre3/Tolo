"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import {
  CourseCard,
  CoursesHero,
  CoursesFilter,
  CoursesLoadingSkeleton,
  CoursesEmptyState,
  FeaturedCourses,
  type CourseCardProps
} from "./components";

type Course = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  subject: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EASY" | "MEDIUM" | "HARD";
  duration: number;
  thumbnailUrl?: string;
  price: number;
  rating: number;
  enrolledCount: number;
  createdAt: string;
  tags: string[];
  enrolled: boolean;
  progress?: number;
  lessonsCount?: number;
};

type CourseCategory = {
  id: string;
  name: string;
  icon: string;
};

export default function CoursesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "rated" | "price-low" | "price-high">("newest");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/courses/categories");
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        logger.error("Error fetching categories:", error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        // If user is logged in, pass userId to get enrollment status
        const url = user?.id ? `/api/courses?userId=${user.id}` : "/api/courses";
        const res = await fetch(url);
        const data = await res.json();
        
        // Handle new API response format
        let transformedCourses: Course[] = [];
        if (data.subjects) {
          // Transform subjects to courses format for display
          transformedCourses = data.subjects.map((subject: any) => ({
            id: subject.id,
            title: subject.nameAr || subject.name,
            description: subject.description || "لا يوجد وصف متاح",
            instructor: subject.instructorName || "المنصة التعليمية",
            subject: subject.type || "General",
            level: (subject.level as any) || "MEDIUM",
            duration: subject.durationHours || 0,
            thumbnailUrl: subject.thumbnailUrl,
            price: subject.price || 0,
            rating: subject.rating || 0,
            enrolledCount: subject.enrolledCount || 0,
            createdAt: subject.createdAt || new Date().toISOString(),
            tags: [subject.nameAr || subject.name, ...(subject.tags || [])],
            enrolled: !!data.enrollments?.[subject.id],
            progress: data.enrollments?.[subject.id]?.progress || 0
          }));
        } else if (Array.isArray(data)) {
          transformedCourses = data;
        }

        setCourses(transformedCourses);
      } catch (error) {
        logger.error("Error fetching courses:", error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchCourses();
    }
  }, [user?.id, authLoading]);

  // Filter and sort courses
  const filteredCourses = useMemo(() => {
    if (!Array.isArray(courses)) return [];
    
    return courses.filter(course => {
      const matchesCategory = activeCategory === "all" || course.subject === activeCategory;
      const matchesSearch = 
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesLevel = levelFilter === "all" || course.level === levelFilter;
      return matchesCategory && matchesSearch && matchesLevel;
    });
  }, [courses, activeCategory, searchTerm, levelFilter]);

  const sortedCourses = useMemo(() => {
    return [...filteredCourses].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "popular":
          return b.enrolledCount - a.enrolledCount;
        case "rated":
          return b.rating - a.rating;
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        default:
          return 0;
      }
    });
  }, [filteredCourses, sortBy]);

  // Featured courses (top rated or most popular)
  const featuredCourses = useMemo(() => {
    return [...courses]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);
  }, [courses]);

  // Stats for hero section
  const stats = useMemo(() => ({
    totalCourses: courses.length,
    totalStudents: courses.reduce((acc, c) => acc + c.enrolledCount, 0),
    totalInstructors: new Set(courses.map(c => c.instructor)).size || 1
  }), [courses]);

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      toast.error("يرجى تسجيل الدخول للتسجيل في الدورة");
      router.push("/login?redirect=/courses");
      return;
    }
    setEnrollingId(courseId);

    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });

      if (res.ok) {
        toast.success("تم التسجيل في الدورة بنجاح");
        setCourses(courses.map(course =>
          course.id === courseId ? { ...course, enrolled: true, progress: 0 } : course
        ));
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "حدث خطأ أثناء التسجيل في الدورة");
      }
    } catch (error) {
      logger.error("Error enrolling in course:", error);
      toast.error("حدث خطأ أثناء التسجيل في الدورة");
    } finally {
      setEnrollingId(null);
    }
  };

  const handleUnenroll = async (courseId: string) => {
    if (!user) return;
    setEnrollingId(courseId);

    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });

      if (res.ok) {
        toast.success("تم إلغاء التسجيل من الدورة");
        setCourses(courses.map(course =>
          course.id === courseId ? { ...course, enrolled: false, progress: undefined } : course
        ));
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "حدث خطأ أثناء إلغاء التسجيل");
      }
    } catch (error) {
      logger.error("Error unenrolling from course:", error);
      toast.error("حدث خطأ أثناء إلغاء التسجيل");
    } finally {
      setEnrollingId(null);
    }
  };

  const resetFilters = () => {
    setActiveCategory("all");
    setSearchTerm("");
    setLevelFilter("all");
    setSortBy("newest");
  };

  return (
          <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="px-4 md:px-6 lg:px-8">
          <section className="mx-auto max-w-7xl py-8 space-y-8">
            {/* Hero Section */}
            <CoursesHero
              totalCourses={stats.totalCourses}
              totalStudents={stats.totalStudents}
              totalInstructors={stats.totalInstructors}
            />

            {/* Featured Courses */}
            {!loading && featuredCourses.length > 0 && (
              <FeaturedCourses
                courses={featuredCourses}
                onEnroll={handleEnroll}
                onUnenroll={handleUnenroll}
              />
            )}

            {/* Filters */}
            <CoursesFilter
              categories={categories}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              sortBy={sortBy}
              setSortBy={setSortBy}
              levelFilter={levelFilter}
              setLevelFilter={setLevelFilter}
              resultsCount={sortedCourses.length}
            />

            {/* Courses Grid */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CoursesLoadingSkeleton />
                </motion.div>
              ) : sortedCourses.length > 0 ? (
                <motion.div
                  key="courses"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {sortedCourses.map((course, index) => (
                    <CourseCard
                      key={course.id}
                      {...course}
                      index={index}
                      onEnroll={() => handleEnroll(course.id)}
                      onUnenroll={() => handleUnenroll(course.id)}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CoursesEmptyState
                    title="لا توجد دورات"
                    description="لم نتمكن من العثور على دورات تطابق معايير البحث. جرب تغيير الفلاتر أو البحث بكلمات مختلفة."
                    showAction={activeCategory !== "all" || searchTerm !== "" || levelFilter !== "all"}
                    onAction={resetFilters}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Load More Button - for future pagination */}
            {!loading && sortedCourses.length > 0 && sortedCourses.length >= 12 && (
              <div className="flex justify-center pt-8">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium shadow-lg hover:shadow-xl hover:border-blue-300 transition-all duration-300"
                >
                  عرض المزيد من الدورات
                </motion.button>
              </div>
            )}
          </section>
        </div>
      </div>
      );
}

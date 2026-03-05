"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookCheck, BookOpen, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import {
  CourseCard,
  CoursesEmptyState,
  CoursesFilter,
  CoursesHero,
  CoursesLoadingSkeleton,
  FeaturedCourses,
  type CourseCardProps,
} from "./components";

const PAGE_SIZE = 12;

type SortOption = "newest" | "popular" | "rated" | "price-low" | "price-high";
type CourseLevelFilter = "all" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

type Course = CourseCardProps & {
  createdAt: string;
  categoryId?: string;
  categoryName?: string;
};

type CourseCategory = {
  id: string;
  name: string;
  icon: string;
  count?: number;
};

type CoursesApiResponse = {
  courses?: Course[];
  subjects?: Course[];
  categories?: CourseCategory[];
};

function normalizeLevel(level: Course["level"]): Exclude<CourseLevelFilter, "all"> {
  switch (level) {
    case "BEGINNER":
    case "EASY":
      return "BEGINNER";
    case "ADVANCED":
    case "HARD":
    case "EXPERT":
      return "ADVANCED";
    case "INTERMEDIATE":
    case "MEDIUM":
    default:
      return "INTERMEDIATE";
  }
}

function toTimestamp(value: string): number {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function levelLabel(level: CourseLevelFilter): string {
  switch (level) {
    case "BEGINNER":
      return "مبتدئ";
    case "INTERMEDIATE":
      return "متوسط";
    case "ADVANCED":
      return "متقدم";
    default:
      return "كل المستويات";
  }
}

export default function CoursesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [levelFilter, setLevelFilter] = useState<CourseLevelFilter>("all");
  const [showEnrolledOnly, setShowEnrolledOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);

  const hasActiveFilters =
    activeCategory !== "all" ||
    searchTerm.trim() !== "" ||
    levelFilter !== "all" ||
    showEnrolledOnly;

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const controller = new AbortController();

    const fetchCourses = async () => {
      try {
        setLoading(true);
        setFetchError(null);

        const response = await fetch("/api/courses", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch courses (${response.status})`);
        }

        const data = (await response.json()) as CoursesApiResponse;
        const fetchedCourses = Array.isArray(data.courses)
          ? data.courses
          : Array.isArray(data.subjects)
            ? data.subjects
            : [];
        const fetchedCategories = Array.isArray(data.categories) ? data.categories : [];

        setCourses(fetchedCourses);
        setCategories(fetchedCategories);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        logger.error("Error fetching courses:", error);
        setCourses([]);
        setCategories([]);
        setFetchError("تعذر تحميل الدورات حالياً. حاول مرة أخرى.");
        toast.error("تعذر تحميل الدورات حالياً");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchCourses();

    return () => {
      controller.abort();
    };
  }, [authLoading, refreshKey, user?.id]);

  const filteredCourses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return courses.filter((course) => {
      if (showEnrolledOnly && !course.enrolled) {
        return false;
      }

      const matchesCategory =
        activeCategory === "all" ||
        course.categoryId === activeCategory ||
        course.subject === activeCategory;

      const matchesLevel = levelFilter === "all" || normalizeLevel(course.level) === levelFilter;

      if (!normalizedSearch) {
        return matchesCategory && matchesLevel;
      }

      const matchesSearch =
        course.title.toLowerCase().includes(normalizedSearch) ||
        course.instructor.toLowerCase().includes(normalizedSearch) ||
        course.description.toLowerCase().includes(normalizedSearch) ||
        course.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch));

      return matchesCategory && matchesSearch && matchesLevel;
    });
  }, [courses, activeCategory, searchTerm, levelFilter, showEnrolledOnly]);

  const sortedCourses = useMemo(() => {
    return [...filteredCourses].sort((left, right) => {
      switch (sortBy) {
        case "newest":
          return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
        case "popular":
          return right.enrolledCount - left.enrolledCount;
        case "rated":
          return right.rating - left.rating;
        case "price-low":
          return left.price - right.price;
        case "price-high":
          return right.price - left.price;
        default:
          return 0;
      }
    });
  }, [filteredCourses, sortBy]);

  const featuredCourses = useMemo(() => {
    const source = showEnrolledOnly ? courses.filter((course) => course.enrolled) : courses;

    return [...source]
      .sort((left, right) => {
        if (right.rating === left.rating) {
          return right.enrolledCount - left.enrolledCount;
        }
        return right.rating - left.rating;
      })
      .slice(0, 5);
  }, [courses, showEnrolledOnly]);

  const stats = useMemo(() => {
    const enrolledCoursesCount = courses.filter((course) => course.enrolled).length;
    const freeCoursesCount = courses.filter((course) => course.price === 0).length;
    const averageRating =
      courses.length > 0
        ? Number((courses.reduce((sum, course) => sum + course.rating, 0) / courses.length).toFixed(1))
        : 0;

    return {
      totalCourses: courses.length,
      totalStudents: courses.reduce((accumulator, course) => accumulator + course.enrolledCount, 0),
      totalInstructors: Math.max(1, new Set(courses.map((course) => course.instructor)).size),
      enrolledCoursesCount,
      freeCoursesCount,
      averageRating,
    };
  }, [courses]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, searchTerm, sortBy, levelFilter, showEnrolledOnly, courses.length]);

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      toast.error("يرجى تسجيل الدخول للتسجيل في الدورة");
      router.push("/login?redirect=/courses");
      return;
    }

    setEnrollingId(courseId);

    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("تم التسجيل في الدورة بنجاح");
        setCourses((previousCourses) =>
          previousCourses.map((course) =>
            course.id === courseId
              ? {
                  ...course,
                  enrolled: true,
                  progress: 0,
                  enrolledCount: course.enrolled ? course.enrolledCount : course.enrolledCount + 1,
                }
              : course
          )
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
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
    if (!user) {
      return;
    }

    setEnrollingId(courseId);

    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("تم إلغاء التسجيل من الدورة");
        setCourses((previousCourses) =>
          previousCourses.map((course) =>
            course.id === courseId
              ? {
                  ...course,
                  enrolled: false,
                  progress: undefined,
                  enrolledCount: Math.max(0, course.enrolledCount - 1),
                }
              : course
          )
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
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
    setShowEnrolledOnly(false);
    setVisibleCount(PAGE_SIZE);
  };

  const activeFilters = useMemo(() => {
    const labels: string[] = [];

    if (showEnrolledOnly) {
      labels.push("المسجل بها فقط");
    }

    if (activeCategory !== "all") {
      const categoryName = categories.find((category) => category.id === activeCategory)?.name ?? activeCategory;
      labels.push(`التصنيف: ${categoryName}`);
    }

    if (levelFilter !== "all") {
      labels.push(`المستوى: ${levelLabel(levelFilter)}`);
    }

    if (searchTerm.trim() !== "") {
      labels.push(`بحث: ${searchTerm.trim()}`);
    }

    return labels;
  }, [activeCategory, categories, levelFilter, searchTerm, showEnrolledOnly]);

  const visibleCourses = sortedCourses.slice(0, visibleCount);
  const canLoadMore = visibleCount < sortedCourses.length;
  const remainingCourses = sortedCourses.length - visibleCount;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="px-4 md:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl space-y-8 py-8">
          <CoursesHero
            totalCourses={stats.totalCourses}
            totalStudents={stats.totalStudents}
            totalInstructors={stats.totalInstructors}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-300">
                <BookCheck className="h-4 w-4 text-blue-500" />
                <p className="text-sm font-medium">الدورات المسجّل بها</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.enrolledCoursesCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-300">
                <BookOpen className="h-4 w-4 text-emerald-500" />
                <p className="text-sm font-medium">الدورات المجانية</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.freeCoursesCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-300">
                <Star className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-medium">متوسط التقييم</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.averageRating.toFixed(1)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowEnrolledOnly(false)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                !showEnrolledOnly
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              كل الدورات ({courses.length})
            </button>
            <button
              onClick={() => setShowEnrolledOnly(true)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                showEnrolledOnly
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              المسجّل بها فقط ({stats.enrolledCoursesCount})
            </button>
          </div>

          {!loading && featuredCourses.length > 0 && (
            <FeaturedCourses
              courses={featuredCourses}
              onEnroll={handleEnroll}
              onUnenroll={handleUnenroll}
              enrollingId={enrollingId}
            />
          )}

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
            hasActiveFilters={hasActiveFilters}
            onResetFilters={resetFilters}
          />

          {hasActiveFilters && activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-800/70">
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                >
                  {filter}
                </span>
              ))}
              <button
                onClick={resetFilters}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-slate-600 dark:text-slate-200"
              >
                مسح الفلاتر
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CoursesLoadingSkeleton />
              </motion.div>
            ) : fetchError && courses.length === 0 ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CoursesEmptyState
                  title="تعذر تحميل الدورات"
                  description={fetchError}
                  showAction={true}
                  onAction={() => setRefreshKey((prev) => prev + 1)}
                  actionLabel="إعادة المحاولة"
                />
              </motion.div>
            ) : sortedCourses.length > 0 ? (
              <motion.div
                key="courses"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                {visibleCourses.map((course, index) => (
                  <CourseCard
                    key={course.id}
                    {...course}
                    index={index}
                    isProcessing={enrollingId === course.id}
                    onEnroll={() => handleEnroll(course.id)}
                    onUnenroll={() => handleUnenroll(course.id)}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CoursesEmptyState
                  title={showEnrolledOnly ? "لا توجد دورات مسجّل بها" : "لا توجد دورات مطابقة"}
                  description={
                    showEnrolledOnly
                      ? "لم تقم بالتسجيل في أي دورة بعد. استعرض الدورات المتاحة وابدأ بالتعلم الآن."
                      : "لم نتمكن من العثور على دورات تطابق معايير البحث. غيّر الفلاتر أو جرّب كلمات مختلفة."
                  }
                  showAction={hasActiveFilters}
                  onAction={resetFilters}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && canLoadMore && (
            <div className="flex justify-center pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setVisibleCount((previous) => Math.min(previous + PAGE_SIZE, sortedCourses.length))}
                className="rounded-2xl border border-slate-200 bg-white px-8 py-3 font-medium text-slate-700 shadow-lg transition-all duration-300 hover:border-blue-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {`عرض المزيد من الدورات (${Math.min(PAGE_SIZE, remainingCourses)})`}
              </motion.button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

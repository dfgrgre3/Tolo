"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookCheck,
  BookOpen,
  Sparkles,
  LayoutGrid,
  Users,
  Star,
  TrendingUp,
  Clock,
  Heart,
  Share2,
  Download,
  GraduationCap,
  Loader2,
  ChevronDown,
  Zap,
  BarChart3,
  ArrowDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

type SortOption = "newest" | "popular" | "rated" | "price-low" | "price-high" | "duration-short" | "duration-long";
type CourseLevelFilter = "all" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

type Course = CourseCardProps & {
  createdAt: string;
  categoryId?: string;
  categoryName?: string;
  duration: number;
  enrolledCount: number;
  rating: number;
  price: number;
  tags: string[];
  lessonsCount?: number;
  isWishlisted?: boolean;
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

export default function CoursesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user, isLoading: authLoading, fetchWithAuth } = useAuth();
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
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  const resetFilters = () => {
    setActiveCategory("all");
    setSearchTerm("");
    setSortBy("newest");
    setLevelFilter("all");
    setShowEnrolledOnly(false);
    setVisibleCount(PAGE_SIZE);
  };

  const hasActiveFilters =
    activeCategory !== "all" ||
    searchTerm.trim() !== "" ||
    levelFilter !== "all" ||
    showEnrolledOnly;

  useEffect(() => {
    if (authLoading) return;

    const controller = new AbortController();

    const fetchCourses = async () => {
      try {
        setLoading(true);
        setFetchError(null);

        const response = await fetchWithAuth("/api/courses", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`Failed to fetch courses (${response.status})`);

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
        if (controller.signal.aborted) return;
        logger.error("Error fetching courses:", error);

        let errorMessage = "تعذر تحميل الدورات حالياً.";
        let toastMessage = "تعذر تحميل الدورات";

        if (error instanceof TypeError && error.message.includes('fetch')) {
          errorMessage = "لا يمكن الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.";
          toastMessage = "مشكلة في الاتصال بالخادم";
        } else if (error instanceof Error && error.message.includes('500')) {
          errorMessage = "حدث خطأ داخلي في الخادم.";
          toastMessage = "خطأ داخلي في الخادم";
        } else if (error instanceof Error && error.message.includes('403')) {
          errorMessage = "غير مصرح لك بالوصول إلى هذه البيانات.";
          toastMessage = "وصول محظور";
        }

        setCourses([]);
        setCategories([]);
        setFetchError(errorMessage);
        toast.error(toastMessage);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchCourses();
    return () => controller.abort();
  }, [authLoading, refreshKey, user?.id, fetchWithAuth]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, searchTerm, sortBy, levelFilter, showEnrolledOnly]);

  const filteredCourses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return courses.filter((course) => {
      if (showEnrolledOnly && !course.enrolled) return false;

      const matchesCategory =
        activeCategory === "all" ||
        course.categoryId === activeCategory ||
        course.subject === activeCategory;

      const matchesLevel = levelFilter === "all" || normalizeLevel(course.level) === levelFilter;

      if (!normalizedSearch) return matchesCategory && matchesLevel;

      const matchesSearch =
        course.title.toLowerCase().includes(normalizedSearch) ||
        course.instructor.toLowerCase().includes(normalizedSearch) ||
        course.description.toLowerCase().includes(normalizedSearch) ||
        course.tags.some(tag => tag.toLowerCase().includes(normalizedSearch));

      return matchesCategory && matchesSearch && matchesLevel;
    });
  }, [courses, activeCategory, searchTerm, levelFilter, showEnrolledOnly]);

  const sortedCourses = useMemo(() => {
    return [...filteredCourses].sort((left, right) => {
      switch (sortBy) {
        case "newest":
          return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
        case "popular":
          return (right.enrolledCount || 0) - (left.enrolledCount || 0);
        case "rated":
          return (right.rating || 0) - (left.rating || 0);
        case "price-low":
          return (left.price || 0) - (right.price || 0);
        case "price-high":
          return (right.price || 0) - (left.price || 0);
        case "duration-short":
          return (left.duration || 0) - (right.duration || 0);
        case "duration-long":
          return (right.duration || 0) - (left.duration || 0);
        default:
          return 0;
      }
    });
  }, [filteredCourses, sortBy]);

  const featuredCourses = useMemo(() => {
    const source = showEnrolledOnly ? courses.filter((course) => course.enrolled) : courses;
    return [...source]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);
  }, [courses, showEnrolledOnly]);

  const stats = useMemo(() => {
    const enrolledCoursesCount = courses.filter((course) => course.enrolled).length;
    const freeCoursesCount = courses.filter((course) => (course.price || 0) === 0).length;
    const totalLessons = courses.reduce((acc, course) => acc + (course.lessonsCount || 0), 0);
    const avgRating = courses.length > 0
      ? courses.reduce((sum, course) => sum + (course.rating || 0), 0) / courses.length
      : 0;

    return {
      totalCourses: courses.length,
      totalStudents: courses.reduce((acc, course) => acc + (course.enrolledCount || 0), 0),
      enrolledCoursesCount,
      freeCoursesCount,
      totalInstructors: new Set(courses.map(c => c.instructor)).size,
      totalLessons,
      avgRating: parseFloat(avgRating.toFixed(1)),
    };
  }, [courses]);

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      toast.error("يرجى تسجيل الدخول أولاً");
      router.push("/login?redirect=/courses");
      return;
    }
    setEnrollingId(courseId);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.requiresPayment) {
          router.push(`/courses/${courseId}/checkout`);
          return;
        }
        toast.success("تم التسجيل في الدورة بنجاح!");
        setRefreshKey(k => k + 1);
      } else {
        toast.error("فشل التسجيل");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء التسجيل");
    } finally {
      setEnrollingId(null);
    }
  };

  const handleUnenroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "DELETE" });
      if (res.ok) {
        toast.success("تم إلغاء التسجيل");
        setRefreshKey(k => k + 1);
      }
    } finally {
      setEnrollingId(null);
    }
  };

  const toggleWishlist = (courseId: string) => {
    setWishlistIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const visibleCourses = sortedCourses.slice(0, visibleCount);
  const canLoadMore = visibleCount < sortedCourses.length;

  if (loading) return <CoursesLoadingSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0D14]" dir="rtl">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/[0.02] blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/[0.02] blur-[130px] rounded-full" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        {/* Hero Section */}
        <CoursesHero
          totalCourses={stats.totalCourses}
          totalStudents={stats.totalStudents}
          totalInstructors={stats.totalInstructors}
          avgRating={stats.avgRating}
        />

        {/* Quick Stats - compact row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "إجمالي الدورات", val: stats.totalCourses, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "إجمالي الطلاب", val: stats.totalStudents, icon: Users, color: "text-violet-500", bg: "bg-violet-500/10" },
            { label: "دوراتك النشطة", val: stats.enrolledCoursesCount, icon: BookCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "دورات مجانية", val: stats.freeCoursesCount, icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10" },
            { label: "متوسط التقييم", val: stats.avgRating, icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-4 transition-all hover:border-gray-300 dark:hover:border-white/10"
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate">{stat.label}</p>
                <p className="text-xl font-black text-gray-900 dark:text-white" suppressHydrationWarning>
                  {typeof stat.val === 'number' && stat.val >= 1000
                    ? `${(stat.val / 1000).toFixed(1)}K`
                    : stat.val}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Featured Courses */}
        {!loading && featuredCourses.length > 0 && (
          <FeaturedCourses
            courses={featuredCourses}
            onEnroll={handleEnroll}
            onUnenroll={handleUnenroll}
            enrollingId={enrollingId}
          />
        )}

        {/* Main Content */}
        <div className="space-y-8">
          {/* Tab Switcher */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 p-1 rounded-xl bg-gray-100 dark:bg-white/5">
              <button
                onClick={() => setShowEnrolledOnly(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all",
                  !showEnrolledOnly
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                <span>جميع الدورات</span>
              </button>
              <button
                onClick={() => setShowEnrolledOnly(true)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all",
                  showEnrolledOnly
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                <BookCheck className="h-4 w-4" />
                <span>دوراتي</span>
                {stats.enrolledCoursesCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                    {stats.enrolledCoursesCount}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>محدثة باستمرار</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/80 text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors"
                  onClick={() => window.print()}
                  title="تصدير"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/80 text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors"
                  onClick={() =>
                    navigator.share
                      ? navigator.share({
                          title: "Thanawy - الدورات التعليمية",
                          text: "اكتشف مسارات التعلم المختلفة على منصة Thanawy",
                          url: window.location.href,
                        })
                      : null
                  }
                  title="مشاركة"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

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
            hasActiveFilters={hasActiveFilters}
            onResetFilters={resetFilters}
          />

          {/* Results info */}
          {sortedCourses.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                عرض <span className="font-bold text-gray-700 dark:text-white">{Math.min(visibleCount, sortedCourses.length)}</span> من{" "}
                <span className="font-bold text-gray-700 dark:text-white">{sortedCourses.length}</span> دورة
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  إزالة جميع الفلاتر
                </button>
              )}
            </div>
          )}

          {/* Course Grid */}
          {sortedCourses.length === 0 && !loading ? (
            <CoursesEmptyState />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {visibleCourses.map((course, index) => (
                    <CourseCard
                      key={course.id}
                      {...course}
                      index={index}
                      isProcessing={enrollingId === course.id}
                      isWishlisted={wishlistIds.has(course.id)}
                      onEnroll={() => handleEnroll(course.id)}
                      onUnenroll={() => handleUnenroll(course.id)}
                      onWishlistToggle={() => toggleWishlist(course.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Load More */}
              {canLoadMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                    variant="outline"
                    className="gap-2 rounded-xl border-gray-200 dark:border-white/10 px-8 py-3 text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <ArrowDown className="h-4 w-4" />
                    <span>عرض المزيد ({sortedCourses.length - visibleCount} دورة متبقية)</span>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

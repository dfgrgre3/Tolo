"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  ArrowUpRight,
  BookCheck, 
  BookOpen, 
  FilterX,
  Sparkles, 
  LayoutGrid, 
  Users,
  Star
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
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

const STYLES = {
  glass: "relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 sensitive:bg-black/60 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-6 transition-all",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
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

function sortLabel(sortBy: SortOption): string {
  switch (sortBy) {
    case "popular":
      return "الأكثر طلبًا";
    case "rated":
      return "الأعلى تقييمًا";
    case "price-low":
      return "السعر الأقل";
    case "price-high":
      return "السعر الأعلى";
    case "newest":
    default:
      return "الأحدث";
  }
}

export default function CoursesPage() {
  const { user, isLoading: authLoading, fetchWithAuth } = useAuth(); // Get fetchWithAuth from auth context
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

        // Use fetchWithAuth instead of regular fetch to handle authentication
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
        
        // Determine more specific error message based on error type
        let errorMessage = "تعذر تحميل الأرشيف حالياً.";
        let toastMessage = "تعذر تحميل الأرشيف حالياً";
        
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
  }, [authLoading, refreshKey, user?.id, fetchWithAuth]); // Add fetchWithAuth to dependencies

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
        course.description.toLowerCase().includes(normalizedSearch);

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
    return {
      totalCourses: courses.length,
      totalStudents: courses.reduce((acc, course) => acc + (course.enrolledCount || 0), 0),
      enrolledCoursesCount,
      freeCoursesCount,
      totalInstructors: new Set(courses.map(c => c.instructor)).size,
    };
  }, [courses]);

  const activeCategoryLabel = useMemo(() => {
    if (activeCategory === "all") {
      return "كل التخصصات";
    }

    return categories.find((category) => category.id === activeCategory)?.name || "تخصص محدد";
  }, [activeCategory, categories]);

  const activeSignals = useMemo(
    () => [
      `الترتيب: ${sortLabel(sortBy)}`,
      `المستوى: ${levelLabel(levelFilter)}`,
      `النطاق: ${showEnrolledOnly ? "المسجل فيها فقط" : "جميع الدورات"}`,
      `التصنيف: ${activeCategoryLabel}`,
    ],
    [sortBy, levelFilter, showEnrolledOnly, activeCategoryLabel]
  );

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
        toast.success("تم الانضمام للرحلة بنجاح");
        setRefreshKey(k => k + 1);
      } else {
        toast.error("فشل الانضمام");
      }
    } finally {
      setEnrollingId(null);
    }
  };

  const handleUnenroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "DELETE" });
      if (res.ok) {
        toast.success("تم فك الارتباط");
        setRefreshKey(k => k + 1);
      }
    } finally {
      setEnrollingId(null);
    }
  };

  const visibleCourses = sortedCourses.slice(0, visibleCount);
  const canLoadMore = visibleCount < sortedCourses.length;

  return (
    <div className="min-h-screen bg-background text-gray-100 overflow-hidden" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        
        <CoursesHero
          totalCourses={stats.totalCourses}
          totalStudents={stats.totalStudents}
          totalInstructors={stats.totalInstructors}
        />

        {/* --- Stats Dashboard --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {[
             { label: "مخطوطة متاحة", val: stats.totalCourses, icon: BookOpen, color: "text-blue-400" },
             { label: "محارب مسجل", val: stats.totalStudents, icon: Users, color: "text-purple-400" },
             { label: "مخطوطاتك النشطة", val: stats.enrolledCoursesCount, icon: BookCheck, color: "text-emerald-400" },
             { label: "معرفة مجانية", val: stats.freeCoursesCount, icon: Sparkles, color: "text-amber-400" },
           ].map((stat, i) => (
             <motion.div
               key={i}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 }}
               className={STYLES.glass + " p-6 group cursor-default"}
             >
                <div className="flex items-start justify-between">
                   <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 ${stat.color} group-hover:scale-110 transition-transform`}>
                      <stat.icon className="h-6 w-6" />
                   </div>
                   <span className="text-white/5 font-black text-4xl">0{i+1}</span>
                </div>
                <div className="mt-8 space-y-1">
                   <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{stat.label}</p>
                   <p className="text-3xl font-black">{stat.val.toLocaleString()}</p>
                </div>
             </motion.div>
           ))}
        </div>

        {/* --- Featured Highlights --- */}
        {!loading && featuredCourses.length > 0 && (
          <FeaturedCourses
            courses={featuredCourses}
            onEnroll={handleEnroll}
            onUnenroll={handleUnenroll}
            enrollingId={enrollingId}
          />
        ) || loading && <CoursesLoadingSkeleton />}

        {/* --- Main Repository --- */}
        <div className="space-y-10">
           <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/5 pb-8">
              <div className="flex items-center gap-6">
                 <button
                   onClick={() => setShowEnrolledOnly(false)}
                   className={`relative h-14 px-8 flex items-center gap-3 font-black transition-all rounded-2xl ${!showEnrolledOnly ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
                 >
                    <LayoutGrid className="h-5 w-5" />
                    <span>جميع العوالم</span>
                 </button>
                 <button
                   onClick={() => setShowEnrolledOnly(true)}
                   className={`relative h-14 px-8 flex items-center gap-3 font-black transition-all rounded-2xl ${showEnrolledOnly ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
                 >
                    <BookCheck className="h-5 w-5" />
                    <span>عوالمي الخاصة</span>
                 </button>
              </div>
           </div>

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

           <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
             <motion.div
               initial={{ opacity: 0, y: 16 }}
               animate={{ opacity: 1, y: 0 }}
               className={STYLES.glass + " p-6"}
             >
               <div className="flex items-start justify-between gap-4">
                 <div className="space-y-2">
                   <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">
                     غرفة الاستكشاف
                   </p>
                   <h2 className="text-2xl font-black text-white">
                     {sortedCourses.length.toLocaleString()} دورة جاهزة للمراجعة
                   </h2>
                   <p className="max-w-2xl text-sm leading-7 text-gray-400">
                     اعرض النتائج حسب المستوى والسعر والتخصص، ثم انتقل مباشرة إلى الدورة أو استكمل رحلتك التعليمية الحالية.
                   </p>
                 </div>
                 <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                   <ArrowUpRight className="h-5 w-5 text-primary" />
                 </div>
               </div>

               <div className="mt-6 flex flex-wrap gap-2">
                 {activeSignals.map((signal) => (
                   <span
                     key={signal}
                     className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-gray-300"
                   >
                     {signal}
                   </span>
                 ))}
               </div>
             </motion.div>

             <motion.div
               initial={{ opacity: 0, y: 16 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.05 }}
               className={STYLES.glass + " p-6"}
             >
               <div className="flex items-center justify-between gap-3">
                 <div>
                   <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">
                     مؤشرات سريعة
                   </p>
                   <h3 className="mt-2 text-xl font-black text-white">ملخص النتائج الحالية</h3>
                 </div>
                 {hasActiveFilters && (
                   <Button
                     variant="ghost"
                     onClick={resetFilters}
                     className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                   >
                     <FilterX className="ml-2 h-4 w-4" />
                     تصفير
                   </Button>
                 )}
               </div>

               <div className="mt-6 grid grid-cols-3 gap-3">
                 <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                   <p className="text-[11px] font-bold text-gray-500">النتائج</p>
                   <p className="mt-2 text-2xl font-black text-white">{sortedCourses.length}</p>
                 </div>
                 <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                   <p className="text-[11px] font-bold text-gray-500">المميزة</p>
                   <p className="mt-2 text-2xl font-black text-white">{featuredCourses.length}</p>
                 </div>
                 <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                   <p className="text-[11px] font-bold text-gray-500">المجانية</p>
                   <p className="mt-2 text-2xl font-black text-white">
                     {sortedCourses.filter((course) => (course.price || 0) === 0).length}
                   </p>
                 </div>
               </div>
             </motion.div>
           </div>

           <div className="min-h-[600px]">
              <AnimatePresence mode="wait">
                 {loading ? (
                    <CoursesLoadingSkeleton key="load" />
                 ) : sortedCourses.length > 0 ? (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
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
                 ) : fetchError ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={STYLES.glass + " flex min-h-[420px] flex-col items-center justify-center gap-5 px-6 text-center"}
                    >
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
                        <Star className="h-8 w-8 text-red-400" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white">تعذر تحميل الدورات</h3>
                        <p className="mx-auto max-w-xl text-sm leading-7 text-gray-400">{fetchError}</p>
                      </div>
                      <Button
                        onClick={() => setRefreshKey((k) => k + 1)}
                        className="h-12 rounded-2xl px-8 font-black"
                      >
                        إعادة المحاولة
                      </Button>
                    </motion.div>
                 ) : (
                    <CoursesEmptyState key="empty" onAction={resetFilters} />
                 )}
              </AnimatePresence>
           </div>

           {canLoadMore && (
             <div className="flex justify-center pt-8">
                <Button 
                   onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                   className="h-16 px-16 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black rounded-2xl gap-3 transition-all active:scale-95"
                >
                   <span>استكشاف المزيد من العوالم</span>
                   <Sparkles className="h-5 w-5 text-primary" />
                </Button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

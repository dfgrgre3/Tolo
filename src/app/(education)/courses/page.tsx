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
  Star,
  TrendingUp,
  Award,
  Clock,
  Heart,
  Share2,
  Download,
  BookMarked,
  GraduationCap
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
    case "duration-short":
      return "الأقصر مدة";
    case "duration-long":
      return "الأطول مدة";
    case "newest":
    default:
      return "الأحدث";
  }
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
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
          avgRating={stats.avgRating}
        />

        {/* --- Stats Dashboard --- */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
           {[
             { label: "مخطوطة متاحة", val: stats.totalCourses, icon: BookOpen, color: "text-blue-400" },
             { label: "محارب مسجل", val: stats.totalStudents, icon: Users, color: "text-purple-400" },
             { label: "مخطوطاتك النشطة", val: stats.enrolledCoursesCount, icon: BookCheck, color: "text-emerald-400" },
             { label: "معرفة مجانية", val: stats.freeCoursesCount, icon: Sparkles, color: "text-amber-400" },
             { label: "معدل التقييم", val: stats.avgRating, icon: Star, color: "text-yellow-400" },
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
                   <p className="text-3xl font-black">
                     {typeof stat.val === 'number' && stat.val >= 1000 
                       ? `${(stat.val / 1000).toFixed(1)}K` 
                       : stat.val}
                   </p>
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
              
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                  <TrendingUp className="h-4 w-4" />
                  <span>محدثة باستمرار</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="h-10 w-10 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                    onClick={() => window.print()}
                    title="طباعة"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button 
                    className="h-10 w-10 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                    onClick={() => navigator.share ? navigator.share({
                      title: 'Thanawy - منصة التعلم',
                      text: 'اكتشف مسارات التعلم المختلفة على منصة Thanawy',
                      url: window.location.href
                    }) : null}
                    title="مشاركة"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
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

           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {sortedCourses.map((course, index) => (
               <motion.div
                 key={course.id}
                 initial={{ opacity: 0, y: 16 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: index * 0.1 }}
                 className="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
               >
                 <div className="p-6">
                   <div className="flex items-center justify-between">
                     <div className="space-y-2">
                       <p className="text-sm text-gray-500 dark:text-gray-400">
                         غرفة الاستكشاف
                       </p>
                       <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                         {course.title}
                       </h2>
                       <p className="max-w-2xl text-sm leading-7 text-gray-400">
                         {course.description}
                       </p>
                     </div>
                     <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                       <ArrowUpRight className="h-5 w-5 text-primary" />
                     </div>
                   </div>

                   <div className="mt-6 flex flex-wrap gap-2">
                     {course.tags.map((tag) => (
                       <span
                         key={tag}
                         className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-gray-300"
                       >
                         {tag}
                       </span>
                     ))}
                   </div>
                 </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase tracking-tighter">
                        الحالة الاستثمارية
                      </p>
                      <h3 className="text-xl font-black text-primary" suppressHydrationWarning>
                        {course.price === 0 ? "مجاناً" : `${course.price} ج.م`}
                      </h3>
                    </div>
                   <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                       <Clock className="h-4 w-4 text-gray-400" />
                       <span className="text-sm text-gray-400">
                         {course.duration} دقيقة
                       </span>
                     </div>
                     <div className="flex items-center gap-2">
                       <Heart className="h-4 w-4 text-gray-400" />
                       <span className="text-sm text-gray-400">
                         {course.enrolledCount} مسجل
                       </span>
                     </div>
                     <div className="flex items-center gap-2">
                       <Star className="h-4 w-4 text-gray-400" />
                       <span className="text-sm text-gray-400">
                         {course.rating} نجمة
                       </span>
                     </div>
                   </div>
                 </div>
               </motion.div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}

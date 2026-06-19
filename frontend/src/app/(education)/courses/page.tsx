"use client";

import { useDeferredValue, useEffect, useMemo, useState, useCallback } from "react";
import { BookOpen, Search, Sparkles, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { apiClient } from "@/lib/api/api-client";
import { addSearchQuery } from "@/lib/search-history";
import { sortCourses } from "./_components/utils";
import { CatalogStats } from "./_components/catalog-stats";
import { SpotlightCourses } from "./_components/spotlight-courses";
import { CoursesControls } from "./_components/courses-controls";
import { CoursesList } from "./_components/courses-list";
import type { CourseLevel, CourseSummary, CourseCategory, SortOption } from "./_components/types";

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | CourseLevel>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [enrolledOnly, setEnrolledOnly] = useState(false);

  const deferredSearch = useDeferredValue(searchQuery);

  // Save search queries to localStorage for dashboard suggestions
  const debouncedSaveSearch = useCallback(
    (() => {
      let timeout: ReturnType<typeof setTimeout>;
      return (query: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          if (query.trim()) addSearchQuery(query);
        }, 1000);
      };
    })(),
    []
  );

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        const [coursesResult, categoriesResult] = await Promise.allSettled([
          apiClient.get<any>("/courses?limit=48"),
          apiClient.get<any>("/categories"),
        ]);

        let coursesData: any[] = [];
        if (coursesResult.status === "fulfilled") {
          const payload = coursesResult.value;
          const data = payload.data ?? payload;
          coursesData = data.courses ?? data.items ?? data.subjects ?? [];
        } else {
          logger.error("Failed to load courses", coursesResult.reason);
        }

        let categoriesData: Array<{ id: string; name: string; nameAr?: string }> = [];
        if (categoriesResult.status === "fulfilled") {
          const payload = categoriesResult.value;
          const data = payload.data ?? payload;
          if (Array.isArray(data)) {
            categoriesData = data;
          } else if (Array.isArray(data.categories)) {
            categoriesData = data.categories;
          }
        } else {
          logger.error("Failed to load categories", categoriesResult.reason);
        }

        const categoryMap = new Map<string, string>();
        for (const cat of categoriesData) {
          categoryMap.set(cat.id, cat.nameAr || cat.name || "");
        }

        const mappedCourses: CourseSummary[] = coursesData.map((course: any) => ({
          id: course.id || "",
          title: course.name || course.nameAr || "",
          description: course.description || "",
          instructor: course.instructorName || "",
          subject: course.nameAr || course.name || "",
          categoryId: course.categoryId || "",
          categoryName: categoryMap.get(course.categoryId) || "",
          level: (course.level as CourseLevel) || "BEGINNER",
          duration: course.durationHours || 0,
          thumbnailUrl: course.thumbnailUrl,
          price: course.price || 0,
          rating: course.rating || 0,
          enrolledCount: course.enrolledCount || course._count?.enrollments || 0,
          createdAt: course.createdAt || "",
          tags: course.tags || [],
          enrolled: false,
          progress: undefined,
          isFeatured: course.isFeatured || false,
          lessonsCount: course._count?.topics || course.topics?.length || 0,
        }));

        setCourses(mappedCourses);
        setCategories(
          categoriesData.map((cat) => ({
            id: cat.id,
            name: cat.nameAr || cat.name || "",
          }))
        );

        if (coursesResult.status === "rejected" && categoriesResult.status === "rejected") {
          throw new Error("تعذر تحميل الدورات التعليمية.");
        }
      } catch (loadError) {
        logger.error("Error loading courses catalog", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "حدث خطأ أثناء تحميل الدورات."
        );
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  const catalogStats = useMemo(() => {
    const totalStudents = courses.reduce(
      (sum, course) => sum + (course.enrolledCount || 0),
      0
    );
    const totalLessons = courses.reduce(
      (sum, course) => sum + (course.lessonsCount || 0),
      0
    );
    const freeCourses = courses.filter((course) => course.price === 0).length;
    const avgRating =
      courses.length > 0
        ? courses.reduce((sum, course) => sum + (course.rating || 0), 0) / courses.length
        : 0;

    return {
      totalCourses: courses.length,
      totalStudents,
      totalLessons,
      freeCourses,
      avgRating,
    };
  }, [courses]);

  const computedCategories = useMemo(() => {
    const counts = new Map<string, number>();

    for (const course of courses) {
      counts.set(course.categoryId, (counts.get(course.categoryId) ?? 0) + 1);
    }

    return categories.map((category) => ({
      ...category,
      count: counts.get(category.id) ?? 0,
    }));
  }, [categories, courses]);

  const filteredCourses = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    const base = courses.filter((course) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          course.title,
          course.description,
          course.instructor,
          course.categoryName,
          (course.tags || []).join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesCategory =
        selectedCategory === "ALL" || course.categoryId === selectedCategory;
      const matchesLevel =
        selectedLevel === "ALL" || course.level === selectedLevel;
      const matchesFeatured = !featuredOnly || course.isFeatured;
      const matchesEnrolled = !enrolledOnly || course.enrolled;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesLevel &&
        matchesFeatured &&
        matchesEnrolled
      );
    });

    return sortCourses(base, sortBy);
  }, [
    courses,
    deferredSearch,
    enrolledOnly,
    featuredOnly,
    selectedCategory,
    selectedLevel,
    sortBy,
  ]);

  const spotlightCourses = useMemo(() => {
    const featuredCourses = courses.filter((course) => course.isFeatured);
    if (featuredCourses.length > 0) {
      return sortCourses(featuredCourses, "rated").slice(0, 3);
    }

    return sortCourses(courses, "popular").slice(0, 3);
  }, [courses]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategory !== "ALL" ||
    selectedLevel !== "ALL" ||
    featuredOnly ||
    enrolledOnly ||
    sortBy !== "newest";

  return (
    <div className="min-h-screen bg-[#fffdf9] text-slate-900 dark:bg-[#09090b] dark:text-white" dir="rtl">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-[-12%] top-[-10%] h-[420px] w-[420px] rounded-full bg-orange-500/12 blur-[120px]" />
        <div className="absolute left-[-8%] top-[18%] h-[320px] w-[320px] rounded-full bg-sky-500/12 blur-[110px]" />
        <div className="absolute bottom-[-12%] left-[20%] h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-[130px]" />
      </div>

      <main className="relative mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[36px] border border-slate-200/80 bg-white/90 px-6 py-8 shadow-[0_30px_80px_rgba(15,23,42,0.07)] backdrop-blur sm:px-8 lg:px-10 lg:py-10 dark:border-white/10 dark:bg-slate-950/80 dark:shadow-none">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-7">
              <Badge className="rounded-full border-0 bg-orange-500/10 px-4 py-2 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                <Sparkles className="ml-2 h-4 w-4" />
                منصة دورات تعليمية متكاملة للمرحلة الثانوية
              </Badge>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                  اكتشف دورات تصنع
                  <span className="block bg-gradient-to-l from-orange-500 via-amber-500 to-sky-500 bg-clip-text text-transparent">
                    تجربة تعلّم حقيقية وليست مجرد فيديو
                  </span>
                </h1>

                <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                  ابحث عن الدورة المناسبة لك، راقب تقدّمك، وانتقل مباشرة إلى
                  بيئة تعلّم احترافية بمشغل فيديو متطور ومتكامل مع الدروس
                  والملاحظات والمرفقات.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        debouncedSaveSearch(event.target.value);
                      }}
                      placeholder="ابحث باسم الدورة أو المدرس أو المادة"
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50 pr-11 text-base dark:border-white/10 dark:bg-white/5"
                    />
                </div>

                <Button
                  type="button"
                  variant={featuredOnly ? "default" : "outline"}
                  className={cn(
                    "h-14 rounded-2xl px-6",
                    featuredOnly
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  )}
                  onClick={() => setFeaturedOnly((current) => !current)}
                >
                  <Trophy className="ml-2 h-4 w-4" />
                  الدورات المميزة
                </Button>

                <Button
                  type="button"
                  variant={enrolledOnly ? "default" : "outline"}
                  className={cn(
                    "h-14 rounded-2xl px-6",
                    enrolledOnly
                      ? "bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                      : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  )}
                  onClick={() => setEnrolledOnly((current) => !current)}
                >
                  <BookOpen className="ml-2 h-4 w-4" />
                  دوراتي فقط
                </Button>
              </div>
            </div>

            <CatalogStats stats={catalogStats} />
          </div>
        </section>

        <section className="mt-10 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-orange-600 dark:text-orange-300">
                استكشاف المواد
              </p>
              <h2 className="text-2xl font-black">تصفّح حسب التخصص</h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={cn(
                "rounded-full px-5 py-3 text-sm font-bold transition-all",
                selectedCategory === "ALL"
                  ? "bg-slate-950 text-white dark:bg-orange-500"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              )}
            >
              كل المواد
            </button>

            {computedCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "rounded-full px-5 py-3 text-sm font-bold transition-all",
                  selectedCategory === category.id
                    ? "bg-slate-950 text-white dark:bg-orange-500"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                )}
              >
                {category.name}
                <span className="mr-2 text-xs opacity-70">
                  ({(category.count || 0).toLocaleString("ar-EG")})
                </span>
              </button>
            ))}
          </div>
        </section>

        <SpotlightCourses courses={spotlightCourses} />

        <CoursesControls
          sortBy={sortBy}
          onSortChange={setSortBy}
          selectedLevel={selectedLevel}
          onLevelChange={setSelectedLevel}
          hasActiveFilters={hasActiveFilters}
          onReset={() => {
            setSearchQuery("");
            setSelectedCategory("ALL");
            setSelectedLevel("ALL");
            setSortBy("newest");
            setFeaturedOnly(false);
            setEnrolledOnly(false);
          }}
        />

        <section className="mt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
                نتائج البحث
              </p>
              <h2 className="text-3xl font-black">كل الدورات التعليمية</h2>
            </div>

            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {filteredCourses.length.toLocaleString("ar-EG")} دورة مطابقة
            </div>
          </div>

          <CoursesList
            loading={loading}
            error={error}
            filteredCourses={filteredCourses}
          />
        </section>
      </main>
    </div>
  );
}

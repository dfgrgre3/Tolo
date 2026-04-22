"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  GraduationCap,
  Layers3,
  PlayCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
type SortOption =
  | "newest"
  | "popular"
  | "rated"
  | "price-low"
  | "price-high"
  | "duration-short"
  | "duration-long";

type CourseSummary = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  subject: string;
  categoryId: string;
  categoryName: string;
  level: CourseLevel;
  duration: number;
  thumbnailUrl?: string;
  price: number;
  rating: number;
  enrolledCount: number;
  createdAt: string;
  tags: string[];
  enrolled: boolean;
  progress?: number;
  isFeatured: boolean;
  lessonsCount: number;
};

type CourseCategory = {
  id: string;
  name: string;
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "الأحدث" },
  { value: "popular", label: "الأكثر طلبًا" },
  { value: "rated", label: "الأعلى تقييمًا" },
  { value: "price-low", label: "السعر من الأقل" },
  { value: "price-high", label: "السعر من الأعلى" },
  { value: "duration-short", label: "المدة الأقصر" },
  { value: "duration-long", label: "المدة الأطول" },
];

const LEVEL_OPTIONS: { value: "ALL" | CourseLevel; label: string }[] = [
  { value: "ALL", label: "كل المستويات" },
  { value: "BEGINNER", label: "مبتدئ" },
  { value: "INTERMEDIATE", label: "متوسط" },
  { value: "ADVANCED", label: "متقدم" },
];

const levelMap: Record<CourseLevel, { label: string; className: string }> = {
  BEGINNER: {
    label: "مبتدئ",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  INTERMEDIATE: {
    label: "متوسط",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  ADVANCED: {
    label: "متقدم",
    className: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
};

function formatPrice(price: number) {
  return price === 0 ? "مجانية" : `${price.toLocaleString("ar-EG")} ج.م`;
}

function formatHours(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return "ساعة واحدة";
  }

  if (duration === 1) {
    return "ساعة واحدة";
  }

  return `${duration.toLocaleString("ar-EG")} ساعة`;
}

function sortCourses(courses: CourseSummary[], sortBy: SortOption) {
  const sorted = [...courses];

  switch (sortBy) {
    case "popular":
      sorted.sort((left, right) => right.enrolledCount - left.enrolledCount);
      break;
    case "rated":
      sorted.sort((left, right) => right.rating - left.rating);
      break;
    case "price-low":
      sorted.sort((left, right) => left.price - right.price);
      break;
    case "price-high":
      sorted.sort((left, right) => right.price - left.price);
      break;
    case "duration-short":
      sorted.sort((left, right) => left.duration - right.duration);
      break;
    case "duration-long":
      sorted.sort((left, right) => right.duration - left.duration);
      break;
    case "newest":
    default:
      sorted.sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
      break;
  }

  return sorted;
}

function CourseCard({
  course,
  index,
}: {
  course: CourseSummary;
  index: number;
}) {
  const levelInfo = levelMap[course.level] ?? levelMap.INTERMEDIATE;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.04 }}
      className="group overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_80px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-950/70 dark:shadow-none"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.16),transparent_42%),linear-gradient(135deg,#f8fafc,#e2e8f0)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.24),transparent_42%),linear-gradient(135deg,#0f172a,#020617)]">
            <div className="rounded-3xl border border-white/20 bg-white/60 p-5 text-orange-500 backdrop-blur dark:bg-white/5">
              <GraduationCap className="h-10 w-10" />
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />

        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge className="border-0 bg-white/85 px-3 py-1 text-slate-800 backdrop-blur">
              {course.categoryName}
            </Badge>
            {course.isFeatured ? (
              <Badge className="border-0 bg-orange-500 px-3 py-1 text-white">
                مميزة
              </Badge>
            ) : null}
          </div>

          <Badge className={cn("border px-3 py-1", levelInfo.className)}>
            {levelInfo.label}
          </Badge>
        </div>

        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs font-bold backdrop-blur">
              <Star className="h-3.5 w-3.5 fill-current text-amber-300" />
              {course.rating.toFixed(1)}
            </div>
            <h3 className="line-clamp-2 text-xl font-black leading-tight">
              {course.title}
            </h3>
          </div>

          <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur transition-transform group-hover:scale-110 md:flex">
            <PlayCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <p className="line-clamp-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {course.description}
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-500 dark:text-slate-400">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
            <div className="mb-1 flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-500" />
              <span>الطلاب</span>
            </div>
            <div className="font-black text-slate-900 dark:text-white">
              {course.enrolledCount.toLocaleString("ar-EG")}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
            <div className="mb-1 flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-orange-500" />
              <span>الدروس</span>
            </div>
            <div className="font-black text-slate-900 dark:text-white">
              {course.lessonsCount.toLocaleString("ar-EG")}
            </div>
          </div>
        </div>

        {course.enrolled && typeof course.progress === "number" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>تقدّمك في الدورة</span>
              <span className="text-orange-500">{course.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-l from-orange-500 to-amber-400"
                style={{ width: `${Math.max(0, Math.min(course.progress, 100))}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {course.tags.slice(0, 3).map((tag) => (
            <span
              key={`${course.id}-${tag}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 pt-5 dark:border-white/10">
          <div>
            <p className="text-xs font-bold text-slate-400">السعر</p>
            <p className="text-2xl font-black text-slate-950 dark:text-white">
              {formatPrice(course.price)}
            </p>
          </div>

          <div className="text-left">
            <p className="mb-2 text-xs font-bold text-slate-400">المدة</p>
            <p className="font-bold text-slate-700 dark:text-slate-200">
              {formatHours(course.duration)}
            </p>
          </div>
        </div>

        <Button
          asChild
          className="h-12 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-orange-500 dark:hover:bg-orange-600"
        >
          <Link href={`/courses/${course.id}`} className="flex items-center justify-center gap-2">
            {course.enrolled ? "متابعة التعلم" : "عرض تفاصيل الدورة"}
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </motion.article>
  );
}

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

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/courses?limit=48", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("تعذر تحميل الدورات التعليمية.");
        }

        const payload = await response.json();
        const data = payload.data ?? payload;
        setCourses(data.courses ?? []);
        setCategories(data.categories ?? []);
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

    void loadCourses();
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
        ? courses.reduce((sum, course) => sum + course.rating, 0) / courses.length
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
          course.tags.join(" "),
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
                    onChange={(event) => setSearchQuery(event.target.value)}
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

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  label: "إجمالي الدورات",
                  value: catalogStats.totalCourses.toLocaleString("ar-EG"),
                  icon: BookOpen,
                  tone: "text-orange-500 bg-orange-500/10",
                },
                {
                  label: "إجمالي الطلاب",
                  value: catalogStats.totalStudents.toLocaleString("ar-EG"),
                  icon: Users,
                  tone: "text-sky-500 bg-sky-500/10",
                },
                {
                  label: "إجمالي الدروس",
                  value: catalogStats.totalLessons.toLocaleString("ar-EG"),
                  icon: Layers3,
                  tone: "text-emerald-500 bg-emerald-500/10",
                },
                {
                  label: "متوسط التقييم",
                  value: catalogStats.avgRating.toFixed(1),
                  icon: Star,
                  tone: "text-amber-500 bg-amber-500/10",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[28px] border border-slate-200/70 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div
                    className={cn(
                      "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl",
                      stat.tone
                    )}
                  >
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-black">{stat.value}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                </div>
              ))}

              <div className="rounded-[28px] border border-slate-200/70 bg-slate-950 p-5 text-white sm:col-span-2 dark:border-white/10">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <TrendingUp className="h-5 w-5 text-orange-300" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white/80">
                      دورات مجانية متاحة الآن
                    </p>
                    <p className="text-2xl font-black">
                      {catalogStats.freeCourses.toLocaleString("ar-EG")}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-7 text-white/70">
                  ابدأ فورًا بدون انتظار، ثم انتقل إلى الدورات المتقدمة عندما
                  تكون جاهزًا.
                </p>
              </div>
            </div>
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
                  ({category.count.toLocaleString("ar-EG")})
                </span>
              </button>
            ))}
          </div>
        </section>

        {spotlightCourses.length > 0 ? (
          <section className="mt-10 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-sky-600 dark:text-sky-300">
                  ترشيحات جاهزة
                </p>
                <h2 className="text-2xl font-black">أفضل ما يمكن البدء به الآن</h2>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {spotlightCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-slate-950/75 dark:shadow-none"
                >
                  <div className="absolute left-0 top-0 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />
                  <div className="relative space-y-4">
                    <Badge className="rounded-full border-0 bg-slate-950 px-3 py-1 text-white dark:bg-white dark:text-slate-950">
                      {index === 0 ? "الأكثر جذبًا" : index === 1 ? "الأعلى تقييمًا" : "مقترحة لك"}
                    </Badge>
                    <h3 className="text-2xl font-black">{course.title}</h3>
                    <p className="line-clamp-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {course.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-sky-500" />
                        {course.enrolledCount.toLocaleString("ar-EG")} طالب
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-orange-500" />
                        {formatHours(course.duration)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-current text-amber-400" />
                        {course.rating.toFixed(1)}
                      </span>
                    </div>

                    <Button
                      asChild
                      className="h-11 rounded-2xl bg-orange-500 px-5 text-white hover:bg-orange-600"
                    >
                      <Link href={`/courses/${course.id}`} className="flex items-center gap-2">
                        افتح صفحة الدورة
                        <ArrowLeft className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10 rounded-[32px] border border-slate-200/80 bg-white/85 p-5 backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto]">
            <div className="rounded-[24px] bg-slate-50 p-4 dark:bg-white/5">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                <SlidersHorizontal className="h-4 w-4" />
                إعدادات العرض
              </div>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                خصّص النتائج حسب المستوى والسعر والشهرة للوصول إلى الدورة الأنسب
                أسرع.
              </p>
            </div>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="h-14 min-w-[190px] rounded-2xl border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                <SelectValue placeholder="الترتيب" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedLevel}
              onValueChange={(value) => setSelectedLevel(value as "ALL" | CourseLevel)}
            >
              <SelectTrigger className="h-14 min-w-[180px] rounded-2xl border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                <SelectValue placeholder="المستوى" />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              disabled={!hasActiveFilters}
              className="h-14 rounded-2xl border-slate-200 px-6 dark:border-white/10"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
                setSelectedLevel("ALL");
                setSortBy("newest");
                setFeaturedOnly(false);
                setEnrolledOnly(false);
              }}
            >
              إعادة الضبط
            </Button>
          </div>
        </section>

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

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white dark:border-white/10 dark:bg-slate-950/70"
                >
                  <div className="aspect-[16/10] animate-pulse bg-slate-200 dark:bg-white/5" />
                  <div className="space-y-4 p-6">
                    <div className="h-6 w-2/3 animate-pulse rounded-full bg-slate-200 dark:bg-white/5" />
                    <div className="h-4 w-full animate-pulse rounded-full bg-slate-200 dark:bg-white/5" />
                    <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200 dark:bg-white/5" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
                      <div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[32px] border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-500/20 dark:bg-rose-500/10">
              <h3 className="text-xl font-black text-rose-700 dark:text-rose-300">
                تعذر تحميل الدورات
              </h3>
              <p className="mt-3 text-sm leading-7 text-rose-600 dark:text-rose-200/80">
                {error}
              </p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-[32px] border-2 border-dashed border-slate-300 bg-white/70 p-10 text-center dark:border-white/10 dark:bg-slate-950/60">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-black">لا توجد نتائج مطابقة الآن</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                جرّب تعديل كلمات البحث أو إعادة ضبط الفلاتر، أو افتح جميع المواد
                لرؤية مزيد من الدورات.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredCourses.map((course, index) => (
                <CourseCard key={course.id} course={course} index={index} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

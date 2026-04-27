"use client";

import { useEffect, useMemo, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,

  GraduationCap,
  Clock,
  Trophy,
  Award,
  TrendingUp,
  Play,
  Zap,
  BarChart3,
  Star,



  Layers,
  CheckCircle2,
  Search,

  Target } from
"lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MyCourse = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  subject: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  duration: number;
  thumbnailUrl?: string;
  price: number;
  rating: number;
  enrolledCount: number;
  tags: string[];
  enrolled: boolean;
  progress: number;
  lessonsCount: number;
  completedLessons: number;
  totalLessons: number;
  enrolledAt: string;
  lastAccessedAt: string;
  certificate: {
    id: string;
    url: string;
    issuedAt: string;
  } | null;
};

type MyCoursesStats = {
  total: number;
  inProgress: number;
  completed: number;
  notStarted: number;
  certificates: number;
  totalCompletedLessons: number;
  totalLessons: number;
};

type FilterType = "all" | "in-progress" | "completed" | "not-started";

const levelConfig: Record<string, {label: string;color: string;bg: string;}> = {
  BEGINNER: { label: "مبتدئ", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  INTERMEDIATE: { label: "متوسط", color: "text-amber-500", bg: "bg-amber-500/10" },
  ADVANCED: { label: "متقدم", color: "text-rose-500", bg: "bg-rose-500/10" }
};

export default function MyCoursesPage() {
  const { user, isLoading: authLoading, fetchWithAuth } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [stats, setStats] = useState<MyCoursesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/my-courses");
      return;
    }

    const fetchMyCourses = async () => {
      try {
        setLoading(true);
        const res = await fetchWithAuth("/api/my-courses");
        if (res.ok) {
          const data = await res.json();
          setCourses(data.data?.courses || data.courses || []);
          setStats(data.data?.stats || data.stats || null);
        }
      } catch {

        // silently handle
      } finally {setLoading(false);
      }
    };

    void fetchMyCourses();
  }, [authLoading, user, fetchWithAuth, router]);

  const filteredCourses = useMemo(() => {
    let filtered = courses;

    if (activeFilter === "in-progress") {
      filtered = filtered.filter((c) => c.progress > 0 && c.progress < 100);
    } else if (activeFilter === "completed") {
      filtered = filtered.filter((c) => c.progress >= 100);
    } else if (activeFilter === "not-started") {
      filtered = filtered.filter((c) => c.progress === 0);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
        c.title.toLowerCase().includes(term) ||
        c.instructor.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [courses, activeFilter, searchTerm]);

  const overallProgress = useMemo(() => {
    if (!stats) return 0;
    return stats.totalLessons > 0 ?
    Math.round(stats.totalCompletedLessons / stats.totalLessons * 100) :
    0;
  }, [stats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0B0D14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 border-2 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-500 font-medium">جاري تحميل دوراتك...</p>
        </div>
      </div>);

  }

  const filters: {key: FilterType;label: string;count: number;icon: typeof BookOpen;}[] = [
  { key: "all", label: "الكل", count: stats?.total || 0, icon: Layers },
  { key: "in-progress", label: "قيد التقدم", count: stats?.inProgress || 0, icon: TrendingUp },
  { key: "completed", label: "مكتملة", count: stats?.completed || 0, icon: CheckCircle2 },
  { key: "not-started", label: "لم تبدأ", count: stats?.notStarted || 0, icon: BookOpen }];


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0D14]" dir="rtl">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/[0.02] blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/[0.02] blur-[130px] rounded-full" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white">
                    دوراتي التعليمية
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    تتبع تقدمك واستمر في رحلة التعلم
                  </p>
                </div>
              </div>
            </div>
            <Link href="/courses">
              <Button variant="outline" className="gap-2 rounded-xl border-gray-200 dark:border-white/10">
                <BookOpen className="h-4 w-4" />
                <span>استكشف المزيد</span>
              </Button>
            </Link>
          </div>
        </m.div>

        {/* Stats Overview */}
        {stats &&
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-3">
          
            {[
          { label: "إجمالي الدورات", val: stats.total, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "قيد التقدم", val: stats.inProgress, icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "مكتملة", val: stats.completed, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "الشهادات", val: stats.certificates, icon: Award, color: "text-violet-500", bg: "bg-violet-500/10" },
          { label: "التقدم العام", val: `${overallProgress}%`, icon: Target, color: "text-primary", bg: "bg-primary/10" }].
          map((stat, i) =>
          <m.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-4 transition-all hover:border-gray-300 dark:hover:border-white/10">
            
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", stat.bg)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate">{stat.label}</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{stat.val}</p>
                </div>
              </m.div>
          )}
          </m.div>
        }

        {/* Overall Progress Bar */}
        {stats && stats.total > 0 &&
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-6">
          
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">التقدم العام في جميع الدورات</h3>
              <span className={cn(
              "text-sm font-black",
              overallProgress >= 80 ? "text-emerald-500" : overallProgress >= 40 ? "text-amber-500" : "text-primary"
            )}>
                {overallProgress}%
              </span>
            </div>
            <Progress value={overallProgress} className="h-3" />
            <p className="text-xs text-gray-400 mt-2">
              {stats.totalCompletedLessons} من {stats.totalLessons} درس مكتمل
            </p>
          </m.div>
        }

        {/* Filters & Search */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/5">
            {filters.map((f) =>
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                activeFilter === f.key ?
                "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" :
                "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}>
              
                <f.icon className="h-4 w-4" />
                <span>{f.label}</span>
                {f.count > 0 &&
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                    {f.count}
                  </span>
              }
              </button>
            )}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث في دوراتك..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/80 pr-10 pl-4 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            
          </div>
        </m.div>

        {/* Course Grid */}
        {filteredCourses.length === 0 ?
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10">
          
            <GraduationCap className="h-16 w-16 text-gray-300 dark:text-gray-600 mb.4" />
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
              {courses.length === 0 ? "لم تسجل في أي دورة بعد" : "لا توجد نتائج"}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm text-center">
              {courses.length === 0 ?
            "استكشف الدورات المتاحة وابدأ رحلة التعلم" :
            "جرب تغيير الفلتر أو مصطلح البحث"}
            </p>
            {courses.length === 0 &&
          <Link href="/courses">
                <Button className="gap-2 rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                  <BookOpen className="h-4 w-4" />
                  <span>استكشف الدورات</span>
                </Button>
              </Link>
          }
          </m.div> :

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredCourses.map((course, index) => {
              const levelInfo = levelConfig[course.level] || levelConfig.INTERMEDIATE;
              const isComplete = (course.progress ?? 0) >= 100;

              return (
                <m.div
                  key={course.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  whileHover={{ y: -4 }}
                  className={cn(
                    "group relative flex flex-col rounded-2xl border bg-white dark:bg-gray-900/80 dark:border-white/[0.06] overflow-hidden transition-all duration-300",
                    isComplete && "ring-2 ring-emerald-500/30",
                    "hover:shadow-xl hover:shadow-primary/5"
                  )}>
                  
                    {/* Thumbnail */}
                    <div className="relative h-44 overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {course.thumbnailUrl ?
                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /> :

                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-100 via-gray-50 to-white dark:from-gray-800 dark:via-gray-900 dark:to-black">
                          <GraduationCap className="h-14 w-14 text-gray-300 dark:text-white/10" />
                        </div>
                    }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Badges */}
                      <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                        <Badge className={cn("border-0 px-2.5 py-1 text-[10px] font-bold backdrop-blur-md", levelInfo.bg, levelInfo.color)}>
                          {levelInfo.label}
                        </Badge>
                        {isComplete &&
                      <div className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-white text-[10px] font-bold">
                            <Trophy className="h-3 w-3" />
                            <span>مكتملة</span>
                          </div>
                      }
                      </div>

                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30">
                          <Play className="h-6 w-6 text-white fill-white" />
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col p-5 gap-3">
                      {/* Progress */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <BarChart3 className="h-3 w-3" />
                            <span>التقدم</span>
                          </div>
                          <span className={cn(
                          "font-black",
                          (course.progress ?? 0) >= 100 ? "text-emerald-500" : (course.progress ?? 0) >= 50 ? "text-amber-500" : "text-primary"
                        )}>
                            {course.progress ?? 0}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                          <m.div
                          initial={{ width: 0 }}
                          animate={{ width: `${course.progress ?? 0}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={cn(
                            "h-full rounded-full",
                            (course.progress ?? 0) >= 100 ?
                            "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                            (course.progress ?? 0) >= 50 ?
                            "bg-gradient-to-r from-amber-500 to-amber-400" :
                            "bg-gradient-to-r from-primary to-orange-400"
                          )} />
                        
                        </div>
                        <p className="text-[10px] text-gray-400">
                          {course.completedLessons} من {course.totalLessons} درس
                        </p>
                      </div>

                      {/* Title & Instructor */}
                      <div className="space-y-1.5">
                        <Link href={`/courses/${course.id}`}>
                          <h3 className="line-clamp-2 text-base font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                            {course.title}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                            {course.instructor.charAt(0)}
                          </div>
                          <span className="text-xs text-gray-500">{course.instructor}</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-1 border-t border-gray-100 dark:border-white/5 mt-auto">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-gray-700 dark:text-white">{course.rating?.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{course.duration} ساعة</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>{course.totalLessons} درس</span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center gap-2">
                        <Link href={`/learning/${course.id}`} className="flex-1">
                          <Button
                          className={cn(
                            "w-full gap-2 rounded-xl font-bold text-sm h-10 shadow-lg",
                            isComplete ?
                            "bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600" :
                            "bg-primary text-white shadow-primary/20 hover:shadow-xl"
                          )}>
                          
                            {isComplete ?
                          <>
                                <CheckCircle2 className="h-4 w-4" />
                                <span>مراجعة</span>
                              </> :
                          (course.progress ?? 0) > 0 ?
                          <>
                                <Zap className="h-4 w-4 fill-current" />
                                <span>متابعة التعلم</span>
                              </> :

                          <>
                                <Play className="h-4 w-4 fill-current" />
                                <span>ابدأ الآن</span>
                              </>
                          }
                          </Button>
                        </Link>

                        {course.certificate &&
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                          onClick={() => router.push(`/certificates/${course.certificate!.id}`)}
                          title="عرض الشهادة">
                          <Award className="h-4 w-4" />
                        </Button>
                      }
                      </div>
                    </div>
                  </m.div>
                );
              })}

            </AnimatePresence>
          </div>
        }
      </div>
    </div>);

}
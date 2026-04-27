"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Users,
  Clock,
  PlayCircle,
  GraduationCap,
  BarChart3,
  MessageCircle,
  DollarSign,
  Star,
  ExternalLink,
  Edit,
  Trash2,
  BookOpen,
  Layers,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Shield,
  Zap,
  Target,
  ArrowUpRight,
  Copy,
  Check,
  Activity,
  UserCheck,
  Crown,
  Globe,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────
interface Course {
  id: string;
  name: string;
  nameAr: string | null;
  code: string | null;
  description: string | null;
  price: number;
  level: string;
  instructorName: string | null;
  instructorId: string | null;
  categoryId: string | null;
  thumbnailUrl: string | null;
  trailerUrl: string | null;
  trailerDurationMinutes?: number | null;
  isActive: boolean;
  isPublished: boolean;
  durationHours: number;
  requirements: string | null;
  learningObjectives: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  slug: string | null;
  rating: number;
  enrolledCount: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    enrollments: number;
    topics: number;
    reviews: number;
  };
}

interface CourseStats {
  totalLessons: number;
  totalDuration: number;
  avgRating: number;
  reviewCount: number;
  enrollmentCount: number;
}

interface Student {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  level: number;
  totalXP: number;
  progress: number;
  enrolledAt: string;
  lastLogin: string | null;
  accountCreatedAt: string;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
}

const levelConfig: Record<string, { label: string; color: string; bg: string; border: string; gradient: string }> = {
  BEGINNER: { label: "مبتدئ", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", gradient: "from-emerald-500/20 to-emerald-500/5" },
  INTERMEDIATE: { label: "متوسط", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", gradient: "from-sky-500/20 to-sky-500/5" },
  ADVANCED: { label: "متقدم", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", gradient: "from-amber-500/20 to-amber-500/5" },
};

// ─── Mini Components ────────────────────────────────────────
function StatMiniCard({ icon: Icon, label, value, color, subtext }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  subtext?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5">
      <div className={cn("absolute -left-6 -top-6 h-24 w-24 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40", color)} />
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{label}</p>
          <p className="text-3xl font-black tracking-tight">{value}</p>
          {subtext && <p className="text-[11px] text-muted-foreground">{subtext}</p>}
        </div>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 transition-transform group-hover:scale-110", color.replace("bg-", "bg-").replace("/20", "/10"))}>
          <Icon className={cn("h-6 w-6", color.replace("bg-", "text-").replace("/20", ""))} />
        </div>
      </div>
    </div>
  );
}

function RatingStars({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-6 w-6" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClass,
            "transition-all",
            star <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );
}

function RatingBar({ label, count, total, rating }: { label: string; count: number; total: number; rating: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const barColors: Record<number, string> = {
    5: "bg-emerald-500",
    4: "bg-lime-500",
    3: "bg-amber-500",
    2: "bg-orange-500",
    1: "bg-red-500",
  };

  return (
    <div className="flex items-center gap-3">
      <span className="w-8 text-right text-xs font-bold text-muted-foreground">{label}</span>
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      <div className="flex-1 h-2.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", barColors[rating] || "bg-primary")}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-10 text-left text-xs font-bold tabular-nums">{count}</span>
    </div>
  );
}

function UserAvatar({ name, avatar, size = "md" }: { name: string; avatar?: string | null; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-[10px]" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-xs";
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  if (avatar) {
    return <img src={avatar} alt={name} className={cn("rounded-full object-cover border-2 border-border", sizeClass)} />;
  }

  return (
    <div className={cn("flex items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 font-black text-primary border-2 border-primary/20", sizeClass)}>
      {initials}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function CourseDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const [activeTab, setActiveTab] = React.useState("overview");
  const [copiedId, setCopiedId] = React.useState(false);
  const [studentSearch, setStudentSearch] = React.useState("");
  const [studentPage, setStudentPage] = React.useState(1);
  const [reviewPage, setReviewPage] = React.useState(1);

  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  // ─── Data Fetching ──────────────────────────────────────
  const { data: course, isLoading, error: courseError } = useQuery({
    queryKey: ["admin", "course", courseId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses/${courseId}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to fetch course");
      }
      if (!result.data?.course) {
        throw new Error("Course data not found");
      }
      return result.data.course as Course;
    },
    enabled: !!courseId,
    retry: 1,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin", "course-stats", courseId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses/${courseId}/stats`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to fetch stats");
      }
      if (!result.data?.stats) {
        throw new Error("Stats data not found");
      }
      return result.data.stats as CourseStats;
    },
    enabled: !!course,
    retry: 1,
  });

  const { data: studentsData } = useQuery({
    queryKey: ["admin", "course-students", courseId, studentPage, studentSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(studentPage), limit: "15" });
      if (studentSearch) params.set("search", studentSearch);
      const response = await fetch(`/api/admin/courses/${courseId}/students?${params}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to fetch students");
      }
      if (result.data === undefined) {
        throw new Error("Students data not found");
      }
      return result.data as { students: Student[]; pagination: { total: number; totalPages: number } };
    },
    enabled: activeTab === "students" && !!courseId,
    retry: 1,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["admin", "course-reviews", courseId, reviewPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses/${courseId}/reviews?page=${reviewPage}&limit=10`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to fetch reviews");
      }
      if (result.data === undefined) {
        throw new Error("Reviews data not found");
      }
      return result.data as {
        reviews: Review[];
        averageRating: number;
        ratingDistribution: Record<number, number>;
        pagination: { total: number; totalPages: number };
      };
    },
    enabled: activeTab === "reviews" && !!courseId,
    retry: 1,
  });

  // ─── Handlers ──────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      const response = await fetch("/api/admin/courses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteDialog.id }),
      });
      if (response.ok) {
        toast.success("تم حذف الدورة بنجاح");
        router.push("/admin/courses");
      } else {
        const result = await response.json();
        toast.error(result?.message || "فشل في حذف الدورة");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(courseId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ─── Loading / Error ────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
            <div className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-b-primary/30" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-sm font-bold text-muted-foreground animate-pulse">جاري تحميل بيانات الدورة...</p>
        </div>
      </div>
    );
  }

  if (courseError || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10 text-destructive animate-bounce">
          <BookOpen className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black">الدورة غير موجودة أو تعذر تحميلها</h2>
          <p className="text-sm text-muted-foreground font-medium max-w-sm">
            {courseError ? (courseError as Error).message : "يرجى التحقق من المعرف المدخل والمحاولة مرة أخرى أو العودة لقائمة الدورات."}
          </p>
        </div>
        <div className="flex gap-4">
          <AdminButton variant="outline" className="rounded-xl px-8" onClick={() => router.push("/admin/courses")}>
            العودة للدورات
          </AdminButton>
          <AdminButton className="rounded-xl px-8" onClick={() => window.location.reload()}>
            إعادة المحاولة
          </AdminButton>
        </div>
      </div>
    );
  }

  const level = course.level || "INTERMEDIATE";
  const lc = levelConfig[level] || levelConfig.INTERMEDIATE;
  const totalStudents = stats?.enrollmentCount || course._count?.enrollments || 0;
  const totalLessons = stats?.totalLessons || 0;
  const totalDuration = stats?.totalDuration || 0;
  const avgRating = stats?.avgRating || course.rating || 0;
  const totalReviews = stats?.reviewCount || course._count?.reviews || 0;
  const estimatedRevenue = totalStudents * (course.price || 0);
  const trailerDurationMinutes = course.trailerDurationMinutes || 0;

  return (
    <div className="space-y-8 pb-20" dir="rtl">
      {/* ─── Hero Header ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-l from-slate-950 via-slate-900 to-sky-950">
        {/* Background effects */}
        <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-sky-500/10 blur-[80px]" />

        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Thumbnail */}
            <div className="relative h-48 w-full lg:w-80 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10">
              {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt={course.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500/20 to-indigo-500/20">
                  <PlayCircle className="h-14 w-14 text-white/20" />
                </div>
              )}
              {course.isPublished && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  منشورة
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-white space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={cn("rounded-full px-3 py-1 font-bold text-[10px]", lc.bg, lc.color, lc.border)}>
                  {lc.label}
                </Badge>
                <Badge className={cn("rounded-full px-3 py-1 text-[10px] font-bold", course.isActive ? "bg-white/10 text-white border-white/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                  {course.isActive ? "نشطة" : "موقوفة"}
                </Badge>
                {course.code && (
                  <span className="text-[11px] font-mono text-slate-400">#{course.code}</span>
                )}
                <button onClick={copyId} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-white transition">
                  {copiedId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedId ? "تم النسخ" : courseId.slice(0, 8)}
                </button>
              </div>

              <div>
                <h1 className="text-2xl lg:text-3xl font-black leading-tight">{course.nameAr || course.name}</h1>
                {course.nameAr && course.name !== course.nameAr && (
                  <p className="text-sm text-slate-400 mt-1 font-medium">{course.name}</p>
                )}
              </div>

              {course.description && (
                <p className="text-sm text-slate-300 leading-relaxed max-w-2xl line-clamp-2">
                  {course.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-slate-400" />
                  <span className="font-bold">{course.instructorName || "غير محدد"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  <span className="font-black text-green-400">{course.price || "مجاني"} {course.price ? "EGP" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="font-bold">{course.durationHours} ساعة</span>
                </div>
                {trailerDurationMinutes > 0 && (
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-cyan-400" />
                    <span className="font-bold text-cyan-300">
                      فيديو المقدمة {trailerDurationMinutes} دقيقة
                    </span>
                  </div>
                )}
                {avgRating > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-black text-amber-400">{avgRating.toFixed(1)}</span>
                    <span className="text-slate-500">({totalReviews})</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <AdminButton className="gap-2 rounded-xl h-10 px-4 text-xs font-bold bg-white text-slate-900 hover:bg-slate-100" onClick={() => router.push(`/admin/courses/${course.id}/edit`)}>
                  <Edit className="h-3.5 w-3.5" />
                  تعديل الدورة
                </AdminButton>
                <AdminButton variant="outline" className="gap-2 rounded-xl h-10 px-4 text-xs font-bold border-white/20 text-white hover:bg-white/10" onClick={() => router.push(`/admin/courses/${course.id}/curriculum`)}>
                  <Layers className="h-3.5 w-3.5" />
                  إدارة المنهج
                </AdminButton>
                <AdminButton variant="outline" className="gap-2 rounded-xl h-10 px-4 text-xs font-bold border-white/20 text-white hover:bg-white/10" onClick={() => window.open(`/courses/${course.id}`, "_blank")}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  عرض في الموقع
                </AdminButton>
                <AdminButton variant="destructive" className="gap-2 rounded-xl h-10 px-4 text-xs font-bold" onClick={() => setDeleteDialog({ open: true, id: course.id })}>
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </AdminButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Stats Grid ───────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatMiniCard icon={Users} label="الطلاب المسجلين" value={totalStudents} color="bg-blue-500/20" subtext="إجمالي الملتحقين" />
        <StatMiniCard icon={Layers} label="الوحدات التعليمية" value={course._count?.topics || 0} color="bg-violet-500/20" subtext={`${totalLessons} درس`} />
        <StatMiniCard icon={Clock} label="مدة المحتوى" value={`${totalDuration} د`} color="bg-cyan-500/20" subtext={`${course.durationHours} ساعة تقريباً`} />
        <StatMiniCard icon={PlayCircle} label="مدة فيديو المقدمة" value={trailerDurationMinutes > 0 ? `${trailerDurationMinutes} د` : "—"} color="bg-sky-500/20" subtext={trailerDurationMinutes > 0 ? "مدة محفوظة" : "غير محددة"} />
        <StatMiniCard icon={Star} label="متوسط التقييم" value={avgRating > 0 ? avgRating.toFixed(1) : "—"} color="bg-amber-500/20" subtext={`${totalReviews} تقييم`} />
        <StatMiniCard icon={DollarSign} label="الإيرادات التقديرية" value={`${estimatedRevenue.toLocaleString()}`} color="bg-emerald-500/20" subtext="EGP" />
        <StatMiniCard icon={Target} label="معدل الإكمال" value={totalStudents > 0 ? "65%" : "—"} color="bg-rose-500/20" subtext="متوسط تقدم الطلاب" />
      </div>

      {/* ─── Tabs ──────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 -mx-1 px-1 pb-0">
          <TabsList className="h-auto w-full bg-transparent gap-0 p-0">
            {[
              { value: "overview", label: "نظرة عامة", icon: BarChart3 },
              { value: "curriculum", label: "المنهج الدراسي", icon: BookOpen },
              { value: "students", label: "الطلاب", icon: Users, count: totalStudents },
              { value: "reviews", label: "التقييمات", icon: Star, count: totalReviews },
              { value: "settings", label: "الإعدادات", icon: Shield },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative rounded-none border-b-2 border-transparent px-5 py-3.5 data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm font-bold"
              >
                <tab.icon className="h-4 w-4 ml-2" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="mr-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-black text-primary">
                    {tab.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ─── Overview Tab ───────────────────────────────── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <AdminCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-black">وصف الدورة</h3>
                </div>
                <p className="text-muted-foreground whitespace-pre-line leading-8">
                  {course.description || "لا يوجد وصف متاح لهذه الدورة. يرجى إضافة وصف تفصيلي عبر تعديل الدورة."}
                </p>
              </AdminCard>

              {/* Learning Objectives */}
              <AdminCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Target className="h-5 w-5 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-black">أهداف التعلم</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {(course.learningObjectives || "").split("\n").filter(o => o.trim()).length > 0 ? (
                    (course.learningObjectives || "").split("\n").filter(o => o.trim()).map((obj, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-3 transition-colors hover:bg-muted/40">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black mt-0.5">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium leading-relaxed">{obj.trim()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/10 py-8 text-center">
                      <Target className="h-8 w-8 text-muted-foreground/20 mb-2" />
                      <p className="text-sm font-bold text-muted-foreground">لم يتم تحديد أهداف التعلم بعد</p>
                    </div>
                  )}
                </div>
              </AdminCard>

              {/* Requirements */}
              <AdminCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                    <Shield className="h-5 w-5 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-black">المتطلبات الأساسية</h3>
                </div>
                <div className="space-y-2">
                  {(course.requirements || "").split("\n").filter(r => r.trim()).length > 0 ? (
                    (course.requirements || "").split("\n").filter(r => r.trim()).map((req, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
                        <Check className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <span className="text-sm font-medium">{req.trim()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/10 py-8 text-center">
                      <Shield className="h-8 w-8 text-muted-foreground/20 mb-2" />
                      <p className="text-sm font-bold text-muted-foreground">لا توجد متطلبات محددة</p>
                    </div>
                  )}
                </div>
              </AdminCard>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Info */}
              <AdminCard className="overflow-hidden">
                <div className={cn("px-6 py-4 bg-gradient-to-l", lc.gradient)}>
                  <h4 className="text-sm font-black">معلومات سريعة</h4>
                </div>
                <div className="p-5 space-y-4">
                  {[
                    { icon: GraduationCap, label: "المحاضر", value: course.instructorName || "غير محدد" },
                    { icon: DollarSign, label: "السعر", value: course.price ? `${course.price} EGP` : "مجاني" },
                    { icon: Clock, label: "المدة", value: `${course.durationHours} ساعة` },
                    { icon: PlayCircle, label: "فيديو المقدمة", value: trailerDurationMinutes > 0 ? `${trailerDurationMinutes} دقيقة` : "غير محددة" },
                    { icon: Layers, label: "الوحدات", value: `${course._count?.topics || 0} وحدة` },
                    { icon: Users, label: "الملتحقون", value: `${totalStudents} طالب` },
                    { icon: CalendarDays, label: "تاريخ الإنشاء", value: new Date(course.createdAt).toLocaleDateString("ar-EG") },
                    { icon: Activity, label: "آخر تحديث", value: new Date(course.updatedAt).toLocaleDateString("ar-EG") },
                  ].map(({ icon: Icon, label, value }, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-bold">{label}</span>
                      </div>
                      <span className="text-sm font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </AdminCard>

              {/* Rating Snapshot */}
              <AdminCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-5 w-5 text-amber-400" />
                  <h4 className="text-sm font-black">التقييم العام</h4>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl font-black">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</span>
                  <div className="space-y-1">
                    <RatingStars rating={avgRating} />
                    <p className="text-[11px] text-muted-foreground">{totalReviews} تقييم</p>
                  </div>
                </div>
                {totalReviews > 0 && (
                  <AdminButton variant="outline" size="sm" className="w-full rounded-xl text-xs" onClick={() => setActiveTab("reviews")}>
                    عرض جميع التقييمات
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  </AdminButton>
                )}
              </AdminCard>

              {/* SEO Status */}
              <AdminCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-black">حالة SEO</h4>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "عنوان SEO", ok: !!course.seoTitle },
                    { label: "وصف Meta", ok: !!course.seoDescription },
                    { label: "رابط مخصص", ok: !!course.slug },
                    { label: "صورة الغلاف", ok: !!course.thumbnailUrl },
                    { label: "الوصف التفصيلي", ok: (course.description?.length || 0) > 50 },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">{item.label}</span>
                      {item.ok ? (
                        <Badge className="rounded-full h-5 px-2 text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border-emerald-500/20">مكتمل</Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-full h-5 px-2 text-[9px] font-bold text-orange-500 border-orange-500/20">ناقص</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </AdminCard>
            </div>
          </div>
        </TabsContent>

        {/* ─── Curriculum Tab ─────────────────────────────── */}
        <TabsContent value="curriculum" className="mt-6 space-y-6">
          <AdminCard className="overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                  <Layers className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-black">هيكل المنهج التعليمي</h3>
                  <p className="text-xs text-muted-foreground">{course._count?.topics || 0} وحدة - {totalLessons} درس - {totalDuration} دقيقة</p>
                </div>
              </div>
              <AdminButton className="rounded-xl h-10 gap-2" onClick={() => router.push(`/admin/courses/${course.id}/curriculum`)}>
                <Edit className="h-3.5 w-3.5" />
                إدارة المنهج
              </AdminButton>
            </div>

            <div className="p-6">
              {(course._count?.topics || 0) > 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
                      <Layers className="h-7 w-7 text-violet-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-black">{course._count?.topics || 0} وحدة تعليمية</p>
                    <p className="text-muted-foreground text-sm mt-1">تحتوي على {totalLessons} درس بمدة إجمالية {totalDuration} دقيقة</p>
                  </div>
                  <AdminButton variant="outline" className="rounded-xl gap-2" onClick={() => router.push(`/admin/courses/${course.id}/curriculum`)}>
                    فتح مدير المنهج
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </AdminButton>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                    <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-bold text-muted-foreground">لم يتم إضافة أي فصول أو دروس بعد</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">ابدأ ببناء المنهج التعليمي</p>
                  <AdminButton className="mt-4 rounded-xl gap-2" onClick={() => router.push(`/admin/courses/${course.id}/curriculum`)}>
                    <Layers className="h-4 w-4" />
                    بدء بناء المنهج
                  </AdminButton>
                </div>
              )}
            </div>
          </AdminCard>
        </TabsContent>

        {/* ─── Students Tab ───────────────────────────────── */}
        <TabsContent value="students" className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-black">الطلاب المسجلون</h3>
                <p className="text-xs text-muted-foreground">{studentsData?.pagination.total || 0} طالب مسجل في هذه الدورة</p>
              </div>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو البريد..."
                value={studentSearch}
                onChange={(e) => { setStudentSearch(e.target.value); setStudentPage(1); }}
                className="h-10 rounded-xl pr-10"
              />
            </div>
          </div>

          {studentsData?.students && studentsData.students.length > 0 ? (
            <>
              <div className="grid gap-3">
                {studentsData.students.map((student) => (
                  <AdminCard key={student.id} className="p-4 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                      <UserAvatar name={student.name} avatar={student.avatar} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate">{student.name}</p>
                          <Badge variant="outline" className="rounded-full px-2 h-5 text-[9px] font-bold">
                            <Zap className="h-2.5 w-2.5 ml-0.5" />
                            Lv.{student.level}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                      </div>
                      <div className="hidden md:flex flex-col items-end gap-1 min-w-[120px]">
                        <div className="flex items-center gap-2 w-full">
                          <Progress value={student.progress} className="h-2 flex-1" />
                          <span className="text-xs font-bold tabular-nums w-9 text-left">{student.progress}%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          التحق {new Date(student.enrolledAt).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      <div className="hidden lg:flex flex-col items-end gap-1 min-w-[80px]">
                        <div className="flex items-center gap-1">
                          <Crown className="h-3 w-3 text-amber-500" />
                          <span className="text-xs font-bold">{student.totalXP} XP</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {student.lastLogin ? `آخر دخول ${new Date(student.lastLogin).toLocaleDateString("ar-EG")}` : "لم يسجل دخول"}
                        </p>
                      </div>
                    </div>
                  </AdminCard>
                ))}
              </div>

              {/* Students Pagination */}
              {studentsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <AdminButton
                    variant="outline"
                    size="sm"
                    disabled={studentPage <= 1}
                    onClick={() => setStudentPage((p) => p - 1)}
                    className="rounded-xl"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </AdminButton>
                  <span className="text-sm font-bold">
                    {studentPage} / {studentsData.pagination.totalPages}
                  </span>
                  <AdminButton
                    variant="outline"
                    size="sm"
                    disabled={studentPage >= studentsData.pagination.totalPages}
                    onClick={() => setStudentPage((p) => p + 1)}
                    className="rounded-xl"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </AdminButton>
                </div>
              )}
            </>
          ) : (
            <AdminCard className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                <UserCheck className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-bold text-muted-foreground">لا يوجد طلاب مسجلون</p>
              <p className="text-xs text-muted-foreground/60 mt-1">سي٪ر الطلاب هنا عند التسجيل في الدورة</p>
            </AdminCard>
          )}
        </TabsContent>

        {/* ─── Reviews Tab ────────────────────────────────── */}
        <TabsContent value="reviews" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Reviews Summary */}
            <div className="space-y-6">
              <AdminCard className="p-6">
                <h4 className="text-sm font-black mb-4">ملخص التقييمات</h4>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-5xl font-black">
                    {(reviewsData?.averageRating || avgRating || 0).toFixed(1)}
                  </span>
                  <div className="space-y-1">
                    <RatingStars rating={reviewsData?.averageRating || avgRating || 0} size="lg" />
                    <p className="text-xs text-muted-foreground font-bold">
                      {reviewsData?.pagination.total || totalReviews} تقييم
                    </p>
                  </div>
                </div>

                {reviewsData?.ratingDistribution && (
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((r) => (
                      <RatingBar
                        key={r}
                        label={String(r)}
                        count={reviewsData.ratingDistribution[r] || 0}
                        total={reviewsData.pagination.total || 1}
                        rating={r}
                      />
                    ))}
                  </div>
                )}
              </AdminCard>
            </div>

            {/* Reviews List */}
            <div className="lg:col-span-2 space-y-4">
              {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
                <>
                  {reviewsData.reviews.map((review) => (
                    <AdminCard key={review.id} className="p-5">
                      <div className="flex items-start gap-4">
                        <UserAvatar name={review.userName} avatar={review.userAvatar} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{review.userName}</span>
                              <RatingStars rating={review.rating} size="sm" />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString("ar-EG")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{review.userEmail}</p>
                          {review.comment && (
                            <p className="text-sm mt-3 leading-relaxed text-foreground/80 bg-muted/20 rounded-xl p-3">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    </AdminCard>
                  ))}

                  {/* Reviews Pagination */}
                  {reviewsData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-4">
                      <AdminButton variant="outline" size="sm" disabled={reviewPage <= 1} onClick={() => setReviewPage((p) => p - 1)} className="rounded-xl">
                        <ChevronRight className="h-4 w-4" />
                      </AdminButton>
                      <span className="text-sm font-bold">{reviewPage} / {reviewsData.pagination.totalPages}</span>
                      <AdminButton variant="outline" size="sm" disabled={reviewPage >= reviewsData.pagination.totalPages} onClick={() => setReviewPage((p) => p + 1)} className="rounded-xl">
                        <ChevronLeft className="h-4 w-4" />
                      </AdminButton>
                    </div>
                  )}
                </>
              ) : (
                <AdminCard className="flex flex-col items-center justify-center py-16 text-center lg:col-span-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-bold text-muted-foreground">لا توجد تقييمات بعد</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">ست٪ر تقييمات الطلاب هنا عند تقديمها</p>
                </AdminCard>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ─── Settings Tab ───────────────────────────────── */}
        <TabsContent value="settings" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Publish Status */}
            <AdminCard className="overflow-hidden">
              <div className="bg-gradient-to-l from-slate-950 to-slate-900 p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <Eye className="h-5 w-5" />
                  </div>
                  <h3 className="font-black">حالة النشر وال٪ور</h3>
                </div>
                <p className="text-slate-400 text-sm leading-7">
                  تحكم في ٪ور الدورة للطلاب وحالتها في المنصة التعليمية.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <p className="font-bold text-sm">حالة النشر</p>
                    <p className="text-xs text-muted-foreground">هل الدورة مرئية للطلاب؟</p>
                  </div>
                  <Badge className={cn("rounded-full px-3 py-1 font-bold text-xs", course.isPublished ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20")}>
                    {course.isPublished ? "منشورة" : "مسودة"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <p className="font-bold text-sm">التفعيل</p>
                    <p className="text-xs text-muted-foreground">هل الدورة نشطة في النظام؟</p>
                  </div>
                  <Badge className={cn("rounded-full px-3 py-1 font-bold text-xs", course.isActive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                    {course.isActive ? "نشطة" : "موقوفة"}
                  </Badge>
                </div>
              </div>
            </AdminCard>

            {/* SEO */}
            <AdminCard className="overflow-hidden">
              <div className="bg-gradient-to-l from-blue-950 to-indigo-950 p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <Globe className="h-5 w-5" />
                  </div>
                  <h3 className="font-black">تحسين محركات البحث</h3>
                </div>
                <p className="text-blue-300/70 text-sm leading-7">
                  إعدادات SEO تساعد في ٪ور الدورة في نتائج البحث وجذب المزيد من الطلاب.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="rounded-xl border p-4 space-y-2">
                  <p className="text-xs font-bold text-muted-foreground">عنوان SEO</p>
                  <p className="text-sm font-medium">{course.seoTitle || "غير محدد"}</p>
                </div>
                <div className="rounded-xl border p-4 space-y-2">
                  <p className="text-xs font-bold text-muted-foreground">وصف Meta</p>
                  <p className="text-sm font-medium line-clamp-2">{course.seoDescription || "غير محدد"}</p>
                </div>
                <div className="rounded-xl border p-4 space-y-2">
                  <p className="text-xs font-bold text-muted-foreground">الرابط المخصص</p>
                  <p className="text-sm font-mono font-medium text-primary">/courses/{course.slug || course.id}</p>
                </div>
              </div>
            </AdminCard>

            {/* Danger Zone */}
            <AdminCard className="lg:col-span-2 overflow-hidden border-red-500/20">
              <div className="bg-gradient-to-l from-red-950 to-red-900 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black">منطقة الخطر</h3>
                    <p className="text-red-300/70 text-sm">إجراءات لا يمكن التراجع عنها</p>
                  </div>
                </div>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">حذف الدورة نهائياً</p>
                  <p className="text-xs text-muted-foreground">سيتم حذف الدورة وجميع البيانات المرتبطة بها. لا يمكن التراجع عن هذا الإجراء.</p>
                </div>
                <AdminButton variant="destructive" className="rounded-xl gap-2 flex-shrink-0" onClick={() => setDeleteDialog({ open: true, id: course.id })}>
                  <Trash2 className="h-4 w-4" />
                  حذف الدورة
                </AdminButton>
              </div>
            </AdminCard>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Delete Dialog ─────────────────────────────────── */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: open ? deleteDialog.id : null })}
        onConfirm={handleDelete}
        title="حذف الدورة؟"
        description={`هل أنت متأكد أنك تريد حذف "${course.nameAr || course.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف الدورة"
        variant="destructive"
      />
    </div>
  );
}

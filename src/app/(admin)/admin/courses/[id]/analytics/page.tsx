"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  DollarSign,
  Download,
  Layers,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

// ───────── Types ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
interface EnrollmentTrend {
  date: string;
  count: number;
}

interface AnalyticsData {
  course: {
    id: string;
    name: string;
    trailerDurationMinutes: number;
  };
  enrollmentTrends: EnrollmentTrend[];
  totalEnrollments: number;
  revenue: {
    total: number;
    recent30Days: number;
    pricePerStudent: number;
  };
  progressDistribution: {
    notStarted: number;
    inProgress: number;
    halfWay: number;
    completed: number;
  };
  avgProgress: number;
  contentPerformance: Array<{
    name: string;
    lessonsCount: number;
    totalDuration: number;
    freeCount: number;
    videoCount: number;
  }>;
  ratingDistribution: Record<number, number>;
  avgRating: number;
  reviewCount: number;
  comparison: Array<{
    id: string;
    name: string;
    enrollments: number;
    price: number;
    rating: number;
    isCurrent: boolean;
  }>;
}

// ───────── CSS Mini Chart Components ────────────────────────────────────────────────────────────────────────────────────
function SparklineChart({
  data,
  color = "hsl(var(--primary))",
}: {
  data: number[];
  color?: string;
}) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const width = 100;
  const height = 40;
  const step = width / (data.length - 1 || 1);

  const points = data
    .map((val, i) => `${i * step},${height - (val / max) * height}`)
    .join(" ");

  const fillPoints = `0,${height} ${points} ${(data.length - 1) * step},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-12"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={`grad-${color.replace(/[^a-zA-Z0-9]/g, "")}`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <polygon
        points={fillPoints}
        fill={`url(#grad-${color.replace(/[^a-zA-Z0-9]/g, "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BarChart({
  data,
  labels,
  color = "hsl(var(--primary))",
  height = 120,
}: {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data, 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((val, i) => {
        const barHeight = (val / max) * 100;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 group cursor-pointer"
          >
            <span className="text-[9px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
              {val}
            </span>
            <div
              className="w-full rounded-t-md transition-all duration-500 group-hover:opacity-80"
              style={{
                height: `${barHeight}%`,
                backgroundColor: color,
                minHeight: val > 0 ? 4 : 0,
              }}
            />
            {labels && (
              <span className="text-[8px] font-bold text-muted-foreground/50 truncate max-w-full">
                {labels[i]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({
  segments,
  size = 120,
  strokeWidth = 14,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const segmentOffsets = segments.reduce<number[]>(
    (offsets, segment, index) => {
      if (index === 0) {
        offsets.push(0);
        return offsets;
      }

      const previousTotal = segments
        .slice(0, index)
        .reduce((sum, currentSegment) => sum + currentSegment.value, 0);

      offsets.push((previousTotal / total) * circumference);
      return offsets;
    },
    [],
  );

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        {segments.map((segment, i) => {
          const dashLength = (segment.value / total) * circumference;
          const dashOffset = -segmentOffsets[i];

          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black">{total}</span>
        <span className="text-[9px] font-bold text-muted-foreground">
          TOTAL
        </span>
      </div>
    </div>
  );
}

function HorizontalBar({
  label,
  value,
  max,
  color,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold truncate">{label}</span>
        <span className="font-black tabular-nums text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ───────── Main Component ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export default function CourseAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "course-analytics", courseId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses/${courseId}/analytics`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Failed to fetch analytics",
        );
      }

      if (result.data === undefined) {
        throw new Error("No data received from analytics API");
      }

      return result.data as AnalyticsData;
    },
    enabled: !!courseId,
    retry: 1,
  });

  const handleExportStudents = () => {
    window.open(
      `/api/admin/courses/export?type=students&courseId=${courseId}`,
      "_blank",
    );
  };

  // ───────── Error ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-6 text-center">
        <div className="h-20 w-20 rounded-3xl bg-destructive/10 flex items-center justify-center text-destructive animate-bounce">
          <BarChart3 className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black">
            فشل تحميل
            التحليلات
          </h2>
          <p className="text-sm text-muted-foreground font-medium max-w-sm">
            {(error as Error).message ||
              "حدث خطأ غير متوقع أثناء جلب البيانات من الخادم"}
          </p>
        </div>
        <AdminButton
          variant="outline"
          className="rounded-xl px-8"
          onClick={() => window.location.reload()}
        >
          إعادة المحاولة
        </AdminButton>
      </div>
    );
  }

  // ───────── Loading ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
            <div
              className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-b-primary/30"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            />
          </div>
          <p className="text-sm font-bold text-muted-foreground animate-pulse">
            جاري تحميل
            التحليلات...
          </p>
        </div>
      </div>
    );
  }

  const maxContentDuration = Math.max(
    ...analytics.contentPerformance.map((c) => c.totalDuration),
    1,
  );

  return (
    <div className="space-y-8 pb-20" dir="rtl">
      {/* ───────── Header ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <AdminButton
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => router.push(`/admin/courses/${courseId}`)}
          >
            <ArrowRight className="h-5 w-5" />
          </AdminButton>
          <div>
            <h1 className="text-2xl font-black">
              تحليلات الدورة
              التعليمية
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              {analytics.course.name}
            </p>
          </div>
        </div>
        <AdminButton
          variant="outline"
          className="gap-2 rounded-xl"
          onClick={handleExportStudents}
        >
          <Download className="h-4 w-4" />
          تصدير بيانات
          الطلاب
        </AdminButton>
      </div>

      {/* ───────── Quick Stats ───────────────────────────────────────────────────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AdminCard className="relative overflow-hidden p-5 group">
          <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-blue-500/20 blur-3xl opacity-20 group-hover:opacity-40 transition" />
          <div className="relative space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                إجمالي
                التسجيلات
              </p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <p className="text-3xl font-black">{analytics.totalEnrollments}</p>
            <SparklineChart
              data={analytics.enrollmentTrends.map((t) => t.count)}
              color="rgb(59 130 246)"
            />
          </div>
        </AdminCard>

        <AdminCard className="relative overflow-hidden p-5 group">
          <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/20 blur-3xl opacity-20 group-hover:opacity-40 transition" />
          <div className="relative space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                إجمالي الإيرادات
              </p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-500">
              {analytics.revenue.total.toLocaleString()}{" "}
              <span className="text-sm">EGP</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              ط¢خر 30 يوم:{" "}
              {analytics.revenue.recent30Days.toLocaleString()} EGP
            </p>
          </div>
        </AdminCard>

        <AdminCard className="relative overflow-hidden p-5 group">
          <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-amber-500/20 blur-3xl opacity-20 group-hover:opacity-40 transition" />
          <div className="relative space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                متوسط التقييم
              </p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black">
                {analytics.avgRating > 0 ? analytics.avgRating : "—"}
              </p>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      "h-3 w-3",
                      s <= Math.round(analytics.avgRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/20",
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {analytics.reviewCount} تقييم
            </p>
          </div>
        </AdminCard>

        <AdminCard className="relative overflow-hidden p-5 group">
          <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-violet-500/20 blur-3xl opacity-20 group-hover:opacity-40 transition" />
          <div className="relative space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                متوسط التقدم
              </p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <Target className="h-5 w-5 text-violet-500" />
              </div>
            </div>
            <p className="text-3xl font-black">{analytics.avgProgress}%</p>
            <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-700"
                style={{ width: `${analytics.avgProgress}%` }}
              />
            </div>
          </div>
        </AdminCard>

        <AdminCard className="relative overflow-hidden p-5 group">
          <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-cyan-500/20 blur-3xl opacity-20 group-hover:opacity-40 transition" />
          <div className="relative space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                مدة فيديو المقدمة
              </p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                <Clock className="h-5 w-5 text-cyan-500" />
              </div>
            </div>
            <p className="text-3xl font-black">
              {analytics.course.trailerDurationMinutes > 0
                ? analytics.course.trailerDurationMinutes
                : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {analytics.course.trailerDurationMinutes > 0
                ? "دقيقة"
                : "لا توجد مدة محفوظة"}
            </p>
          </div>
        </AdminCard>
      </div>

      {/* ───────── Enrollment Trends + Progress Distribution ─────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <AdminCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-black">
                  اتجاف، التسجيلات
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  ط¢خر 30 يوم
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="rounded-full px-3 font-bold text-xs"
            >
              {analytics.enrollmentTrends.reduce((s, t) => s + t.count, 0)}{" "}
              تسجيل
            </Badge>
          </div>
          <BarChart
            data={analytics.enrollmentTrends.map((t) => t.count)}
            labels={analytics.enrollmentTrends.map((t) => t.date.slice(8))}
            color="rgb(59 130 246)"
            height={160}
          />
        </AdminCard>

        <AdminCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Target className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h3 className="font-black">
                توزيس التقدم
              </h3>
              <p className="text-[11px] text-muted-foreground">
                حالة تقدم الطلاب
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center mb-6">
            <DonutChart
              segments={[
                {
                  value: analytics.progressDistribution.completed,
                  color: "#10b981",
                  label: "مكتمل",
                },
                {
                  value: analytics.progressDistribution.halfWay,
                  color: "#3b82f6",
                  label: "نصف الطريق",
                },
                {
                  value: analytics.progressDistribution.inProgress,
                  color: "#f59e0b",
                  label: "قيد التعلم",
                },
                {
                  value: analytics.progressDistribution.notStarted,
                  color: "#6b7280",
                  label: "لم يبدأ",
                },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: "مكتمل",
                value: analytics.progressDistribution.completed,
                color: "bg-emerald-500",
              },
              {
                label: "نصف الطريق",
                value: analytics.progressDistribution.halfWay,
                color: "bg-blue-500",
              },
              {
                label: "قيد التعلم",
                value: analytics.progressDistribution.inProgress,
                color: "bg-amber-500",
              },
              {
                label: "لم يبدأ",
                value: analytics.progressDistribution.notStarted,
                color: "bg-gray-500",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-[11px]"
              >
                <div className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
                <span className="font-bold">{item.label}</span>
                <span className="font-black text-muted-foreground mr-auto tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      {/* ───────── Rating Distribution + Revenue ───────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Star className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-black">
                توزيس التقييمات
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {analytics.reviewCount} تقييم
                إجمالي
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((r) => {
              const count = analytics.ratingDistribution[r] || 0;
              const maxRating = Math.max(
                ...Object.values(analytics.ratingDistribution),
                1,
              );
              const barColors: Record<number, string> = {
                5: "#10b981",
                4: "#84cc16",
                3: "#f59e0b",
                2: "#f97316",
                1: "#ef4444",
              };
              return (
                <div key={r} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-10">
                    <span className="text-xs font-black tabular-nums">{r}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1 h-3 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(count / maxRating) * 100}%`,
                        backgroundColor: barColors[r],
                      }}
                    />
                  </div>
                  <span className="w-8 text-left text-xs font-black tabular-nums">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-black">
                تفاصيل الإيرادات
              </h3>
              <p className="text-[11px] text-muted-foreground">
                ملخص مالي للدورة
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-4">
                <p className="text-[10px] font-bold text-muted-foreground">
                  الإيرادات
                  الإجمالية
                </p>
                <p className="text-2xl font-black text-emerald-500 mt-1">
                  {analytics.revenue.total.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">EGP</p>
              </div>
              <div className="rounded-2xl bg-blue-500/5 border border-blue-500/10 p-4">
                <p className="text-[10px] font-bold text-muted-foreground">
                  ط¢خر 30 يوم
                </p>
                <p className="text-2xl font-black text-blue-500 mt-1">
                  {analytics.revenue.recent30Days.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">EGP</p>
              </div>
            </div>
            <div className="rounded-2xl bg-muted/20 border p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground">
                  سعر الدورة
                </p>
                <p className="text-lg font-black mt-1">
                  {analytics.revenue.pricePerStudent} EGP
                </p>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-muted-foreground">
                  عدد الطلاب
                </p>
                <p className="text-lg font-black mt-1">
                  {analytics.totalEnrollments}
                </p>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-muted-foreground">
                  متوسط لكل طالب
                </p>
                <p className="text-lg font-black mt-1">
                  {analytics.revenue.pricePerStudent} EGP
                </p>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* ───────── Content Performance ───────────────────────────────────────────────────────────────────────────────── */}
      <AdminCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Layers className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h3 className="font-black">
                أداء المحتوفذ
              </h3>
              <p className="text-[11px] text-muted-foreground">
                تفاصيل الوحدات
                التعليمية
                والدروس
              </p>
            </div>
          </div>
        </div>

        {analytics.contentPerformance.length > 0 ? (
          <div className="space-y-4">
            {analytics.contentPerformance.map((topic, i) => (
              <HorizontalBar
                key={i}
                label={topic.name}
                value={topic.totalDuration}
                max={maxContentDuration}
                color={`hsl(${(i * 40 + 200) % 360}, 70%, 55%)`}
                suffix={` د — ${topic.lessonsCount} درس`}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-bold text-muted-foreground">
              لم يتم إضافة
              محتوفذ بعد
            </p>
          </div>
        )}
      </AdminCard>

      {/* ───────── Comparison with Other Courses ────────────────────────────────────────────────────── */}
      <AdminCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
            <BarChart3 className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <h3 className="font-black">
              مقارنة مع
              الدورات الأخرفذ
            </h3>
            <p className="text-[11px] text-muted-foreground">
              ترتيب حسب عدد
              التسجيلات
            </p>
          </div>
        </div>

        {analytics.comparison.length > 0 ? (
          <div className="space-y-3">
            {analytics.comparison
              .sort((a, b) => b.enrollments - a.enrollments)
              .map((course, i) => (
                <div
                  key={course.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl p-3 transition-all",
                    course.isCurrent
                      ? "bg-primary/5 border border-primary/20 ring-1 ring-primary/10"
                      : "bg-muted/10 hover:bg-muted/20",
                  )}
                >
                  <span className="text-xs font-black text-muted-foreground w-6 text-center tabular-nums">
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "text-sm font-bold truncate",
                        course.isCurrent && "text-primary",
                      )}
                    >
                      {course.name}
                      {course.isCurrent && (
                        <Badge className="mr-2 rounded-full px-2 h-4 text-[8px] font-bold bg-primary/10 text-primary border-primary/20">
                          الدورة
                          الحالية
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span className="font-bold tabular-nums">
                        {course.enrollments}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="font-bold tabular-nums">
                        {course.rating > 0
                          ? course.rating.toFixed(1)
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-500">
                      <DollarSign className="h-3 w-3" />
                      <span className="font-bold tabular-nums">
                        {course.price}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-bold text-muted-foreground">
              لا توجد بيانات
              مقارنة متاحة
            </p>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

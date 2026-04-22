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

// أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ Types أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬
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

// أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ CSS Mini Chart Components أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬
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

// أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ Main Component أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬
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

  // أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ Error أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-6 text-center">
        <div className="h-20 w-20 rounded-3xl bg-destructive/10 flex items-center justify-center text-destructive animate-bounce">
          <BarChart3 className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black">
            فطآ´ظâ€‍ طھطآ­ظâ€¦يظâ€‍
            طآ§ظâ€‍طھطآ­ظâ€‍يظâ€‍طآ§طھ
          </h2>
          <p className="text-sm text-muted-foreground font-medium max-w-sm">
            {(error as Error).message ||
              "طآ­طآ¯طآ« طآ®طآ·طآ£ غيطآ± ظâ€¦طھظث†ظâ€ڑطآ¹ طآ£طآ«ظâ€ طآ§ء طآ¬ظâ€‍طآ¨ طآ§ظâ€‍طآ¨يطآ§ظâ€ طآ§طھ ظâ€¦ظâ€  طآ§ظâ€‍طآ®طآ§طآ¯ظâ€¦"}
          </p>
        </div>
        <AdminButton
          variant="outline"
          className="rounded-xl px-8"
          onClick={() => window.location.reload()}
        >
          طآ¥طآ¹طآ§طآ¯طآ© طآ§ظâ€‍ظâ€¦طآ­طآ§ظث†ظâ€‍طآ©
        </AdminButton>
      </div>
    );
  }

  // أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ Loading أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬
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
            طآ¬طآ§طآ±ي طھطآ­ظâ€¦يظâ€‍
            طآ§ظâ€‍طھطآ­ظâ€‍يظâ€‍طآ§طھ...
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
      {/* أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ Header أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ */}
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
              طھطآ­ظâ€‍يظâ€‍طآ§طھ طآ§ظâ€‍طآ¯ظث†طآ±طآ©
              طآ§ظâ€‍طھطآ¹ظâ€‍يظâ€¦يطآ©
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
          طھطآµطآ¯يطآ± طآ¨يطآ§ظâ€ طآ§طھ
          طآ§ظâ€‍طآ·ظâ€‍طآ§طآ¨
        </AdminButton>
      </div>

      {/* أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ Quick Stats أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AdminCard className="relative overflow-hidden p-5 group">
          <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-blue-500/20 blur-3xl opacity-20 group-hover:opacity-40 transition" />
          <div className="relative space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                طآ¥طآ¬ظâ€¦طآ§ظâ€‍ي
                طآ§ظâ€‍طھطآ³طآ¬يظâ€‍طآ§طھ
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
                طآ¥طآ¬ظâ€¦طآ§ظâ€‍ي طآ§ظâ€‍طآ¥يطآ±طآ§طآ¯طآ§طھ
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
              طآ¢طآ®طآ± 30 يظث†ظâ€¦:{" "}
              {analytics.revenue.recent30Days.toLocaleString()} EGP
            </p>
          </div>
        </AdminCard>

        <AdminCard className="relative overflow-hidden p-5 group">
          <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-amber-500/20 blur-3xl opacity-20 group-hover:opacity-40 transition" />
          <div className="relative space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                ظâ€¦طھظث†طآ³طآ· طآ§ظâ€‍طھظâ€ڑييظâ€¦
              </p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black">
                {analytics.avgRating > 0 ? analytics.avgRating : "أ¢â‚¬â€‌"}
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
              {analytics.reviewCount} طھظâ€ڑييظâ€¦
            </p>
          </div>
        </AdminCard>

        <AdminCard className="relative overflow-hidden p-5 group">
          <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-violet-500/20 blur-3xl opacity-20 group-hover:opacity-40 transition" />
          <div className="relative space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                ظâ€¦طھظث†طآ³طآ· طآ§ظâ€‍طھظâ€ڑطآ¯ظâ€¦
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

      {/* أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ Enrollment Trends + Progress Distribution أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <AdminCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-black">
                  طآ§طھطآ¬طآ§ظâ€، طآ§ظâ€‍طھطآ³طآ¬يظâ€‍طآ§طھ
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  طآ¢طآ®طآ± 30 يظث†ظâ€¦
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="rounded-full px-3 font-bold text-xs"
            >
              {analytics.enrollmentTrends.reduce((s, t) => s + t.count, 0)}{" "}
              طھطآ³طآ¬يظâ€‍
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
                طھظث†طآ²يطآ¹ طآ§ظâ€‍طھظâ€ڑطآ¯ظâ€¦
              </h3>
              <p className="text-[11px] text-muted-foreground">
                طآ­طآ§ظâ€‍طآ© طھظâ€ڑطآ¯ظâ€¦ طآ§ظâ€‍طآ·ظâ€‍طآ§طآ¨
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center mb-6">
            <DonutChart
              segments={[
                {
                  value: analytics.progressDistribution.completed,
                  color: "#10b981",
                  label: "ظâ€¦ظئ’طھظâ€¦ظâ€‍",
                },
                {
                  value: analytics.progressDistribution.halfWay,
                  color: "#3b82f6",
                  label: "ظâ€ طآµف طآ§ظâ€‍طآ·طآ±يظâ€ڑ",
                },
                {
                  value: analytics.progressDistribution.inProgress,
                  color: "#f59e0b",
                  label: "ظâ€ڑيطآ¯ طآ§ظâ€‍طھطآ¹ظâ€‍ظâ€¦",
                },
                {
                  value: analytics.progressDistribution.notStarted,
                  color: "#6b7280",
                  label: "ظâ€‍ظâ€¦ يطآ¨طآ¯طآ£",
                },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: "ظâ€¦ظئ’طھظâ€¦ظâ€‍",
                value: analytics.progressDistribution.completed,
                color: "bg-emerald-500",
              },
              {
                label: "ظâ€ طآµف طآ§ظâ€‍طآ·طآ±يظâ€ڑ",
                value: analytics.progressDistribution.halfWay,
                color: "bg-blue-500",
              },
              {
                label: "ظâ€ڑيطآ¯ طآ§ظâ€‍طھطآ¹ظâ€‍ظâ€¦",
                value: analytics.progressDistribution.inProgress,
                color: "bg-amber-500",
              },
              {
                label: "ظâ€‍ظâ€¦ يطآ¨طآ¯طآ£",
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

      {/* أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ Rating Distribution + Revenue أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Star className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-black">
                طھظث†طآ²يطآ¹ طآ§ظâ€‍طھظâ€ڑييظâ€¦طآ§طھ
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {analytics.reviewCount} طھظâ€ڑييظâ€¦
                طآ¥طآ¬ظâ€¦طآ§ظâ€‍ي
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
                طھفطآ§طآµيظâ€‍ طآ§ظâ€‍طآ¥يطآ±طآ§طآ¯طآ§طھ
              </h3>
              <p className="text-[11px] text-muted-foreground">
                ظâ€¦ظâ€‍طآ®طآµ ظâ€¦طآ§ظâ€‍ي ظâ€‍ظâ€‍طآ¯ظث†طآ±طآ©
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-4">
                <p className="text-[10px] font-bold text-muted-foreground">
                  طآ§ظâ€‍طآ¥يطآ±طآ§طآ¯طآ§طھ
                  طآ§ظâ€‍طآ¥طآ¬ظâ€¦طآ§ظâ€‍يطآ©
                </p>
                <p className="text-2xl font-black text-emerald-500 mt-1">
                  {analytics.revenue.total.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">EGP</p>
              </div>
              <div className="rounded-2xl bg-blue-500/5 border border-blue-500/10 p-4">
                <p className="text-[10px] font-bold text-muted-foreground">
                  طآ¢طآ®طآ± 30 يظث†ظâ€¦
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
                  طآ³طآ¹طآ± طآ§ظâ€‍طآ¯ظث†طآ±طآ©
                </p>
                <p className="text-lg font-black mt-1">
                  {analytics.revenue.pricePerStudent} EGP
                </p>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-muted-foreground">
                  طآ¹طآ¯طآ¯ طآ§ظâ€‍طآ·ظâ€‍طآ§طآ¨
                </p>
                <p className="text-lg font-black mt-1">
                  {analytics.totalEnrollments}
                </p>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-muted-foreground">
                  ظâ€¦طھظث†طآ³طآ· ظâ€‍ظئ’ظâ€‍ طآ·طآ§ظâ€‍طآ¨
                </p>
                <p className="text-lg font-black mt-1">
                  {analytics.revenue.pricePerStudent} EGP
                </p>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ Content Performance أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ */}
      <AdminCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Layers className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h3 className="font-black">
                طآ£طآ¯طآ§ء طآ§ظâ€‍ظâ€¦طآ­طھظث†ظâ€°
              </h3>
              <p className="text-[11px] text-muted-foreground">
                طھفطآ§طآµيظâ€‍ طآ§ظâ€‍ظث†طآ­طآ¯طآ§طھ
                طآ§ظâ€‍طھطآ¹ظâ€‍يظâ€¦يطآ©
                ظث†طآ§ظâ€‍طآ¯طآ±ظث†طآ³
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
                suffix={` طآ¯ أ¢â‚¬â€‌ ${topic.lessonsCount} طآ¯طآ±طآ³`}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-bold text-muted-foreground">
              ظâ€‍ظâ€¦ يطھظâ€¦ طآ¥طآ¶طآ§فطآ©
              ظâ€¦طآ­طھظث†ظâ€° طآ¨طآ¹طآ¯
            </p>
          </div>
        )}
      </AdminCard>

      {/* أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ Comparison with Other Courses أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ */}
      <AdminCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
            <BarChart3 className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <h3 className="font-black">
              ظâ€¦ظâ€ڑطآ§طآ±ظâ€ طآ© ظâ€¦طآ¹
              طآ§ظâ€‍طآ¯ظث†طآ±طآ§طھ طآ§ظâ€‍طآ£طآ®طآ±ظâ€°
            </h3>
            <p className="text-[11px] text-muted-foreground">
              طھطآ±طھيطآ¨ طآ­طآ³طآ¨ طآ¹طآ¯طآ¯
              طآ§ظâ€‍طھطآ³طآ¬يظâ€‍طآ§طھ
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
                          طآ§ظâ€‍طآ¯ظث†طآ±طآ©
                          طآ§ظâ€‍طآ­طآ§ظâ€‍يطآ©
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
                          : "أ¢â‚¬â€‌"}
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
              ظâ€‍طآ§ طھظث†طآ¬طآ¯ طآ¨يطآ§ظâ€ طآ§طھ
              ظâ€¦ظâ€ڑطآ§طآ±ظâ€ طآ© ظâ€¦طھطآ§طآ­طآ©
            </p>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Users,
  DollarSign,
  BookOpen,
  TrendingUp,
  BarChart3,
  Star,
  Globe,
  Zap,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface CourseStatsProps {
  stats: {
    totalEnrollments: number;
    totalRevenue: number;
    activeStudents: number;
    avgCompletion: number;
    totalCourses?: number;
    publishedCourses?: number;
    draftCourses?: number;
    growth: {
      enrollments: number;
      revenue: number;
    };
  };
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: "blue" | "green" | "purple" | "amber" | "rose" | "teal";
  trend?: { value: number; isPositive: boolean; label: string };
  description?: string;
  sub?: string;
}

const colorMap = {
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: "text-blue-500 bg-blue-500/10",
    trend: "text-blue-500",
    badge: "bg-blue-500/10 text-blue-600",
  },
  green: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: "text-emerald-500 bg-emerald-500/10",
    trend: "text-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600",
  },
  purple: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    icon: "text-violet-500 bg-violet-500/10",
    trend: "text-violet-500",
    badge: "bg-violet-500/10 text-violet-600",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: "text-amber-500 bg-amber-500/10",
    trend: "text-amber-500",
    badge: "bg-amber-500/10 text-amber-600",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    icon: "text-rose-500 bg-rose-500/10",
    trend: "text-rose-500",
    badge: "bg-rose-500/10 text-rose-600",
  },
  teal: {
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    icon: "text-teal-500 bg-teal-500/10",
    trend: "text-teal-500",
    badge: "bg-teal-500/10 text-teal-600",
  },
};

function StatCard({ title, value, icon: Icon, color, trend, description, sub }: StatCardProps) {
  const colors = colorMap[color];
  return (
    <div
      className={cn(
        "relative rounded-2xl border p-5 transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-xl",
        "bg-card/60 backdrop-blur-sm",
        colors.border
      )}
    >
      {/* Background glow */}
      <div className={cn("absolute inset-0 rounded-2xl opacity-30", colors.bg)} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-3 flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          <p className="text-2xl font-black tracking-tight truncate">{value}</p>
          {sub && (
            <p className="text-[11px] font-bold text-muted-foreground/70">{sub}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5">
              <TrendingUp
                className={cn("h-3 w-3", trend.isPositive ? "text-emerald-500" : "text-red-400 rotate-180")}
              />
              <span
                className={cn(
                  "text-[11px] font-black",
                  trend.isPositive ? "text-emerald-500" : "text-red-400"
                )}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-[10px] text-muted-foreground/60">{trend.label}</span>
            </div>
          )}
          {description && !trend && (
            <p className="text-[11px] text-muted-foreground/70 leading-5">{description}</p>
          )}
        </div>

        <div className={cn("rounded-2xl p-3 shrink-0", colors.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function CourseStats({ stats }: CourseStatsProps) {
  const publishRate =
    stats.totalCourses && stats.totalCourses > 0
      ? Math.round(((stats.publishedCourses ?? 0) / stats.totalCourses) * 100)
      : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-2" dir="rtl">
      <StatCard
        title="إجمالي الطلاب المسجلين"
        value={formatNumber(stats.totalEnrollments)}
        icon={Users}
        color="blue"
        trend={{
          value: stats.growth.enrollments,
          isPositive: stats.growth.enrollments >= 0,
          label: "الشهر الماضي",
        }}
      />
      <StatCard
        title="إجمالي الإيرادات المقدرة"
        value={`${formatNumber(stats.totalRevenue)} ج`}
        icon={DollarSign}
        color="green"
        trend={{
          value: stats.growth.revenue,
          isPositive: stats.growth.revenue >= 0,
          label: "الشهر الماضي",
        }}
      />
      <StatCard
        title="الدورات المنشورة"
        value={stats.publishedCourses ?? 0}
        icon={Globe}
        color="purple"
        sub={`من أصل ${stats.totalCourses ?? 0} دورة (${publishRate}٪ منشور)`}
      />
      <StatCard
        title="معدل الإكمال الكلي"
        value={`${stats.avgCompletion}%`}
        icon={BarChart3}
        color="amber"
        description={`${formatNumber(stats.activeStudents)} طالب يتعلمون الآن`}
      />
    </div>
  );
}

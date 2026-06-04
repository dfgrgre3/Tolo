"use client";

import * as React from "react";
import type { Variants } from "framer-motion";
import { m } from "framer-motion";
import {
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  Globe,
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
  delay?: number;
}

const colorMap = {
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: "text-blue-500 bg-blue-500/10",
    trend: "text-blue-500",
    glow: "from-blue-500/20 to-blue-500/0",
    ring: "ring-blue-500/10",
  },
  green: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: "text-emerald-500 bg-emerald-500/10",
    trend: "text-emerald-500",
    glow: "from-emerald-500/20 to-emerald-500/0",
    ring: "ring-emerald-500/10",
  },
  purple: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    icon: "text-violet-500 bg-violet-500/10",
    trend: "text-violet-500",
    glow: "from-violet-500/20 to-violet-500/0",
    ring: "ring-violet-500/10",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: "text-amber-500 bg-amber-500/10",
    trend: "text-amber-500",
    glow: "from-amber-500/20 to-amber-500/0",
    ring: "ring-amber-500/10",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    icon: "text-rose-500 bg-rose-500/10",
    trend: "text-rose-500",
    glow: "from-rose-500/20 to-rose-500/0",
    ring: "ring-rose-500/10",
  },
  teal: {
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    icon: "text-teal-500 bg-teal-500/10",
    trend: "text-teal-500",
    glow: "from-teal-500/20 to-teal-500/0",
    ring: "ring-teal-500/10",
  },
};

const cardAnimation: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

function StatCard({ title, value, icon: Icon, color, trend, description, sub, delay = 0 }: StatCardProps) {
  const colors = colorMap[color];
  const index = Math.round(delay / 50);

  return (
    <m.div
      custom={index}
      variants={cardAnimation}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "relative rounded-2xl border p-5 transition-all duration-500",
        "hover:shadow-xl hover:shadow-black/5",
        "bg-card/60 backdrop-blur-sm overflow-hidden group",
        colors.border,
      )}
    >
      {/* Background glow */}
      <div className={cn("absolute inset-0 rounded-2xl opacity-30 transition-opacity group-hover:opacity-50", colors.bg)} />
      <div className={cn("absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100 blur-2xl", colors.glow)} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-3 flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            {title}
          </p>
          <m.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08 + 0.3, duration: 0.4 }}
            className="text-2xl font-black tracking-tight truncate"
          >
            {value}
          </m.p>
          {sub && (
            <p className="text-[11px] font-bold text-muted-foreground/70">{sub}</p>
          )}
          {trend && (
            <m.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 + 0.5, duration: 0.3 }}
              className="flex items-center gap-1.5"
            >
              <TrendingUp
                className={cn(
                  "h-3 w-3 transition-transform",
                  trend.isPositive ? "text-emerald-500" : "text-red-400 rotate-180",
                )}
              />
              <span
                className={cn(
                  "text-[11px] font-black",
                  trend.isPositive ? "text-emerald-500" : "text-red-400",
                )}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-[10px] text-muted-foreground/60">{trend.label}</span>
            </m.div>
          )}
          {description && !trend && (
            <p className="text-[11px] text-muted-foreground/70 leading-5">{description}</p>
          )}
        </div>

        <m.div
          whileHover={{ scale: 1.15, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
          className={cn("rounded-2xl p-3 shrink-0", colors.icon)}
        >
          <Icon className="h-5 w-5" />
        </m.div>
      </div>
    </m.div>
  );
}

export function CourseStats({ stats }: CourseStatsProps) {
  const publishRate =
    stats.totalCourses && stats.totalCourses > 0
      ? Math.round(((stats.publishedCourses ?? 0) / stats.totalCourses) * 100)
      : 0;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-2" dir="rtl">
      <StatCard
        title="إجمالي الطلاب المسجلين"
        value={formatNumber(stats.totalEnrollments)}
        icon={Users}
        color="blue"
        delay={0}
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
        delay={50}
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
        delay={100}
        sub={`من أصل ${stats.totalCourses ?? 0} دورة (${publishRate}٪ منشور)`}
      />
      <StatCard
        title="معدل الإكمال الكلي"
        value={`${stats.avgCompletion}%`}
        icon={BarChart3}
        color="amber"
        delay={150}
        description={`${formatNumber(stats.activeStudents)} طالب يتعلمون الآن`}
      />
    </div>
  );
}
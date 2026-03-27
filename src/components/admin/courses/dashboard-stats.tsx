"use client";

import * as React from "react";
import { 
  Users, 
  DollarSign, 
  GraduationCap, 
  TrendingUp, 
  BookOpen,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { AdminCard, AdminStatsCard } from "@/components/admin/ui/admin-card";
import { formatNumber } from "@/lib/utils";

interface CourseStatsProps {
  stats: {
    totalEnrollments: number;
    totalRevenue: number;
    activeStudents: number;
    avgCompletion: number;
    growth: {
      enrollments: number;
      revenue: number;
    };
  };
}

export function CourseStats({ stats }: CourseStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <AdminStatsCard
        title="إجمالي الطلاب"
        value={stats.totalEnrollments}
        icon={Users}
        color="blue"
        trend={{
          value: stats.growth.enrollments,
          isPositive: stats.growth.enrollments >= 0,
          label: "منذ الشهر الماضي"
        }}
      />
      <AdminStatsCard
        title="إجمالي الإيرادات"
        value={`${formatNumber(stats.totalRevenue)} EGP`}
        icon={DollarSign}
        color="green"
        trend={{
          value: stats.growth.revenue,
          isPositive: stats.growth.revenue >= 0,
          label: "منذ الشهر الماضي"
        }}
      />
      <AdminStatsCard
        title="الطلاب النشطين"
        value={stats.activeStudents}
        icon={Zap}
        color="purple"
        description="متواجدون حالياً في المنصة"
      />
      <AdminStatsCard
        title="معدل الإكمال"
        value={`${stats.avgCompletion}%`}
        icon={GraduationCap}
        color="yellow"
        description="متوسط تقدم الطلاب في الدورات"
      />
    </div>
  );
}

const Zap = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

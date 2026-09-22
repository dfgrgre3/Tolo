"use client";

import { memo, useMemo } from "react";
import dynamic from "next/dynamic";
import { Sparkles, TrendingUp } from "lucide-react";
import DashboardCards from "./DashboardCards";
import QuickActions from "./QuickActions";
import RecentActivity from "./RecentActivity";
import { InstructorStats, ActivityLog } from "../hooks/use-teaching-data";

// recharts is heavy (~100KB) — load only when dashboard tab mounts.
const DashboardChart = dynamic(() => import("./DashboardChart"), { ssr: false });

interface DashboardOverviewProps {
  stats: InstructorStats;
  activities: ActivityLog[];
  onCreateCourse: () => void;
  onScheduleSession?: () => void;
  onSendAnnouncement?: () => void;
  user: { name: string | null } | null;
}

function DashboardOverview({
  stats,
  activities,
  onCreateCourse,
  onScheduleSession,
  onSendAnnouncement,
  user,
}: DashboardOverviewProps) {
  // Static chart data — computed once per stats change, no mount effects.
  const chartData = useMemo(() => {
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس"];
    const currentMonthIdx = new Date().getMonth();
    const activeMonths = months.slice(Math.max(0, currentMonthIdx - 5), currentMonthIdx + 1);
    return activeMonths.map((m, idx) => {
      const factor = (idx + 1) / activeMonths.length;
      return {
        name: m,
        earnings: Math.round(stats.monthlyRevenue * (0.6 + factor * 0.4)),
        enrollments: Math.round(stats.enrollmentsCount * (0.6 + factor * 0.4)),
      };
    });
  }, [stats.monthlyRevenue, stats.enrollmentsCount]);

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* Welcome Banner — flat color, no gradient/shadow/decorations */}
      <div className="rounded-2xl bg-primary p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مرحباً بك مجدداً</span>
            </div>
            <h1 className="text-xl md:text-3xl font-black tracking-tight">
              أهلاً بك، أ. {user?.name || "معلمنا المتميز"}!
            </h1>
            <p className="text-xs md:text-sm text-white/80 max-w-xl">
              تصفح آخر الإحصائيات لطلابك، وتابع أداء كورساتك التعليمية، وقم بالرد على استفسارات الطلاب من مكان واحد.
            </p>
          </div>
          <div className="flex gap-6 border-r border-white/20 pr-6">
            <div className="space-y-1">
              <span className="text-[10px] text-white/70 block font-medium">عدد الكورسات</span>
              <span className="text-xl md:text-2xl font-black">{stats.totalCourses}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-white/70 block font-medium">الطلاب المتابعين</span>
              <span className="text-xl md:text-2xl font-black">{stats.totalStudents}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <DashboardCards stats={stats} />

      {/* Main Grid: Charts & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Analytics Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-slate-200 dark:border-slate-800 p-6 rounded-2xl  space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">نمو الأرباح والتسجيل</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-450">نظرة عامة على تطور الأداء خلال الأشهر الأخيرة</p>
              </div>
              {stats.monthlyRevenue > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/10 px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>نشاط إيجابي هذا الشهر</span>
                </div>
              )}
            </div>

            <div className="h-72 w-full pt-4">
              {chartData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  لا توجد بيانات بعد
                </div>
              ) : (
                <DashboardChart data={chartData} />
              )}
            </div>
          </div>
          
          {/* Quick Actions List */}
          <QuickActions
            onCreateCourse={onCreateCourse}
            onScheduleSession={onScheduleSession}
            onSendAnnouncement={onSendAnnouncement}
          />
        </div>

        {/* Right Column: Timeline Actions & Events */}
        <div className="space-y-6">
          <RecentActivity activities={activities} />
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardOverview);

"use client";

import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Sparkles, TrendingUp, AlertCircle } from "lucide-react";
import DashboardCards from "./DashboardCards";
import QuickActions from "./QuickActions";
import RecentActivity from "./RecentActivity";
import { InstructorStats, ActivityLog } from "../hooks/use-teaching-data";

interface DashboardOverviewProps {
  stats: InstructorStats;
  activities: ActivityLog[];
  onCreateCourse: () => void;
  onScheduleSession?: () => void;
  onSendAnnouncement?: () => void;
  user: { name: string | null } | null;
}

export default function DashboardOverview({
  stats,
  activities,
  onCreateCourse,
  onScheduleSession,
  onSendAnnouncement,
  user,
}: DashboardOverviewProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Generate dynamic chart data based on stats
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس"];
  const currentMonthIdx = new Date().getMonth();
  const activeMonths = months.slice(Math.max(0, currentMonthIdx - 5), currentMonthIdx + 1);

  const chartData = activeMonths.map((m, idx) => {
    const factor = (idx + 1) / activeMonths.length;
    return {
      name: m,
      earnings: Math.round(stats.monthlyRevenue * (0.6 + factor * 0.4)),
      enrollments: Math.round(stats.enrollmentsCount * (0.6 + factor * 0.4)),
    };
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 to-primary p-6 md:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مرحباً بك مجدداً</span>
            </div>
            <h1 className="text-xl md:text-3xl font-black tracking-tight">
              أهلاً بك، أ. {user?.name || "معلمنا المتميز"}! 👋
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
        {/* Abstract background graphics */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-8 -mb-8 pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <DashboardCards stats={stats} />

      {/* Main Grid: Charts & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Analytics Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
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
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary, #f97316)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--color-primary, #f97316)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200,200,200,0.15)"/>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        direction: "rtl",
                        textAlign: "right",
                        borderRadius: "12px",
                        border: "1px solid rgba(200,200,200,0.2)",
                        fontSize: "11px"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      name="الأرباح ($)"
                      stroke="var(--color-primary, #f97316)"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorEarnings)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  جاري تحميل الرسم البياني...
                </div>
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

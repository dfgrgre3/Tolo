"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, BookOpen } from "lucide-react";

const revenueData = [
  { month: "يناير", revenue: 1200 },
  { month: "فبراير", revenue: 2100 },
  { month: "مارس", revenue: 1800 },
  { month: "أبريل", revenue: 3400 },
  { month: "مايو", revenue: 3100 },
  { month: "يونيو", revenue: 4500 },
  { month: "يوليو", revenue: 5200 },
];

const studentGrowthData = [
  { month: "يناير", students: 150 },
  { month: "فبراير", students: 280 },
  { month: "مارس", students: 420 },
  { month: "أبريل", students: 510 },
  { month: "مايو", students: 690 },
  { month: "يونيو", students: 850 },
  { month: "يوليو", students: 1100 },
];

const trafficData = [
  { name: "البحث المباشر", value: 400 },
  { name: "وسائل التواصل", value: 300 },
  { name: "الإحالات", value: 200 },
  { name: "الحملات الإعلانية", value: 100 },
];

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#a855f7"];

export default function AnalyticsPanel() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">تحليلات الأداء والتقارير</h3>
        <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">تفحص مصادر الزيارات، ونسب التسجيل ونمو الأرباح التفصيلي</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Area Chart */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">تحليلات الأرباح الشهرية</CardTitle>
          </CardHeader>
          <CardContent className="h-80 pt-4">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200,200,200,0.1)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ direction: "rtl", textAlign: "right", borderRadius: "12px", border: "1px solid rgba(200,200,200,0.2)" }} />
                  <Area type="monotone" dataKey="revenue" name="الإيرادات ($)" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">جاري التحميل...</div>
            )}
          </CardContent>
        </Card>

        {/* Student Growth Bar Chart */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">معدل نمو الطلاب</CardTitle>
          </CardHeader>
          <CardContent className="h-80 pt-4">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200,200,200,0.1)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ direction: "rtl", textAlign: "right", borderRadius: "12px", border: "1px solid rgba(200,200,200,0.2)" }} />
                  <Bar dataKey="students" name="الطلاب الجدد" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">جاري التحميل...</div>
            )}
          </CardContent>
        </Card>

        {/* Traffic Sources Pie Chart */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">مصادر زيارات الكورسات</CardTitle>
          </CardHeader>
          <CardContent className="h-80 pt-4 flex flex-col md:flex-row items-center justify-around gap-6">
            <div className="w-full h-60 md:w-1/2">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={trafficData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {trafficData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ direction: "rtl", textAlign: "right", borderRadius: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">جاري التحميل...</div>
              )}
            </div>
            
            {/* Legend info */}
            <div className="space-y-3 w-full md:w-1/3">
              {trafficData.map((data, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                    <span className="text-slate-700 dark:text-slate-300">{data.name}</span>
                  </div>
                  <span className="text-slate-500">{data.value} زيارة</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

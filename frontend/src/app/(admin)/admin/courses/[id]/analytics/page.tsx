"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

const performanceData = [
  { name: "يناير", revenue: 4000, students: 240 },
  { name: "فبراير", revenue: 3000, students: 198 },
  { name: "مارس", revenue: 2000, students: 980 },
  { name: "أبريل", revenue: 2780, students: 390 },
  { name: "مايو", revenue: 1890, students: 480 },
  { name: "يونيو", revenue: 2390, students: 380 },
];

const deviceData = [
  { name: "موبايل", value: 65, color: "#3b82f6" },
  { name: "كمبيوتر", value: 30, color: "#8b5cf6" },
  { name: "تابلت", value: 5, color: "#10b981" },
];

export default function CourseAnalyticsPage() {
  const params = useParams();
  const courseId = params.id as string;

  return (
    <div className="space-y-8" dir="rtl">
      {/* Filters Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="h-10 rounded-xl px-4 border-primary/20 bg-primary/5 text-primary font-bold">
            <Calendar className="ml-2 h-4 w-4" />
            آخر 30 يوم
          </Badge>
          <AdminButton variant="outline" size="icon" className="h-10 w-10 rounded-xl">
            <Filter className="h-4 w-4" />
          </AdminButton>
        </div>
        <AdminButton variant="outline" className="gap-2 rounded-xl h-10 px-4 font-bold">
          <Download className="h-4 w-4" />
          تصدير التقرير
        </AdminButton>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "إجمالي المبيعات", value: "45,200 ج.م", change: "+12.5%", trend: "up", icon: DollarSign, color: "text-emerald-500" },
          { label: "تسجيلات جديدة", value: "124", change: "+18%", trend: "up", icon: Users, color: "text-blue-500" },
          { label: "معدل التحويل", value: "3.2%", change: "-2.4%", trend: "down", icon: TrendingUp, color: "text-violet-500" },
          { label: "وقت المشاهدة", value: "1,420 ساعة", change: "+5.4%", trend: "up", icon: BarChart3, color: "text-amber-500" },
        ].map((stat, i) => (
          <AdminCard key={i} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-xl bg-muted/50", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className={cn(
                "flex items-center text-[10px] font-black px-2 py-0.5 rounded-full",
                stat.trend === "up" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
              )}>
                {stat.trend === "up" ? <ArrowUpRight className="ml-1 h-3 w-3" /> : <ArrowDownRight className="ml-1 h-3 w-3" />}
                {stat.change}
              </div>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase">{stat.label}</p>
            <h3 className="text-2xl font-black mt-1">{stat.value}</h3>
          </AdminCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Revenue Chart */}
        <AdminCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black">نمو الإيرادات والطلاب</h3>
              <p className="text-xs text-muted-foreground">مقارنة شهرية للأداء المالي والنمو العددي</p>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #88888820', direction: 'rtl' }} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        {/* Device Distribution */}
        <AdminCard className="p-6">
          <h3 className="text-lg font-black mb-2">الأجهزة المستخدمة</h3>
          <p className="text-xs text-muted-foreground mb-8">من أين يشاهد طلابك المحتوى؟</p>
          
          <div className="h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black">65%</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">موبايل</span>
            </div>
          </div>

          <div className="space-y-3 mt-6">
            {deviceData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span>{item.value}%</span>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      {/* Student Activity / Engagement */}
      <AdminCard className="p-6">
        <h3 className="text-lg font-black mb-8">التفاعل مع الدروس</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <Tooltip cursor={{fill: '#88888810'}} contentStyle={{ borderRadius: '16px', border: '1px solid #88888820', direction: 'rtl' }} />
              <Bar dataKey="students" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AdminCard>
    </div>
  );
}

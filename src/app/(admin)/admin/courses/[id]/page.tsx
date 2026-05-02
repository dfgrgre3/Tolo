"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  PlayCircle,
  FileText,
  HelpCircle,
  ArrowUpRight,
  ChevronRight
} from "lucide-react";
import { apiRoutes } from "@/lib/api/routes";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

const data = [
  { name: "أسبوع 1", enrollments: 400, revenue: 2400 },
  { name: "أسبوع 2", enrollments: 300, revenue: 1398 },
  { name: "أسبوع 3", enrollments: 200, revenue: 9800 },
  { name: "أسبوع 4", enrollments: 278, revenue: 3908 },
  { name: "أسبوع 5", enrollments: 189, revenue: 4800 },
  { name: "أسبوع 6", enrollments: 239, revenue: 3800 },
  { name: "أسبوع 7", enrollments: 349, revenue: 4300 },
];

export default function CourseOverviewPage() {
  const params = useParams();
  const courseId = params.id as string;

  const { data: courseData, isLoading } = useQuery({
    queryKey: ["admin", "courses", courseId],
    queryFn: async () => {
      const response = await fetch(`${apiRoutes.admin.courses}/${courseId}`);
      if (!response.ok) throw new Error("Failed to load course");
      const result = await response.json();
      return result.data?.course || result.data || result;
    },
  });

  const course = courseData;

  if (isLoading) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Stats column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Performance Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AdminCard className="p-6 overflow-hidden relative group">
            <div className="absolute right-0 top-0 h-16 w-16 bg-blue-500/5 rounded-bl-[4rem] flex items-center justify-center transition-all group-hover:scale-110">
              <Users className="h-6 w-6 text-blue-500/40" />
            </div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">إجمالي المشتركين</p>
            <h3 className="text-3xl font-black mt-2">{course?._count?.enrollments || 0}</h3>
            <div className="mt-4 flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" />
              +12% من الشهر الماضي
            </div>
          </AdminCard>

          <AdminCard className="p-6 overflow-hidden relative group">
            <div className="absolute right-0 top-0 h-16 w-16 bg-emerald-500/5 rounded-bl-[4rem] flex items-center justify-center transition-all group-hover:scale-110">
              <DollarSign className="h-6 w-6 text-emerald-500/40" />
            </div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">صافي الأرباح</p>
            <h3 className="text-3xl font-black mt-2">{formatPrice((course?._count?.enrollments || 0) * (course?.price || 0))}</h3>
            <div className="mt-4 flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" />
              +8.5% نمو
            </div>
          </AdminCard>

          <AdminCard className="p-6 overflow-hidden relative group">
            <div className="absolute right-0 top-0 h-16 w-16 bg-violet-500/5 rounded-bl-[4rem] flex items-center justify-center transition-all group-hover:scale-110">
              <Clock className="h-6 w-6 text-violet-500/40" />
            </div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">متوسط الإكمال</p>
            <h3 className="text-3xl font-black mt-2">68%</h3>
            <div className="mt-4 flex items-center gap-1.5 text-blue-500 text-[10px] font-bold bg-blue-500/10 w-fit px-2 py-0.5 rounded-full">
              <ArrowUpRight className="h-3 w-3" />
              معدل مرتفع
            </div>
          </AdminCard>
        </div>

        {/* Chart */}
        <AdminCard className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black">إحصائيات التسجيل والإيرادات</h3>
              <p className="text-xs text-muted-foreground">تطور أداء الدورة خلال الـ 7 أسابيع الماضية</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="rounded-xl px-3 py-1 bg-blue-500/5 border-blue-500/20 text-blue-500 text-[10px] font-bold">التسجيلات</Badge>
              <Badge variant="outline" className="rounded-xl px-3 py-1 bg-emerald-500/5 border-emerald-500/20 text-emerald-500 text-[10px] font-bold">الإيرادات</Badge>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEnroll" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#888888' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#888888' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #88888820', backgroundColor: '#ffffff', fontWeight: 900, direction: 'rtl' }}
                />
                <Area type="monotone" dataKey="enrollments" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorEnroll)" />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      </div>

      {/* Sidebar Health column */}
      <div className="space-y-6">
        <AdminCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-black">جاهزية الدورة</h3>
          </div>

          <div className="space-y-4">
            {[
              { label: "المعلومات الأساسية", status: true },
              { label: "المحتوى التعليمي (الفصول)", status: (course?._count?.topics || 0) > 0 },
              { label: "فيديو المعاينة (Trailer)", status: !!course?.trailerUrl },
              { label: "إعدادات SEO", status: !!course?.seoTitle },
              { label: "المحاضر المسئول", status: !!course?.instructorId },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/50">
                <span className="text-xs font-bold text-foreground">{item.label}</span>
                {item.status ? (
                  <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-border/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black">مستوى الاكتمال</span>
              <span className="text-xs font-black text-primary">80%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: '80%' }} />
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-6 bg-slate-950 text-white border-primary/20">
          <h3 className="text-lg font-black mb-4">ملخص المحتوى</h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                <PlayCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-black">{course?._count?.topics || 0}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase">وحدة تعليمية</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xl font-black">24</p>
                <p className="text-[10px] font-black text-slate-400 uppercase">ملف ومرفق</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xl font-black">12</p>
                <p className="text-[10px] font-black text-slate-400 uppercase">اختبار تقييمي</p>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

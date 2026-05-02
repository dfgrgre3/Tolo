"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { 
  BarChart3, 
  BookOpen, 
  ChevronRight, 
  ExternalLink, 
  LayoutDashboard, 
  Layers, 
  Settings, 
  Users,
  Globe,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRoutes } from "@/lib/api/routes";

interface CourseLayoutProps {
  children: React.ReactNode;
}

export default function CourseDetailLayout({ children }: CourseLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
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

  const navItems = [
    {
      label: "نظرة عامة",
      icon: LayoutDashboard,
      href: `/admin/courses/${courseId}`,
      active: pathname === `/admin/courses/${courseId}`,
    },
    {
      label: "المنهج الدراسي",
      icon: Layers,
      href: `/admin/courses/${courseId}/curriculum`,
      active: pathname === `/admin/courses/${courseId}/curriculum`,
    },
    {
      label: "الطلاب والاشتراكات",
      icon: Users,
      href: `/admin/courses/${courseId}/students`,
      active: pathname === `/admin/courses/${courseId}/students`,
    },
    {
      label: "التحليلات والأداء",
      icon: BarChart3,
      href: `/admin/courses/${courseId}/analytics`,
      active: pathname === `/admin/courses/${courseId}/analytics`,
    },
    {
      label: "إعدادات الدورة",
      icon: Settings,
      href: `/admin/courses/${courseId}/edit`,
      active: pathname === `/admin/courses/${courseId}/edit`,
    },
    {
      label: "التسويق و SEO",
      icon: Globe,
      href: `/admin/courses/${courseId}/marketing`,
      active: pathname === `/admin/courses/${courseId}/marketing`,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      {/* Course Header Hub */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border/50 bg-card/30 p-8 backdrop-blur-xl">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-violet-500/10 blur-[80px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Thumbnail */}
          <div className="relative h-40 w-64 shrink-0 overflow-hidden rounded-3xl border-4 border-white/10 shadow-2xl shadow-primary/20">
            {course?.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={course?.nameAr} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-violet-500/20">
                <BookOpen className="h-12 w-12 text-primary/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 right-4">
              <Badge className="bg-white/20 backdrop-blur-md border-white/30 text-white font-black">
                {course?.price === 0 ? "مجانية" : `${course?.price} ج.م`}
              </Badge>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4 text-center md:text-right">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <AdminButton 
                variant="ghost" 
                size="sm" 
                className="h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                onClick={() => router.push("/admin/courses")}
              >
                <ChevronRight className="ml-1 h-4 w-4" />
                العودة للدورات
              </AdminButton>
              <Badge variant="outline" className="rounded-full px-4 border-primary/20 bg-primary/5 text-primary font-bold">
                ID: {course?.id?.slice(0, 8)}
              </Badge>
              {course?.isPublished ? (
                <Badge className="rounded-full px-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black">منشورة</Badge>
              ) : (
                <Badge className="rounded-full px-4 bg-orange-500/10 text-orange-500 border-orange-500/20 font-black">مسودة</Badge>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl text-foreground">
                {course?.nameAr || course?.name}
              </h1>
              <p className="mt-2 text-lg font-medium text-muted-foreground">
                {course?.instructorName || "بدون محاضر محدد"} • {course?.level === "BEGINNER" ? "مبتدئ" : course?.level === "ADVANCED" ? "متقدم" : "متوسط"}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <AdminButton className="gap-2 rounded-2xl px-6 font-black h-11 shadow-lg shadow-primary/20">
                <Sparkles className="h-4 w-4" />
                تحسين بالذكاء الاصطناعي
              </AdminButton>
              <AdminButton variant="outline" className="gap-2 rounded-2xl px-6 font-black h-11" onClick={() => window.open(`/courses/${courseId}`, '_blank')}>
                <ExternalLink className="h-4 w-4" />
                عرض في الموقع
              </AdminButton>
            </div>
          </div>

          {/* Quick Stats Sidebar */}
          <div className="grid grid-cols-2 gap-3 md:flex md:flex-col lg:grid lg:grid-cols-2">
            {[
              { label: "الطلاب", value: course?._count?.enrollments || 0, icon: Users, color: "text-blue-500" },
              { label: "الوحدات", value: course?._count?.topics || 0, icon: Layers, color: "text-violet-500" },
              { label: "التقييم", value: course?.rating || "0.0", icon: Sparkles, color: "text-amber-500" },
              { label: "الساعات", value: course?.durationHours || 0, icon: BarChart3, color: "text-emerald-500" },
            ].map((stat, i) => (
              <div key={i} className="rounded-2xl border border-border/50 bg-background/50 p-4 text-center backdrop-blur-md">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <stat.icon className={cn("h-3 w-3", stat.color)} />
                  <span className="text-[10px] font-black uppercase text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-10 flex overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-2 rounded-3xl bg-muted/30 p-2 backdrop-blur-md border border-border/50">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-2xl px-6 py-3 text-sm font-black transition-all",
                  item.active 
                    ? "bg-background text-primary shadow-xl shadow-black/5 ring-1 ring-border/50 scale-[1.02]" 
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", item.active ? "text-primary" : "text-muted-foreground/60")} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </div>
    </div>
  );
}

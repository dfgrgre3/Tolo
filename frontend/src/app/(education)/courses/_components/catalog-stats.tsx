"use client";

import { BookOpen, Layers3, Star, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type CatalogStatsData = {
  totalCourses: number;
  totalStudents: number;
  totalLessons: number;
  freeCourses: number;
  avgRating: number;
};

export function CatalogStats({ stats }: { stats: CatalogStatsData }) {
  const statItems = [
    {
      label: "إجمالي الدورات",
      value: (stats.totalCourses || 0).toLocaleString("ar-EG"),
      icon: BookOpen,
      tone: "text-orange-500 bg-orange-500/10",
    },
    {
      label: "إجمالي الطلاب",
      value: (stats.totalStudents || 0).toLocaleString("ar-EG"),
      icon: Users,
      tone: "text-sky-500 bg-sky-500/10",
    },
    {
      label: "إجمالي الدروس",
      value: (stats.totalLessons || 0).toLocaleString("ar-EG"),
      icon: Layers3,
      tone: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: "متوسط التقييم",
      value: (stats.avgRating || 0).toFixed(1),
      icon: Star,
      tone: "text-amber-500 bg-amber-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {statItems.map((stat) => (
        <div
          key={stat.label}
          className="rounded-[28px] border border-slate-200/70 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div
            className={cn(
              "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl",
              stat.tone
            )}
          >
            <stat.icon className="h-5 w-5" />
          </div>
          <p className="text-3xl font-black">{stat.value}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {stat.label}
          </p>
        </div>
      ))}

      <div className="rounded-[28px] border border-slate-200/70 bg-slate-950 p-5 text-white sm:col-span-2 dark:border-white/10">
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <TrendingUp className="h-5 w-5 text-orange-300" />
          </div>
          <div>
            <p className="text-sm font-bold text-white/80">
              دورات مجانية متاحة الآن
            </p>
            <p className="text-2xl font-black">
              {(stats.freeCourses || 0).toLocaleString("ar-EG")}
            </p>
          </div>
        </div>
        <p className="text-sm leading-7 text-white/70">
          ابدأ فورًا بدون انتظار، ثم انتقل إلى الدورات المتقدمة عندما تكون جاهزًا.
        </p>
      </div>
    </div>
  );
}

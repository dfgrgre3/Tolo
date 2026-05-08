"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lesson } from "../types";
import { formatLessonType, formatMinutes } from "../utils";

interface LessonStatsSectionProps {
  progress: number;
  allLessonsCount: number;
  completedLessonsCount: number;
  activeLesson: Lesson;
  bookmarksCount: number;
}

export function LessonStatsSection({
  progress,
  allLessonsCount,
  completedLessonsCount,
  activeLesson,
  bookmarksCount,
}: LessonStatsSectionProps) {
  const stats = [
    {
      label: "تقدّم الدورة",
      value: `${progress}%`,
      helper: `${completedLessonsCount.toLocaleString("ar-EG")} درس مكتمل`,
      tone: "text-orange-500 bg-orange-500/10",
    },
    {
      label: "زمن هذا الدرس",
      value: formatMinutes(activeLesson.durationMinutes),
      helper: formatLessonType(activeLesson.type),
      tone: "text-sky-500 bg-sky-500/10",
    },
    {
      label: "مرفقات الدرس",
      value: activeLesson.attachments.length.toLocaleString("ar-EG"),
      helper:
        activeLesson.attachments.length > 0
          ? "جاهزة للتحميل"
          : "لا توجد مرفقات",
      tone: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: "نقاط المراجعة",
      value: bookmarksCount.toLocaleString("ar-EG"),
      helper:
        bookmarksCount > 0
          ? "مرتبطة بزمن الفيديو"
          : "أضف طوابع زمنية في الملاحظات",
      tone: "text-amber-500 bg-amber-500/10",
    },
  ];

  return (
    <section className="grid gap-4 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 dark:border-white/10 dark:bg-slate-950/70"
        >
          <div className={cn("mb-4 inline-flex rounded-2xl p-3", stat.tone)}>
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-slate-400">{stat.label}</p>
          <p className="mt-2 text-2xl font-black">{stat.value}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {stat.helper}
          </p>
        </div>
      ))}
    </section>
  );
}

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Course } from "../types";

interface LessonNavigationFooterProps {
  previousLesson: any;
  nextLesson: any;
  navigateRelative: (direction: "next" | "prev") => void;
  course: Course;
  lessonIndex: number;
  totalLessons: number;
}

export function LessonNavigationFooter({
  previousLesson,
  nextLesson,
  navigateRelative,
  course,
  lessonIndex,
  totalLessons,
}: LessonNavigationFooterProps) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-[32px] border border-slate-200/80 bg-white/85 p-5 dark:border-white/10 dark:bg-slate-950/70">
      <Button
        variant="outline"
        className="rounded-2xl border-slate-200 dark:border-white/10"
        disabled={!previousLesson}
        onClick={() => navigateRelative("prev")}
      >
        <ChevronRight className="ml-2 h-4 w-4" />
        الدرس السابق
      </Button>

      <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 dark:bg-white/5 dark:text-slate-300">
        {course.title} • {lessonIndex + 1}/{totalLessons}
      </div>

      <Button
        className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-orange-500 dark:hover:bg-orange-600"
        disabled={!nextLesson}
        onClick={() => navigateRelative("next")}
      >
        الدرس التالي
        <ChevronLeft className="mr-2 h-4 w-4" />
      </Button>
    </section>
  );
}

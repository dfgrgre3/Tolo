"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Course } from "../types";
import { CourseTimerWidget } from "./CourseTimerWidget";

interface LearningHubHeaderProps {
  course: Course;
  courseId: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((current: boolean) => boolean)) => void;
  autoPlayNext: boolean;
  setAutoPlayNext: (auto: boolean | ((current: boolean) => boolean)) => void;
  isTheaterMode: boolean;
  setIsTheaterMode: (theater: boolean | ((current: boolean) => boolean)) => void;
}

export function LearningHubHeader({
  course,
  courseId,
  sidebarOpen,
  setSidebarOpen,
  autoPlayNext,
  setAutoPlayNext,
  isTheaterMode,
  setIsTheaterMode,
}: LearningHubHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl border-slate-200 dark:border-white/10"
            onClick={() => setSidebarOpen((current) => !current)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>

          <div>
            <p className="text-[10px] font-black text-orange-600 dark:text-orange-300 uppercase tracking-widest">
              بيئة التعلّم الذكية
            </p>
            <h1 className="text-base font-black sm:text-lg truncate max-w-[200px] md:max-w-md">{course.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Course timer widget — binds course to global Pomodoro */}
          <div className="hidden sm:flex">
            <CourseTimerWidget courseId={courseId} courseTitle={course.title} />
          </div>

          <Button
            variant={autoPlayNext ? "default" : "outline"}
            className={cn(
              "rounded-xl",
              autoPlayNext
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "border-slate-200 dark:border-white/10"
            )}
            onClick={() => setAutoPlayNext((current) => !current)}
          >
            التشغيل التلقائي
          </Button>

          <Button
            variant={isTheaterMode ? "default" : "outline"}
            className={cn(
              "rounded-xl",
              isTheaterMode
                ? "bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                : "border-slate-200 dark:border-white/10"
            )}
            onClick={() => setIsTheaterMode((current) => !current)}
          >
            وضع المسرح
          </Button>

          <Button
            variant="outline"
            className="rounded-xl border-slate-200 dark:border-white/10"
            onClick={() => router.push(`/courses/${courseId}`)}
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            صفحة الدورة
          </Button>
        </div>
      </div>
    </header>
  );
}

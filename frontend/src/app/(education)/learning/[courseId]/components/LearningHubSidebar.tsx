"use client";

import { m } from "framer-motion";
import {
  CheckCircle2,
  Clock3,
  FileCode2,
  FileText,
  HelpCircle,
  Layers3,
  Play,
  Search,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Course, Chapter, Lesson } from "../types";
import { formatLessonType, formatMinutes } from "../utils";

const lessonTypeIcons: Record<string, typeof Play> = {
  VIDEO: Play,
  QUIZ: HelpCircle,
  FILE: FileCode2,
};

function getLessonIcon(lesson: Lesson) {
  if (lesson.completed) return CheckCircle2;
  return lessonTypeIcons[lesson.type] || FileText;
}

interface LearningHubSidebarProps {
  course: Course;
  chapters: Chapter[];
  filteredChapters: Chapter[];
  activeLessonId: string | null;
  lessonSearch: string;
  setLessonSearch: (search: string) => void;
  navigateToLesson: (lessonId: string) => void;
  progress: number;
  allLessons: Lesson[];
  totalDurationMinutes: number;
  totalAttachments: number;
}

export function LearningHubSidebar({
  course,
  filteredChapters,
  activeLessonId,
  lessonSearch,
  setLessonSearch,
  navigateToLesson,
  progress,
  allLessons,
  totalDurationMinutes,
  totalAttachments,
}: LearningHubSidebarProps) {
  return (
    <m.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="space-y-4 rounded-[32px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75 dark:shadow-none"
    >
      <div className="space-y-4 rounded-[28px] bg-slate-50 p-4 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              المدرس
            </p>
            <p className="font-black">{course.instructor}</p>
          </div>
          <Badge className="border-0 bg-amber-500/10 text-amber-600 dark:text-amber-300">
            <Star className="ml-1 h-3.5 w-3.5 fill-current" />
            {course.rating.toFixed(1)}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>التقدّم الكلي</span>
            <span className="text-orange-500">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
            أنهيت {allLessons.filter((lesson) => lesson.completed).length.toLocaleString("ar-EG")} من{" "}
            {allLessons.length.toLocaleString("ar-EG")} درس.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-3 dark:bg-white/5">
            <p className="text-xs font-bold text-slate-400">مدة الدورة</p>
            <p className="mt-1 font-black">{formatMinutes(totalDurationMinutes)}</p>
          </div>
          <div className="rounded-2xl bg-white p-3 dark:bg-white/5">
            <p className="text-xs font-bold text-slate-400">المرفقات</p>
            <p className="mt-1 font-black">
              {totalAttachments.toLocaleString("ar-EG")}
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={lessonSearch}
          onChange={(event) => setLessonSearch(event.target.value)}
          placeholder="ابحث داخل الدروس"
          className="h-12 rounded-2xl border-slate-200 bg-slate-50 pr-11 dark:border-white/10 dark:bg-white/5"
        />
      </div>

      <div className="max-h-[calc(100vh-260px)] space-y-4 overflow-y-auto pl-1">
        {filteredChapters.map((chapter, chapterIndex) => {
          const completedLessons = chapter.subTopics.filter((lesson) => lesson.completed).length;

          return (
            <div key={chapter.id} className="space-y-2">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/10 text-xs font-black text-orange-600 dark:text-orange-300">
                    {chapterIndex + 1}
                  </div>
                  <h3 className="text-sm font-black">{chapter.name}</h3>
                </div>

                <span className="text-xs font-bold text-slate-400">
                  {completedLessons.toLocaleString("ar-EG")}/
                  {chapter.subTopics.length.toLocaleString("ar-EG")}
                </span>
              </div>

              <div className="space-y-2">
                {chapter.subTopics.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => navigateToLesson(lesson.id)}
                    className={cn(
                      "w-full rounded-[24px] border px-4 py-3 text-right transition-all",
                      activeLessonId === lesson.id
                        ? "border-orange-500/20 bg-orange-500/[0.08] shadow-sm dark:bg-orange-500/10"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black",
                          lesson.completed
                            ? "bg-emerald-500 text-white"
                            : activeLessonId === lesson.id
                            ? "bg-orange-500 text-white"
                            : "bg-white text-slate-600 dark:bg-white/5 dark:text-slate-300"
                        )}
                      >
                        {(() => {
                          const Icon = getLessonIcon(lesson);
                          return <Icon className="h-4 w-4" />;
                        })()}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="line-clamp-2 text-sm font-bold">
                            {lesson.name}
                          </p>
                          {lesson.isFree ? (
                            <Badge className="border-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                              مجاني
                            </Badge>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatMinutes(lesson.durationMinutes)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers3 className="h-3.5 w-3.5" />
                            {formatLessonType(lesson.type)}
                          </span>
                          {lesson.locked ? (
                            <span className="text-rose-500">مغلق</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </m.aside>
  );
}

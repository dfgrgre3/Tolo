"use client";

import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Course, Lesson, CourseVideoPlayerApi } from "../types";
import { formatLessonType } from "../utils";
import dynamic from "next/dynamic";

const CourseVideoPlayer = dynamic(
  () => import("@/components/video/CourseVideoPlayer").then((mod) => mod.CourseVideoPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video w-full animate-pulse bg-slate-900 rounded-[28px] border border-white/10 flex items-center justify-center text-white/50">
        جارِ تحميل المشغل...
      </div>
    ),
  }
);

interface LessonPlayerSectionProps {
  course: Course;
  activeLesson: Lesson;
  lessonIndex: number;
  totalLessons: number;
  bookmarks: { time: number; label: string }[];
  previousLesson: Lesson | null;
  nextLesson: Lesson | null;
  navigateRelative: (direction: "next" | "prev") => void;
  handleLessonComplete: (lessonId: string) => Promise<void>;
  isTheaterMode: boolean;
  setIsTheaterMode: (theater: boolean | ((current: boolean) => boolean)) => void;
  autoPlayNext: boolean;
  navigateToLesson: (lessonId: string) => void;
  playerApiRef: React.MutableRefObject<CourseVideoPlayerApi | null>;
}

export function LessonPlayerSection({
  course,
  activeLesson,
  lessonIndex,
  totalLessons,
  bookmarks,
  previousLesson,
  nextLesson,
  navigateRelative,
  handleLessonComplete,
  isTheaterMode,
  setIsTheaterMode,
  autoPlayNext,
  navigateToLesson,
  playerApiRef,
}: LessonPlayerSectionProps) {
  const router = useRouter();

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_25px_70px_rgba(15,23,42,0.07)] backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:shadow-none">
      <div className="border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-orange-500/10 text-orange-600 dark:text-orange-300">
                {formatLessonType(activeLesson.type)}
              </Badge>
              <Badge className="border-0 bg-sky-500/10 text-sky-600 dark:text-sky-300">
                {lessonIndex + 1} / {totalLessons}
              </Badge>
              {bookmarks.length > 0 ? (
                <Badge className="border-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  {bookmarks.length} فصول زمنية
                </Badge>
              ) : null}
            </div>
            <h2 className="text-2xl font-black sm:text-3xl">
              {activeLesson.name}
            </h2>
            {activeLesson.description ? (
              <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                {activeLesson.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-2xl border-slate-200 dark:border-white/10"
              disabled={!previousLesson}
              onClick={() => navigateRelative("prev")}
            >
              <ChevronRight className="ml-2 h-4 w-4" />
              السابق
            </Button>

            <Button
              variant="outline"
              className="rounded-2xl border-slate-200 dark:border-white/10"
              disabled={!nextLesson}
              onClick={() => navigateRelative("next")}
            >
              التالي
              <ChevronLeft className="mr-2 h-4 w-4" />
            </Button>

            {!activeLesson.completed ? (
              <Button
                className="rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600"
                onClick={() => void handleLessonComplete(activeLesson.id)}
              >
                <CheckCircle2 className="ml-2 h-4 w-4" />
                تحديد كمكتمل
              </Button>
            ) : (
              <Button
                variant="outline"
                className="rounded-2xl border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-300"
                disabled
              >
                <CheckCircle2 className="ml-2 h-4 w-4" />
                مكتمل
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className={cn("p-4 sm:p-5", isTheaterMode && "sm:p-3")}>
        {activeLesson.videoUrl ? (
          <CourseVideoPlayer
            key={activeLesson.id}
            courseId={course.id}
            lessonId={activeLesson.id}
            lessonTitle={activeLesson.name}
            videoUrl={activeLesson.videoUrl}
            alreadyCompleted={activeLesson.completed}
            bookmarks={bookmarks}
            interactiveQuestions={activeLesson.interactiveQuestions}
            playerApiRef={playerApiRef}
            watermarkText={course.instructor}
            isTheaterMode={isTheaterMode}
            onToggleTheater={() => setIsTheaterMode((current) => !current)}
            onLessonAutoComplete={() => void handleLessonComplete(activeLesson.id)}
            onNextVideo={
              autoPlayNext && nextLesson
                ? () => navigateToLesson(nextLesson.id)
                : undefined
            }
          />
        ) : activeLesson.type === "QUIZ" ? (
          <div className="flex aspect-video flex-col items-center justify-center rounded-[28px] bg-amber-50 dark:bg-amber-500/5 text-center border-2 border-dashed border-amber-200 dark:border-amber-500/20">
            <div className="p-6 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-6">
               <HelpCircle className="h-16 w-16" />
            </div>
            <h3 className="text-2xl font-black text-amber-900 dark:text-amber-100">اختبار الدرس المدمج</h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-amber-700/70 dark:text-amber-400/70">
              هذا الدرس عبارة عن اختبار لقياس مدى استيعابك للمفاهيم. اضغط على الزر أدناه لبدء الاختبار.
            </p>
            <Button 
              className="mt-8 h-14 px-10 rounded-2xl bg-amber-500 text-white hover:bg-amber-600 shadow-xl shadow-amber-500/20 font-black text-lg gap-3"
              onClick={() => router.push(`/exams/${activeLesson.examId || activeLesson.id}`)}
            >
              <Play className="h-5 w-5 fill-current" />
              بدء الاختبار الآن
            </Button>
          </div>
        ) : activeLesson.type === "ARTICLE" ? (
          <div className="min-h-[500px] rounded-[28px] bg-white dark:bg-slate-900/40 p-8 shadow-inner overflow-y-auto">
            <div 
              className="prose prose-lg dark:prose-invert max-w-none leading-relaxed"
              dangerouslySetInnerHTML={{ __html: activeLesson.content || "لا يوجد محتوى نصي متاح." }}
            />
          </div>
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center rounded-[28px] bg-slate-100 text-center dark:bg-white/5">
            <FileText className="mb-4 h-12 w-12 text-slate-400" />
            <h3 className="text-xl font-black">هذا الدرس لا يحتوي على فيديو</h3>
            <p className="mt-2 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
              يمكنك متابعة المحتوى نصي والمرفقات والمناقشات من الأقسام
              الموجودة أسفل المشغل.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

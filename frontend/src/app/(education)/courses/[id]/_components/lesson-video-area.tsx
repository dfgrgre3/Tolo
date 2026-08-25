"use client";

import { Lock, FileText, Shield, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CourseLesson } from "./types";
import dynamic from "next/dynamic";
import { useState } from "react";

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

export function LessonVideoArea({
  canAccess,
  lessonData,
  courseId,
  authName,
  userId,
  onAutoComplete,
  onEnroll,
}: {
  canAccess: boolean;
  lessonData: CourseLesson;
  courseId: string;
  courseEnrolled: boolean;
  authName?: string | null;
  userId: string | null;
  onAutoComplete: () => void;
  onEnroll: () => void;
}) {
  const [progressPercent, setProgressPercent] = useState(0);

  if (canAccess && lessonData.videoUrl) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <Clock3 className="h-4 w-4" />
            {progressPercent}% مشاهدة
          </span>
        </div>
        <CourseVideoPlayer
          key={lessonData.id}
          courseId={courseId}
          lessonId={lessonData.id}
          lessonTitle={lessonData.title}
          videoUrl={lessonData.videoUrl}
          alreadyCompleted={lessonData.completed}
          watermarkText={authName || userId || "Student"}
          onLessonAutoComplete={onAutoComplete}
          onProgress={(currentTime, duration) => {
            const percent = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
            setProgressPercent(percent);
          }}
        />
      </div>
    );
  }

  if (canAccess) {
    return (
      <div className="aspect-video flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-800">
        <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 font-medium">محتوى نصي - لا يوجد فيديو لهذا الدرس</p>
      </div>
    );
  }

  return (
    <div className="aspect-video flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-800">
      <Lock className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
      <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">المحتوى مقفل</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-sm">
        سجل في الدورة لتتمكن من الوصول إلى جميع الدروس والمحتوى التعليمي.
      </p>
      <Button onClick={onEnroll} className="gap-2 rounded-xl bg-primary text-white shadow-lg">
        <Shield className="h-4 w-4" />
        <span>سجل الآن</span>
      </Button>
    </div>
  );
}

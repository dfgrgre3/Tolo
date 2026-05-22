"use client";

import { Lock, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseVideoPlayer } from "@/components/video/CourseVideoPlayer";
import type { CourseLesson } from "./types";

export function LessonVideoArea({
  canAccess,
  lessonData,
  courseId,
  courseEnrolled,
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
  if (canAccess && lessonData.videoUrl) {
    return (
      <CourseVideoPlayer
        key={lessonData.id}
        courseId={courseId}
        lessonId={lessonData.id}
        lessonTitle={lessonData.title}
        videoUrl={lessonData.videoUrl}
        alreadyCompleted={lessonData.completed}
        watermarkText={authName || userId || "Student"}
        onLessonAutoComplete={onAutoComplete}
      />
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

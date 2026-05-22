"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, Play, BookmarkCheck, Bookmark, Share2, BookOpen, Clock, Download, Award, MessageSquare, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Course } from "./types";

export function CourseActionCard({
  course,
  courseProgress,
  completedCount,
  lessonsCount,
  courseId,
  enrolling,
  bookmarked,
  setBookmarked,
  onEnroll,
  router,
}: {
  course: Course;
  courseProgress: number;
  completedCount: number;
  lessonsCount: number;
  courseId: string;
  enrolling: boolean;
  bookmarked: boolean;
  setBookmarked: (v: boolean) => void;
  onEnroll: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="sticky top-24 rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-6 space-y-6 shadow-lg shadow-black/5 dark:shadow-black/20">
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <GraduationCap className="h-16 w-16 text-gray-300 dark:text-gray-600" />
          </div>
        )}
        {course.enrolled && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <button
              onClick={() => router.push(`/learning/${courseId}`)}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 hover:scale-110 transition-transform"
            >
              <Play className="h-6 w-6 text-white fill-white" />
            </button>
          </div>
        )}
      </div>

      {/* Price */}
      <div className="flex items-center justify-between">
        <div className="text-3xl font-black text-gray-900 dark:text-white">
          {course.price === 0 ? (
            <span className="text-emerald-500">مجاناً</span>
          ) : (
            <div className="flex items-baseline gap-1">
              <span>{course.price}</span>
              <span className="text-sm font-bold text-gray-400">ج.م</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setBookmarked(!bookmarked)}
            className={cn("h-10 w-10 rounded-xl", bookmarked ? "text-primary bg-primary/10" : "text-gray-400")}
          >
            {bookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-gray-400">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress or Enroll */}
      {course.enrolled ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-500">التقدم في الدورة</span>
              <span className="font-black text-primary">{courseProgress}%</span>
            </div>
            <Progress value={courseProgress} className="h-2" />
            <p className="text-[11px] text-gray-400">
              {completedCount} من {lessonsCount} دروس مكتملة
            </p>
          </div>
          <Button
            onClick={() => router.push(`/learning/${courseId}`)}
            className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all gap-2"
          >
            <Play className="h-4 w-4 fill-current" />
            {courseProgress > 0 ? "متابعة التعلم" : "ابدأ التعلم الآن"}
          </Button>
        </div>
      ) : (
        <Button
          onClick={onEnroll}
          disabled={enrolling}
          className="w-full h-14 bg-primary text-white font-bold text-base rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all gap-2"
        >
          {enrolling ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
          <span>{course.price > 0 ? `سجل الآن - ${course.price} ج.م` : "ابدأ التعلم مجاناً"}</span>
        </Button>
      )}

      {/* Course features */}
      <div className="space-y-3 border-t border-gray-100 dark:border-white/5 pt-4">
        {[
          { icon: BookOpen, text: `${lessonsCount} دروس تعليمية` },
          { icon: Clock, text: `${course.duration} ساعات محتوى` },
          { icon: Download, text: "وصول مدى الحياة" },
          { icon: Award, text: "شهادة إتمام" },
          { icon: MessageSquare, text: "دعم ومناقشات" },
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <feature.icon className="h-4 w-4 text-gray-400" />
            <span>{feature.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

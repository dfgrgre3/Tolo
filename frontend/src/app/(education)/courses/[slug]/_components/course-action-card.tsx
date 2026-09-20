"use client";

import Image from "next/image";
import Link from "next/link";
import { GraduationCap, Play, BookmarkCheck, Bookmark, Share2, BookOpen, Clock, Download, Award, MessageSquare, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { CourseSummaryView } from "@/types/domain/mappers";

export function CourseActionCard({
  course,
  courseProgress,
  completedCount,
  lessonsCount,
  learnHref,
  learnLabel,
  enrolling,
  bookmarked,
  setBookmarked,
  onToggleBookmark,
  bookmarkBusy = false,
  onEnroll,
  showPreviewHint,
  onPreviewCertificate,
}: {
  course: CourseSummaryView;
  courseProgress: number;
  completedCount: number;
  lessonsCount: number;
  /** Path of the lesson the learner should open next (/courses/<slug>/learn/<id>). */
  learnHref: string;
  learnLabel: string;
  enrolling: boolean;
  bookmarked: boolean;
  setBookmarked: (v: boolean) => void;
  onToggleBookmark?: () => void;
  bookmarkBusy?: boolean;
  onEnroll: () => void;
  /** True when the next lesson is a free preview the visitor may open. */
  showPreviewHint?: boolean;
  onPreviewCertificate?: () => void;
}) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: course.title,
          text: course.description,
          url: window.location.href,
        });
      } catch (err) {
        logger.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      const { toast } = await import("sonner");
      toast.success("تم نسخ رابط الدورة بنجاح!");
    }
  };

  return (
    <div className="sticky top-24 rounded-[28px] border border-gray-200 dark:border-white/[0.08] bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-6 space-y-6 shadow-xl shadow-black/[0.02] dark:shadow-black/[0.15]">
      {/* Thumbnail. The course page deliberately hosts no player: the preview
          button opens the free lesson on the learn route, where the real player
          (watermark, access control, progress tracking) applies, rather than
          streaming a raw video URL inline on a catalog page. */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-950 border border-gray-100 dark:border-white/5">
        {course.thumbnailUrl ? (
          <Image src={course.thumbnailUrl} alt={course.title} fill sizes="(min-width: 1024px) 384px, 100vw" className="object-cover transition-transform duration-500 hover:scale-105" unoptimized />
        ) : (
          <div className="flex items-center justify-center h-full">
            <GraduationCap className="h-16 w-16 text-gray-300 dark:text-gray-700" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex flex-col justify-between p-4">
          <div className="self-end">
            {showPreviewHint && (
              <Link
                href={learnHref}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md shadow-black/10"
              >
                <Play className="h-3 w-3 fill-current text-primary" />
                <span>مشاهدة مقدمة الدورة</span>
              </Link>
            )}
          </div>

          {course.enrolled && (
            <div className="self-center">
              <Link
                href={learnHref}
                aria-label={learnLabel}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 hover:scale-110 active:scale-95 transition-all shadow-lg"
              >
                <Play className="h-6 w-6 text-white fill-white animate-pulse" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Price & Actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-gray-400 dark:text-gray-500">سعر الاستثمار في الدورة</p>
          <div className="text-3xl font-black text-gray-900 dark:text-white">
            {course.price === 0 ? (
              <span className="text-emerald-500 font-extrabold">مجاناً بالكامل</span>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">{course.price}</span>
                <span className="text-sm font-bold text-gray-400">ج.م</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (onToggleBookmark ? onToggleBookmark() : setBookmarked(!bookmarked))}
            disabled={bookmarkBusy}
            className={cn("h-11 w-11 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5", bookmarked ? "text-primary bg-primary/10 border-primary/20" : "text-gray-400 hover:text-gray-500")}
          >
            {bookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="h-11 w-11 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-gray-500"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress or Enroll Button */}
      {course.enrolled ? (
        <div className="space-y-4 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-500">التقدم في الدورة</span>
              <span className="font-black text-primary">{courseProgress}%</span>
            </div>
            <Progress value={courseProgress} className="h-2 rounded-full overflow-hidden" />
            <p className="text-[11px] text-gray-400 font-medium">
              تم إكمال {completedCount} من أصل {lessonsCount} درساً
            </p>
          </div>
          <Button asChild className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all gap-2">
            <Link href={learnHref}>
              <Play className="h-4 w-4 fill-current" />
              {learnLabel}
            </Link>
          </Button>
        </div>
      ) : (
        <Button
          onClick={onEnroll}
          disabled={enrolling}
          className="w-full h-14 bg-gradient-to-r from-primary to-violet-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all gap-2"
        >
          {enrolling ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
          <span>{course.price > 0 ? `سجل الآن - ${course.price} ج.م` : "ابدأ التعلم مجاناً"}</span>
        </Button>
      )}

      {/* Course features */}
      <div className="space-y-3.5 border-t border-gray-150 dark:border-white/5 pt-5">
        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">مزايا ومحتويات الدورة:</h4>
        {[
          { icon: BookOpen, text: `${lessonsCount} دروس تعليمية منظمة` },
          { icon: Clock, text: `${course.durationHours} ساعات من الشرح الوافي` },
          { icon: Download, text: "وصول للمحتوى وفق سياسة الدورة" },
          ...(course.hasCertificate ? [{
            icon: Award,
            text: "شهادة إتمام معتمدة وقابلة للمشاركة",
            action: onPreviewCertificate ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewCertificate();
                }}
                className="text-xs font-bold text-primary hover:underline ml-auto"
              >
                معاينة الشهادة
              </button>
            ) : undefined,
          }] : []),
          { icon: MessageSquare, text: "دعم فني ومناقشات تفاعلية مستمرة" },
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <feature.icon className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="font-medium">{feature.text}</span>
            {feature.action}
          </div>
        ))}
      </div>
    </div>
  );
}

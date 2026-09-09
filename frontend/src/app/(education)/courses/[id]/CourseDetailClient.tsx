"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { sanitizeRichTextHtml } from "@/lib/security/sanitize-html";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
  FileText,
  Layers,
  Star,
  Award,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { updateLessonProgress } from "@/lib/course-progress";
import { normalizeLessonProgressResponse } from "@thanawy/shared/types/enums";
import {
  toLessonCards,
  type CourseDetailHydrationResponse,
  type EnrollmentResponse,
  type EnrollmentEligibilityResponse,
} from "@/types/domain/mappers";
import type { CourseSummaryView, LessonCardView } from "@/types/domain/mappers";
import type { Review, ReviewStats } from "./_components/types";
import { container, fadeUp, getListItems } from "./_components/types";
import { LessonVideoArea } from "./_components/lesson-video-area";
import { QuizLessonArea, QuizLessonBadge } from "./_components/quiz-lesson-area";
import { CourseActionCard } from "./_components/course-action-card";
import { ReviewsTab } from "./_components/reviews-tab";
import { QuestionsTab } from "./_components/questions-tab";
import { CertificatePreviewModal } from "./_components/CertificatePreviewModal";

export default function CourseDetailClient({
  children,
  initialCourseData,
  initialLessons
}: {
  children: React.ReactNode;
  initialCourseData: CourseSummaryView;
  initialLessons: LessonCardView[];
}) {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  // Session-derived id (watermark display + auth gates only) — never sent to
  // the server, which resolves the caller from the JWT (IDOR/BOLA hardening).
  const userId = authUser?.id ?? null;
  const [course, setCourse] = useState<CourseSummaryView>(initialCourseData);
  const [lessons, setLessons] = useState<LessonCardView[]>(initialLessons);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"curriculum" | "overview" | "reviews" | "questions">("curriculum");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  useEffect(() => {
    if (!userId) {
      return;
    }
    apiClient.get<{ items?: Array<{ subjectId: string }> }>(apiRoutes.courses.wishlistList)
      .then((data) => setBookmarked(Boolean(data.items?.some((item) => item.subjectId === courseId))))
      .catch(() => undefined);
  }, [courseId, userId]);

  const toggleBookmark = async () => {
    if (bookmarkBusy || !userId) {
      if (!userId) router.push(`/login?redirect=/courses/${courseId}`);
      return;
    }
    setBookmarkBusy(true);
    try {
      if (bookmarked) {
        await apiClient.delete(apiRoutes.courses.wishlist(courseId));
      } else {
        await apiClient.post(apiRoutes.courses.wishlist(courseId), {});
      }
      setBookmarked((current) => !current);
    } finally {
      setBookmarkBusy(false);
    }
  };

  // Sync user-specific progress when user logs in
  useEffect(() => {
    if (!courseId) return;

    const syncUserSpecificData = async () => {
      if (userId) {
        try {
          // Session-scoped: the backend resolves the caller from the JWT, so
          // no ?userId= is appended (IDOR/BOLA hardening).
          // Refresh the same aggregate endpoint after authentication. This
          // keeps enrollment, access, lessons, and progress from one snapshot.
          const payload = await apiClient.get<CourseDetailHydrationResponse>(apiRoutes.courses.detail(courseId));
          setCourse((prev) => ({
            ...prev,
            enrolled: payload.access.isEnrolled,
            progress: payload.completion?.progress ?? payload.enrollment?.progress ?? 0,
            completion: payload.completion,
          }));

          const rawLessons = payload.lessons || [];
          const normalized = toLessonCards(rawLessons.map((lesson) => {
            const progress = payload.progress?.[lesson.id];
            return {
              ...lesson,
              completed: lesson.completed || (typeof progress === "object" ? progress.completed : progress) || false,
              progress: lesson.progress ?? (typeof progress === "object" ? progress.percentage : progress ? 100 : 0),
            };
          }));
          setLessons(normalized);
          if (normalized.length > 0) {
            setActiveLesson(prev => prev ?? (normalized.find((lesson) => !lesson.locked)?.id || normalized[0]?.id || null));
          }
        } catch (error) {
          logger.error("Error syncing user course details:", error);
        }
      } else {
        // Fallback for guests: select first playable lesson
        if (initialLessons.length > 0) {
          setActiveLesson(prev => prev ?? (initialLessons.find((lesson) => !lesson.locked)?.id || initialLessons[0]?.id || null));
        }
      }
    };

    syncUserSpecificData();
  }, [courseId, userId, initialLessons]);

  const handleEnroll = async () => {
    if (authLoading) return;
    
    if (!isAuthenticated || !userId || !courseId) {
      router.push("/login?redirect=/courses/" + courseId);
      return;
    }
    setEnrolling(true);
    try {
      const eligibility = await apiClient.get<EnrollmentEligibilityResponse>(apiRoutes.courses.eligibility(courseId));
      if (eligibility.isEnrolled) {
        setCourse((prev) => ({ ...prev, enrolled: true }));
        return;
      }

      if (eligibility.requiresPayment) {
        router.push(`/courses/${courseId}/checkout`);
        return;
      }

      await apiClient.post<EnrollmentResponse>(apiRoutes.courses.enroll(courseId), {});
      // Reconcile the complete server-owned snapshot so access, locks,
      // enrollment and completion cannot remain from the guest state.
      const snapshot = await apiClient.get<CourseDetailHydrationResponse>(apiRoutes.courses.detail(courseId));
      setCourse((prev) => ({
        ...prev,
        enrolled: snapshot.access.isEnrolled,
        progress: snapshot.completion?.progress ?? snapshot.enrollment?.progress ?? 0,
        completion: snapshot.completion,
      }));
      const normalized = toLessonCards((snapshot.lessons || []).map((lesson) => {
        const progress = snapshot.progress?.[lesson.id];
        return {
          ...lesson,
          completed: lesson.completed || (typeof progress === "object" ? progress.completed : progress) || false,
          progress: lesson.progress ?? (typeof progress === "object" ? progress.percentage : progress ? 100 : 0),
        };
      }));
      setLessons(normalized);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: { requiresPayment?: boolean } };
      if (apiErr?.status === 402 || apiErr?.data?.requiresPayment) {
        router.push(`/courses/${courseId}/checkout`);
        return;
      }
      logger.error("Error in handleEnroll", apiErr);
    } finally {
      setEnrolling(false);
    }
  };

  const handleLessonComplete = async (lessonId: string) => {
    const previousLessons = lessons;
    const previousProgress = course.progress;
    if (!userId || !course) return;
    try {
      const data = await updateLessonProgress(lessonId, { completed: true });
      const snapshot = normalizeLessonProgressResponse(data, lessonId);
      setLessons((prev) => prev.map((l) => l.id === lessonId ? {
        ...l,
        completed: snapshot.lesson.completed,
        progress: snapshot.lesson.percentage,
      } : l));
      if (typeof data.courseProgress === "number") {
        setCourse((prev) => {
          const progress = snapshot.courseProgress;
          return {
          ...prev,
          progress,
          completion: {
            ...snapshot.eligibility,
            progress,
          },
        };
        });
      }
    } catch (err) {
      setLessons(previousLessons);
      if (typeof previousProgress === "number") {
        setCourse((prev) => ({ ...prev, progress: previousProgress }));
      }
      logger.error("Error marking lesson complete:", err);
    }
  };

  const activeLessonData = useMemo(() => lessons.find((l) => l.id === activeLesson), [lessons, activeLesson]);

  // Lesson HTML comes from the backend (teacher-authored) — sanitize before
  // injecting via dangerouslySetInnerHTML (stored XSS protection).
  const sanitizedLessonContent = useMemo(
    () => sanitizeRichTextHtml(activeLessonData?.content),
    [activeLessonData?.content]
  );
  const completedCount = useMemo(() => lessons.filter((l) => l.completed).length, [lessons]);
  const courseProgress = course.progress ?? 0;
  const canAccessActiveLesson = Boolean(
    course.enrolled || (activeLessonData?.isFree && !activeLessonData.locked)
  );
  const selectLesson = (lesson: LessonCardView) => {
    if (lesson.locked && !course.enrolled) return;
    setActiveLesson(lesson.id);
  };
  const firstFreeLesson = useMemo(() => lessons.find((l) => l.isFree && l.type === "VIDEO" && l.videoUrl), [lessons]);

  return (
    <div
      className="space-y-10"
    >
      {/* Course Header Grid (Left static children pre-rendered, Right dynamic card) */}
      <div
        className="grid grid-cols-1 lg:grid-cols-5 gap-8"
      >
        {children}

        <div className="lg:col-span-2">
          <CourseActionCard
            course={course}
            courseProgress={courseProgress}
            completedCount={completedCount}
            lessonsCount={lessons.length}
            courseId={courseId}
            enrolling={enrolling}
            bookmarked={bookmarked}
            setBookmarked={setBookmarked}
            onToggleBookmark={toggleBookmark}
            bookmarkBusy={bookmarkBusy}
            onEnroll={handleEnroll}
            firstFreeLesson={firstFreeLesson}
            onPreviewCertificate={course.completion?.certificateEligible ? () => setIsCertModalOpen(true) : undefined}
          />
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="space-y-8">
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-gray-150/60 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/5 max-w-fit shadow-inner">
          {[
            { key: "curriculum", label: "المنهج الدراسي", icon: Layers },
            { key: "overview", label: "نظرة عامة", icon: FileText },
            { key: "reviews", label: "التقييمات", icon: Star },
            { key: "questions", label: "الأسئلة والأجوبة", icon: HelpCircle }
          ].map((tab) =>
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "curriculum" | "overview" | "reviews" | "questions")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300",
                activeTab === tab.key ?
                  "bg-white dark:bg-gray-800 text-primary dark:text-white shadow-md shadow-black/[0.03]" :
                  "text-gray-500 hover:text-gray-850 dark:hover:text-gray-300"
              )}>
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          )}
        </div>

        {/* Curriculum Tab */}
        {activeTab === "curriculum" &&
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Lessons list */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-905 dark:text-white">
                    محتوى الدورة بالتفصيل
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-gray-550 mt-1">تصفح الدروس وابدأ التعلم</p>
                </div>
                <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {completedCount}/{lessons.length} مكتملة
                </span>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pe-1">
                {lessons.map((lesson, idx) =>
                  <button
                    key={lesson.id}
                    onClick={() => selectLesson(lesson)}
                    disabled={lesson.locked && !course.enrolled}
                    className={cn(
                      "w-full p-4 rounded-2xl text-start flex gap-4 items-center transition-all group",
                      activeLesson === lesson.id ?
                        "bg-primary/5 dark:bg-primary/10 border border-primary/20 shadow-md shadow-primary/[0.02]" :
                        "bg-white dark:bg-gray-900/40 border border-gray-200/60 dark:border-white/[0.05] hover:border-gray-300 dark:hover:border-white/10"
                    )}>
                    <div
                      className={cn(
                        "h-10 w-10 min-w-[40px] rounded-xl flex items-center justify-center text-xs font-black transition-all",
                        lesson.completed ?
                          "bg-emerald-500 text-white" :
                          activeLesson === lesson.id ?
                            "bg-primary text-white" :
                            "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500"
                      )}>
                      {lesson.completed ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={cn(
                          "font-bold text-sm truncate transition-colors",
                          activeLesson === lesson.id ? "text-primary" : "text-gray-700 dark:text-gray-300 group-hover:text-gray-950 dark:group-hover:text-white"
                        )}>
                        {lesson.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[11px] text-gray-400 font-medium">
                          {Math.floor(lesson.duration / 60)} دقيقة
                        </span>
                        {lesson.isFree &&
                          <span className="h-5 border-0 bg-emerald-500/10 px-2 text-[9px] font-bold text-emerald-500 rounded-full flex items-center">
                            معاينة مجانية
                          </span>
                        }
                        {lesson.locked &&
                          <Lock className="w-3 h-3 text-gray-450" />
                        }
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Lesson content */}
            <div className="lg:col-span-7 space-y-6">
              <>
                {activeLessonData &&
                  <div
                    key={activeLessonData.id}
                    className="space-y-6">
                    {/* Video / Quiz player */}
                    <div className="rounded-[28px] overflow-hidden border border-gray-250 dark:border-white/[0.08] bg-white dark:bg-gray-900/80 shadow-md">
                      {activeLessonData.type === "QUIZ" ? (
                        <>
                          <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                            <QuizLessonBadge lesson={activeLessonData} />
                          </div>
                          <div className="p-5">
                            <QuizLessonArea
                              canAccess={canAccessActiveLesson}
                              lessonData={activeLessonData}
                              courseId={course.id}
                              onEnroll={handleEnroll}
                              onCompletion={(completion) => {
                                setCourse((prev) => ({
                                  ...prev,
                                  progress: completion.courseProgress,
                                  completion: {
                                    isComplete: completion.courseCompleted,
                                    progress: completion.courseProgress,
                                    certificateEligible: completion.certificateEligible,
                                    requiredExams: 0,
                                    completedRequiredExams: 0,
                                    requiredCourseQuizzes: 0,
                                    completedCourseQuizzes: 0,
                                  },
                                }));
                                if (completion.lessonCompleted) {
                                  setLessons((prev) => prev.map((lesson) =>
                                    lesson.id === activeLessonData.id
                                      ? { ...lesson, completed: true, progress: 100, locked: false }
                                    : lesson
                                  ));
                                }
                                // Quiz mutations invalidate React Query data, but this
                                // page owns its course snapshot in local state. Re-read
                                // the same hydration endpoint to reconcile all rules.
                                void apiClient.get<CourseDetailHydrationResponse>(apiRoutes.courses.detail(courseId))
                                  .then((snapshot) => {
                                    setCourse((prev) => ({
                                      ...prev,
                                      enrolled: snapshot.access.isEnrolled,
                                      progress: snapshot.completion?.progress ?? 0,
                                      completion: snapshot.completion,
                                    }));
                                    const normalized = toLessonCards((snapshot.lessons || []).map((lesson) => {
                                      const progress = snapshot.progress?.[lesson.id];
                                      return {
                                        ...lesson,
                                        completed: lesson.completed || (typeof progress === "object" ? progress.completed : progress) || false,
                                        progress: lesson.progress ?? (typeof progress === "object" ? progress.percentage : progress ? 100 : 0),
                                      };
                                    }));
                                    setLessons(normalized);
                                  })
                                  .catch((error) => logger.error("Error refreshing course after quiz", error));
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <LessonVideoArea
                          canAccess={canAccessActiveLesson}
                          lessonData={activeLessonData}
                          courseId={course.id}
                          courseEnrolled={course.enrolled}
                          onAutoComplete={() => course.enrolled && void handleLessonComplete(activeLessonData.id)}
                          onEnroll={handleEnroll}
                        />
                      )}

                      {/* Lesson details */}
                      <div className="p-6 space-y-4 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{activeLessonData.title}</h2>
                            {activeLessonData.description &&
                              <p className="text-sm text-gray-400 mt-1.5">{activeLessonData.description}</p>
                            }
                          </div>
                          {!activeLessonData.completed && course.enrolled &&
                            <Button
                              onClick={() => handleLessonComplete(activeLessonData.id)}
                              size="sm"
                              className="gap-1.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-bold">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>مكتمل</span>
                            </Button>
                          }
                        </div>

                        {activeLessonData.content && canAccessActiveLesson &&
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none pt-4 border-t border-gray-100 dark:border-white/5"
                            dangerouslySetInnerHTML={{ __html: sanitizedLessonContent }} />
                        }
                      </div>
                    </div>

                    {/* Nav buttons */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        className="gap-2 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-700"
                        onClick={() => {
                          const idx = lessons.findIndex((l) => l.id === activeLesson);
                          if (idx > 0) selectLesson(lessons[idx - 1]!);
                        }}>
                        <ChevronRight className="w-4 h-4" />
                        <span>الدرس السابق</span>
                      </Button>

                      <Button
                        className="gap-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 text-sm font-bold"
                        onClick={() => {
                          const idx = lessons.findIndex((l) => l.id === activeLesson);
                          if (idx < lessons.length - 1) selectLesson(lessons[idx + 1]!);
                        }}>
                        <span>الدرس التالي</span>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                }
              </>
            </div>
          </div>
        }

        {/* Overview Tab */}
        {activeTab === "overview" &&
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200/60 dark:border-white/[0.05] bg-white dark:bg-gray-900/60 p-6 space-y-4 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">عن هذه الدورة</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">{course.description}</p>
              </div>

              <div className="rounded-2xl border border-gray-200/60 dark:border-white/[0.05] bg-white dark:bg-gray-900/60 p-6 space-y-4 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">ما ستتعلمه في هذه الدورة</h3>
                <ul className="grid grid-cols-1 gap-3">
                  {getListItems(
                    course.whatYouLearn,
                    course.learningObjectives,
                    ["فهم المفاهيم الأساسية للموضوع بشكل مبسط ورائع", "تطبيق القواعد وحل النماذج والامتحانات السابقة", "اكتساب مهارات التفكير والتحليل وحل المسائل الصعبة", "الاستعداد الكامل لاختبارات نهاية العام وتحقيق التفوق"]
                  ).map((item: string, i: number) =>
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-500 mt-0.5 shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{item}</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200/60 dark:border-white/[0.05] bg-white dark:bg-gray-900/60 p-6 space-y-4 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">المتطلبات الأساسية</h3>
                <ul className="space-y-3">
                  {getListItems(
                    course.coursePrerequisites,
                    course.requirements,
                    ["المعرفة التمهيدية البسيطة بالمادة الدراسية", "الرغبة الصادقة والالتزام بمشاهدة جميع الحلقات", "دفتر لتدوين الملاحظات، وجهاز متصل بالإنترنت"]
                  ).map((item: string, i: number) =>
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      <span className="font-medium">{item}</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Highly Advanced Instructor Profile Card */}
              <div className="rounded-[24px] border border-gray-200/80 dark:border-white/[0.07] bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900/85 dark:via-gray-900/85 dark:to-black/20 p-6 space-y-5 shadow-md">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">نبذة عن المحاضر</h3>
                
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary/10 to-violet-500/10 border border-primary/20 flex items-center justify-center text-primary text-2xl font-black shadow-inner">
                    {course.instructor.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-extrabold text-gray-900 dark:text-white text-base">{course.instructor}</p>
                      <span className="h-4 w-4 bg-blue-500 text-white rounded-full flex items-center justify-center" title="حساب موثق">
                        <span className="text-[9px] font-bold">✓</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-550 font-bold mt-0.5">معلم وموجه أول المادة</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                  مدرس أول بخبرة تتجاوز 12 عاماً في تبسيط المناهج وإعداد الامتحانات النموذجية. قاد أكثر من 15 ألف طالب بنجاح نحو التفوق والدرجات النهائية.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                  <div className="text-center p-2 rounded-xl bg-gray-50/50 dark:bg-white/[0.02]">
                    <p className="text-[10px] font-bold text-gray-400">الطلاب</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white mt-1">15K+</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-gray-50/50 dark:bg-white/[0.02]">
                    <p className="text-[10px] font-bold text-gray-400">التقييم</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white mt-1">4.9 ★</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-gray-50/50 dark:bg-white/[0.02]">
                    <p className="text-[10px] font-bold text-gray-400">الكورسات</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white mt-1">12 دورتين</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

        {/* Reviews Tab */}
        {activeTab === "reviews" &&
          <ReviewsTab
            courseId={courseId}
            courseRating={course.rating}
            enrolled={course.enrolled}
            reviews={reviews}
            setReviews={setReviews}
            reviewStats={reviewStats}
            setReviewStats={setReviewStats}
            reviewsLoading={reviewsLoading}
            setReviewsLoading={setReviewsLoading}
            reviewsError={reviewsError}
            setReviewsError={setReviewsError}
            userRating={userRating}
            setUserRating={setUserRating}
            userComment={userComment}
            setUserComment={setUserComment}
            submittingReview={submittingReview}
            setSubmittingReview={setSubmittingReview} />
        }

        {/* Questions Tab */}
        {activeTab === "questions" &&
          <QuestionsTab courseId={courseId} enrolled={course.enrolled} />
        }
      </div>

      {/* Separator */}
      <div className="border-t border-gray-200 dark:border-white/5 my-10" />

      {/* Certificate Preview Banner */}
      <div
        className="rounded-[28px] border border-amber-500/20 dark:border-amber-500/10 bg-gradient-to-br from-amber-500/[0.03] to-amber-500/[0.01] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4 text-start">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-500 border border-amber-500/30">
            <Award className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">شهادة تخرج موثقة بانتظارك</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
              أكمل متطلبات الدورة واحصل فوراً على شهادة إكمال معتمدة وشاركها مع أصدقائك أو معلمك.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsCertModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-6 h-12 rounded-xl transition-all shadow-md shadow-amber-500/20 shrink-0 gap-2"
        >
          <Award className="h-5 w-5" />
          <span>معاينة شهادتك التفاعلية</span>
        </Button>
      </div>

      {/* Certificate Modal */}
      <CertificatePreviewModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        studentName={authUser?.name || "طالب متفوق"}
        courseTitle={course.title}
        instructorName={course.instructor}
      />
    </div>
  );
}

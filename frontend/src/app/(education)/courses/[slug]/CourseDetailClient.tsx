"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import {
  Clock,
  CheckCircle2,
  Lock,
  FileText,
  Layers,
  Star,
  Award,
  HelpCircle,
  PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addWishlistItemRaw,
  checkEnrollmentEligibilityRaw,
  enrollCourseRaw,
  fetchCourseDetailRaw,
  fetchWishlistRaw,
  removeWishlistItemRaw,
} from "@/features/courses/api/courses-gateway";
import {
  toLessonCards,
  type CourseDetailHydrationResponse,
  type EnrollmentResponse,
  type EnrollmentEligibilityResponse,
} from "@/types/domain/mappers";
import type { CourseSummaryView, LessonCardView } from "@/types/domain/mappers";
import type { Review, ReviewStats } from "./_components/types";
import { getListItems } from "./_components/types";
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
  const courseSlug = params.slug as string;

  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  // Session-derived id (watermark display + auth gates only) — never sent to
  // the server, which resolves the caller from the JWT (IDOR/BOLA hardening).
  const userId = authUser?.id ?? null;
  const [course, setCourse] = useState<CourseSummaryView>(initialCourseData);
  const [lessons, setLessons] = useState<LessonCardView[]>(initialLessons);
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
    fetchWishlistRaw<{ items?: Array<{ subjectId: string }> }>()
      .then((data) => setBookmarked(Boolean(data.items?.some((item) => item.subjectId === courseSlug))))
      .catch(() => undefined);
  }, [courseSlug, userId]);

  const toggleBookmark = async () => {
    if (bookmarkBusy || !userId) {
      if (!userId) router.push(`/login?redirect=/courses/${courseSlug}`);
      return;
    }
    setBookmarkBusy(true);
    try {
      if (bookmarked) {
        await removeWishlistItemRaw(courseSlug);
      } else {
        await addWishlistItemRaw(courseSlug);
      }
      setBookmarked((current) => !current);
    } finally {
      setBookmarkBusy(false);
    }
  };

  // Sync user-specific progress when user logs in
  useEffect(() => {
    if (!courseSlug) return;

    const syncUserSpecificData = async () => {
      if (userId) {
        try {
          // Session-scoped: the backend resolves the caller from the JWT, so
          // no ?userId= is appended (IDOR/BOLA hardening).
          // Refresh the same aggregate endpoint after authentication. This
          // keeps enrollment, access, lessons, and progress from one snapshot.
          const payload = await fetchCourseDetailRaw<CourseDetailHydrationResponse>(courseSlug);
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
        } catch (error) {
          logger.error("Error syncing user course details:", error);
        }
      }
    };

    syncUserSpecificData();
  }, [courseSlug, userId, initialLessons]);

  const handleEnroll = async () => {
    if (authLoading) return;
    
    if (!isAuthenticated || !userId || !courseSlug) {
      router.push("/login?redirect=/courses/" + courseSlug);
      return;
    }
    setEnrolling(true);
    try {
      const eligibility = await checkEnrollmentEligibilityRaw<EnrollmentEligibilityResponse>(courseSlug);
      if (eligibility.isEnrolled) {
        setCourse((prev) => ({ ...prev, enrolled: true }));
        return;
      }

      if (eligibility.requiresPayment) {
        router.push(`/courses/${courseSlug}/checkout`);
        return;
      }

      await enrollCourseRaw<EnrollmentResponse>(courseSlug);
      // Reconcile the complete server-owned snapshot so access, locks,
      // enrollment and completion cannot remain from the guest state.
      const snapshot = await fetchCourseDetailRaw<CourseDetailHydrationResponse>(courseSlug);
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
        router.push(`/courses/${courseSlug}/checkout`);
        return;
      }
      logger.error("Error in handleEnroll", apiErr);
    } finally {
      setEnrolling(false);
    }
  };

  const completedCount = useMemo(() => lessons.filter((l) => l.completed).length, [lessons]);
  const courseProgress = course.progress ?? 0;

  // The course page is the catalog/enrollment surface — the lesson itself lives
  // at /courses/<slug>/learn/<lessonId>. The lesson we point at from here is the
  // same one the hub would resolve on its own, so a click and a deep link into
  // the hub land in the same place: the first unfinished lesson for an enrolled
  // student, the first free preview lesson for a visitor.
  const firstAccessibleLesson = useMemo(
    () =>
      lessons.find((lesson) => !lesson.locked && !lesson.completed) ??
      lessons.find((lesson) => !lesson.locked) ??
      lessons[0],
    [lessons]
  );

  const learnHref = firstAccessibleLesson
    ? `/courses/${courseSlug}/learn/${firstAccessibleLesson.id}`
    : `/courses/${courseSlug}`;

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
            learnHref={learnHref}
            learnLabel={courseProgress > 0 ? "متابعة التعلم" : "ابدأ التعلم الآن"}
            showPreviewHint={!course.enrolled && Boolean(firstAccessibleLesson?.isFree)}
            enrolling={enrolling}
            bookmarked={bookmarked}
            setBookmarked={setBookmarked}
            onToggleBookmark={toggleBookmark}
            bookmarkBusy={bookmarkBusy}
            onEnroll={handleEnroll}
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
                {lessons.map((lesson, idx) => {
                  // A locked lesson is a hard link target: it must not be
                  // reachable (or crawlable) by a visitor who has not enrolled.
                  // The backend enforces access on the route itself; here we
                  // simply do not emit a link for it.
                  const accessible = !lesson.locked || course.enrolled;
                  const rowClassName = cn(
                    "w-full p-4 rounded-2xl text-start flex gap-4 items-center transition-all group",
                    accessible
                      ? "bg-white dark:bg-gray-900/40 border border-gray-200/60 dark:border-white/[0.05] hover:border-gray-300 dark:hover:border-white/10"
                      : "bg-gray-50/60 dark:bg-white/[0.02] border border-dashed border-gray-200/60 dark:border-white/[0.05] cursor-not-allowed opacity-70"
                  );
                  const rowContent = (
                    <>
                      <div
                        className={cn(
                          "h-10 w-10 min-w-[40px] rounded-xl flex items-center justify-center text-xs font-black transition-all",
                          lesson.completed
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500"
                        )}>
                        {lesson.completed ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate text-gray-700 dark:text-gray-300 group-hover:text-gray-950 dark:group-hover:text-white">
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
                    </>
                  );

                  if (!accessible) {
                    return (
                      <div key={lesson.id} aria-disabled="true" className={rowClassName}>
                        {rowContent}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={lesson.id}
                      href={`/courses/${courseSlug}/learn/${lesson.id}`}
                      className={rowClassName}
                    >
                      {rowContent}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Start-learning panel. The course page deliberately hosts no player:
                video, quizzes, notes and progress all live on the learn route. */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-[28px] border border-gray-250 dark:border-white/[0.08] bg-white dark:bg-gray-900/80 shadow-md p-6 sm:p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <PlayCircle className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">
                      {course.enrolled ? "أكمل ما بدأته" : "ابدأ أول درس الآن"}
                    </h2>
                    {firstAccessibleLesson ? (
                      <p className="text-sm text-gray-400 mt-1.5 truncate">
                        {course.enrolled ? "الدرس التالي: " : "الدرس الأول: "}
                        {firstAccessibleLesson.title}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1.5">
                        ستُضاف الدروس قريباً.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-gray-50/70 dark:bg-white/[0.03] p-3 text-center">
                    <p className="text-[10px] font-bold text-gray-400">الدروس</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white mt-1">{lessons.length}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50/70 dark:bg-white/[0.03] p-3 text-center">
                    <p className="text-[10px] font-bold text-gray-400">المكتملة</p>
                    <p className="text-lg font-black text-emerald-500 mt-1">{completedCount}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50/70 dark:bg-white/[0.03] p-3 text-center">
                    <p className="text-[10px] font-bold text-gray-400">التقدم</p>
                    <p className="text-lg font-black text-primary mt-1">{Math.round(courseProgress)}%</p>
                  </div>
                </div>

                {firstAccessibleLesson && (
                  <Button asChild className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all gap-2">
                    <Link href={learnHref}>
                      <PlayCircle className="h-4 w-4" />
                      <span>{course.enrolled ? "متابعة من حيث توقفت" : "فتح الدرس الأول"}</span>
                    </Link>
                  </Button>
                )}

                {!course.enrolled && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed text-center">
                    الدروس المجانية متاحة للمعاينة بدون تسجيل. باقي الدروس تُفتح بعد
                    التسجيل في الدورة، والصلاحيات يقررها الخادم دائماً.
                  </p>
                )}
              </div>
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
            courseId={courseSlug}
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
          <QuestionsTab courseId={courseSlug} enrolled={course.enrolled} />
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

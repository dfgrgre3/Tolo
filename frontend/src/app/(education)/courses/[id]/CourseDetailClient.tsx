"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { ensureUser } from "@/lib/user-utils";
import { logger } from "@/lib/logger";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
  FileText,
  Layers,
  Star,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/api-client";
import type { Course, CourseLesson, Review, ReviewStats } from "./_components/types";
import { container, fadeUp, getListItems } from "./_components/types";
import { LessonVideoArea } from "./_components/lesson-video-area";
import { CourseActionCard } from "./_components/course-action-card";
import { ReviewsTab } from "./_components/reviews-tab";
import { CertificatePreviewModal } from "./_components/CertificatePreviewModal";

export default function CourseDetailClient({
  children,
  initialCourseData,
  initialLessons
}: {
  children: React.ReactNode;
  initialCourseData: Course;
  initialLessons: CourseLesson[];
}) {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course>(initialCourseData);
  const [lessons, setLessons] = useState<CourseLesson[]>(initialLessons);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [activeTab, setActiveTab] = useState<"curriculum" | "overview" | "reviews">("curriculum");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (authUser?.id) {
        setUserId(authUser.id);
      } else if (!authLoading) {
        ensureUser().then(setUserId);
      }
    });
  }, [authUser, authLoading]);

  // Sync user-specific progress when user logs in
  useEffect(() => {
    if (!courseId) return;

    const syncUserSpecificData = async () => {
      if (userId) {
        try {
          const courseData = await apiClient.get<any>(`/courses/${courseId}?userId=${userId}`);
          
          if (courseData?.subject) {
            const subject = courseData.subject;
            setCourse({
              id: subject.id,
              title: subject.nameAr || subject.name,
              description: subject.description || "لا يوجد وصف متاح لهذه الدورة.",
              instructor: subject.instructorName || "المنصة التعليمية",
              subject: subject.nameAr || subject.name,
              level: subject.level as Course['level'] || "INTERMEDIATE",
              duration: subject.durationHours || 0,
              thumbnailUrl: subject.thumbnailUrl || undefined,
              price: subject.price || 0,
              rating: subject.rating || 0,
              enrolledCount: subject.enrolledCount || 0,
              createdAt: subject.createdAt || new Date().toISOString(),
              tags: [subject.nameAr || subject.name, ...(subject.tags || [])],
              enrolled: Boolean(courseData.enrollment),
              progress: courseData.enrollment ? courseData.enrollment.progress || 0 : undefined,
              whatYouLearn: subject.whatYouLearn,
              coursePrerequisites: subject.coursePrerequisites,
              targetAudience: subject.targetAudience,
              requirements: subject.requirements,
              learningObjectives: subject.learningObjectives,
            });
          }

          const data = await apiClient.get<any>(`/courses/${courseId}/lessons?userId=${userId}`);
          const payload = data.data ?? data;
          const rawLessons = Array.isArray(payload) ? payload : (payload.lessons ?? []);
          const progressMap = payload.progress || {};

          const normalized = rawLessons.map((l: any, i: number) => {
            const durationMinutes = typeof l.durationMinutes === "number" ? l.durationMinutes : l.duration || 0;
            return {
              id: l.id,
              title: l.title || l.name || `الدرس ${i + 1}`,
              description: l.description || undefined,
              content: l.content || undefined,
              videoUrl: l.videoUrl || undefined,
              type: l.type || "VIDEO",
              isFree: Boolean(l.isFree),
              locked: Boolean(l.locked),
              duration: durationMinutes > 0 ? durationMinutes * 60 : 600,
              order: l.order || i + 1,
              completed: l.completed || Boolean(progressMap[l.id]),
              progress: l.completed ? 100 : l.progress || 0
            };
          });
          setLessons(normalized);
          if (normalized.length > 0) {
            setActiveLesson(prev => prev ?? (normalized.find((lesson: any) => !lesson.locked)?.id || normalized[0].id));
          }
        } catch (error) {
          logger.error("Error syncing user course details:", error);
        }
      } else {
        // Fallback for guests: select first playable lesson
        if (initialLessons.length > 0) {
          setActiveLesson(prev => prev ?? (initialLessons.find((lesson: any) => !lesson.locked)?.id || initialLessons[0]?.id || null));
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
      const data = await apiClient.post<any>(`/courses/${courseId}/enroll`, { 
        subject: courseId 
      });
      
      if (data.requiresPayment) {
        router.push(`/courses/${courseId}/checkout`);
        return;
      }
      setCourse(prev => ({ ...prev, enrolled: true, progress: 0 }));
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
    if (!userId || !course) return;
    try {
      setLessons((prev) => prev.map((l) => l.id === lessonId ? { ...l, completed: true, progress: 100 } : l));
      await apiClient.post<any>(`/courses/lessons/${lessonId}/progress`, {
        completed: true,
        subject: course.subject
      });
    } catch (err) {
      logger.error("Error marking lesson complete:", err);
    }
  };

  const activeLessonData = useMemo(() => lessons.find((l) => l.id === activeLesson), [lessons, activeLesson]);
  const completedCount = useMemo(() => lessons.filter((l) => l.completed).length, [lessons]);
  const courseProgress = lessons.length > 0 ? Math.round(completedCount / lessons.length * 100) : 0;
  const canAccessActiveLesson = Boolean(course.enrolled || activeLessonData?.isFree);
  const firstFreeLesson = useMemo(() => lessons.find((l) => l.isFree && l.videoUrl), [lessons]);

  return (
    <m.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-10"
    >
      {/* Course Header Grid (Left static children pre-rendered, Right dynamic card) */}
      <m.div
        variants={fadeUp}
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
            onEnroll={handleEnroll}
            firstFreeLesson={firstFreeLesson}
            onPreviewCertificate={() => setIsCertModalOpen(true)}
          />
        </div>
      </m.div>

      {/* Tabs & Content */}
      <m.div variants={fadeUp} className="space-y-8">
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-gray-150/60 dark:bg-white/[0.03] border border-gray-200/50 dark:border-white/5 max-w-fit shadow-inner">
          {[
            { key: "curriculum", label: "المنهج الدراسي", icon: Layers },
            { key: "overview", label: "نظرة عامة", icon: FileText },
            { key: "reviews", label: "التقييمات", icon: Star }
          ].map((tab) =>
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "curriculum" | "overview" | "reviews")}
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

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {lessons.map((lesson, idx) =>
                  <button
                    key={lesson.id}
                    onClick={() => setActiveLesson(lesson.id)}
                    className={cn(
                      "w-full p-4 rounded-2xl text-right flex gap-4 items-center transition-all group",
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
              <AnimatePresence mode="wait">
                {activeLessonData &&
                  <m.div
                    key={activeLessonData.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    className="space-y-6">
                    {/* Video player */}
                    <div className="rounded-[28px] overflow-hidden border border-gray-250 dark:border-white/[0.08] bg-white dark:bg-gray-900/80 shadow-md">
                      <LessonVideoArea
                        canAccess={canAccessActiveLesson}
                        lessonData={activeLessonData}
                        courseId={course.id}
                        courseEnrolled={course.enrolled}
                        authName={authUser?.name}
                        userId={userId}
                        onAutoComplete={() => course.enrolled && void handleLessonComplete(activeLessonData.id)}
                        onEnroll={handleEnroll}
                      />

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
                            dangerouslySetInnerHTML={{ __html: activeLessonData.content }} />
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
                          if (idx > 0) setActiveLesson(lessons[idx - 1]!.id);
                        }}>
                        <ChevronRight className="w-4 h-4" />
                        <span>الدرس السابق</span>
                      </Button>

                      <Button
                        className="gap-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 text-sm font-bold"
                        onClick={() => {
                          const idx = lessons.findIndex((l) => l.id === activeLesson);
                          if (idx < lessons.length - 1) setActiveLesson(lessons[idx + 1]!.id);
                        }}>
                        <span>الدرس التالي</span>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </m.div>
                }
              </AnimatePresence>
            </div>
          </div>
        }

        {/* Overview Tab */}
        {activeTab === "overview" &&
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
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
          </m.div>
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
            userRating={userRating}
            setUserRating={setUserRating}
            userComment={userComment}
            setUserComment={setUserComment}
            submittingReview={submittingReview}
            setSubmittingReview={setSubmittingReview} />
        }
      </m.div>

      {/* Separator */}
      <div className="border-t border-gray-200 dark:border-white/5 my-10" />

      {/* Certificate Preview Banner */}
      <m.div
        variants={fadeUp}
        className="rounded-[28px] border border-amber-500/20 dark:border-amber-500/10 bg-gradient-to-br from-amber-500/[0.03] to-amber-500/[0.01] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4 text-right">
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
      </m.div>

      {/* Certificate Modal */}
      <CertificatePreviewModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        studentName={authUser?.name || "طالب متفوق"}
        courseTitle={course.title}
        instructorName={course.instructor}
      />
    </m.div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ensureUser } from "@/lib/user-utils";
import { logger } from "@/lib/logger";
import CourseVideoPlayer from "@/components/video/CourseVideoPlayer";
import {
  BookOpen,
  Clock,
  Users,
  Star,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Lock,
  GraduationCap,
  FileText,
  Share2,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
  Loader2
} from "lucide-react";

type Course = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  subject: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  duration: number;
  thumbnailUrl?: string;
  price: number;
  rating: number;
  enrolledCount: number;
  createdAt: string;
  tags: string[];
  enrolled: boolean;
  progress?: number;
};

type CourseLesson = {
  id: string;
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  duration: number;
  order: number;
  completed: boolean;
  progress: number;
};

type CourseApiLesson = {
  id: string;
  title?: string;
  name?: string;
  description?: string | null;
  content?: string | null;
  videoUrl?: string | null;
  duration?: number | null;
  order?: number | null;
  completed?: boolean;
  progress?: number;
};

type LessonsApiResponse =
  | CourseApiLesson[]
  | {
      lessons?: CourseApiLesson[];
      progress?: Record<string, boolean>;
    };

const levelConfig = {
  BEGINNER: { label: "مبتدئ", color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" },
  INTERMEDIATE: { label: "متوسط", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
  ADVANCED: { label: "متقدم", color: "text-rose-600 bg-rose-100 dark:bg-rose-900/30" }
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    if (!courseId) return;

    const fetchCourse = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}${userId ? `?userId=${userId}` : ""}`);
        if (res.ok) {
          const courseData = await res.json();
          if (courseData?.subject) {
            const subject = courseData.subject;

            setCourse({
              id: subject.id,
              title: subject.nameAr || subject.name,
              description: subject.description || "لا يوجد وصف متاح لهذه الدورة.",
              instructor: subject.instructorName || "المنصة التعليمية",
              subject: subject.nameAr || subject.name,
              level: (subject.level as any) || "MEDIUM",
              duration: subject.durationHours || 0,
              thumbnailUrl: subject.thumbnailUrl || undefined,
              price: subject.price || 0,
              rating: subject.rating || 0,
              enrolledCount: subject.enrolledCount || 0,
              createdAt: subject.createdAt || new Date().toISOString(),
              tags: [subject.nameAr || subject.name, ...(subject.tags || [])],
              enrolled: Boolean(courseData.enrollment),
              progress: courseData.enrollment ? (courseData.enrollment.progress || 0) : undefined,
            });
          }
        } else {
          router.push("/courses");
        }
      } catch (error) {
        logger.error("Error fetching course:", error);
        router.push("/courses");
      }
    };

    const fetchLessons = async () => {
      try {
        if (courseId.startsWith("fake-course-")) {
          const allFakeLessons: Record<string, CourseLesson[]> = {
            "fake-course-pro": [
              { id: "l1", title: "مقدمة في React", description: "تعرف على أساسيات مكتبة React وكيفية عملها", videoUrl: "https://vjs.zencdn.net/v/oceans.mp4", duration: 720, order: 1, completed: false, progress: 0 },
              { id: "l2", title: "مكونات React (Components)", description: "كيفية بناء مكونات قابلة لإعادة الاستخدام", content: "<h3>شرح المكونات</h3><p>المكونات هي حجر الأساس في بناء تطبيقات React...</p>", duration: 900, order: 2, completed: false, progress: 0 },
              { id: "l3", title: "إدارة الحالة (State)", description: "كيفية إدارة وتحديث البيانات داخل المكونات", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", duration: 1200, order: 3, completed: false, progress: 0 },
              { id: "l4", title: "التعامل مع Next.js", description: "الأساسيات والانتقال من React إلى Next.js", content: "<h3>مزايا Next.js</h3><ul><li>SSR/SSG</li><li>توجيه تلقائي</li></ul>", duration: 1500, order: 4, completed: false, progress: 0 },
            ],
            "fake-course-python": [
              { id: "p1", title: "مقدمة في بايثون", description: "تنصيب البيئة وأول برنامج", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", duration: 600, order: 1, completed: false, progress: 0 },
              { id: "p2", title: "المتغيرات والبيانات", description: "التعامل مع النصوص والأرقام", content: "<p>في هذا الدرس سنتعلم القواعد الأساسية للمتغيرات في بايثون.</p>", duration: 800, order: 2, completed: false, progress: 0 },
            ],
            "fake-course-design": [
              { id: "d1", title: "أساسيات UI/UX", description: "الفرق بين UI و UX", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", duration: 900, order: 1, completed: false, progress: 0 },
              { id: "d2", title: "مقدمة إلى Figma", description: "شرح واجهة البرنامج", content: "<p>برنامج فيجما هو الأداة الأقوى لتصميم الواجهات حالياً.</p>", duration: 1100, order: 2, completed: false, progress: 0 },
            ],
            "fake-course-backend": [
              { id: "b1", title: "ما هو Node.js", description: "فهم بيئة تشغيل نود", videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", duration: 850, order: 1, completed: false, progress: 0 },
              { id: "b2", title: "إعداد خادم Express", description: "إنشاء أول خادم", content: "<p>مثال على إنشاء خادم مبسط باستخدام Express.</p>", duration: 1200, order: 2, completed: false, progress: 0 },
            ]
          };

          const fakeLessons = allFakeLessons[courseId] || allFakeLessons["fake-course-pro"];
          setLessons(fakeLessons);
          setActiveLesson(fakeLessons[0].id);
          return;
        }

        const res = await fetch(`/api/courses/${courseId}/lessons${userId ? `?userId=${userId}` : ""}`);
        if (res.ok) {
          const lessonsData: LessonsApiResponse = await res.json();
          const rawLessons = Array.isArray(lessonsData) ? lessonsData : lessonsData.lessons ?? [];
          const progressMap =
            Array.isArray(lessonsData) || !lessonsData.progress ? {} : lessonsData.progress;

          const normalizedLessons: CourseLesson[] = rawLessons.map((lesson, index) => {
            const fallbackProgress =
              typeof lesson.progress === "number"
                ? Math.min(100, Math.max(0, lesson.progress))
                : 0;
            const completed = lesson.completed ?? Boolean(progressMap[lesson.id]);

            return {
              id: lesson.id,
              title: lesson.title || lesson.name || `الدرس ${index + 1}`,
              description: lesson.description ?? undefined,
              content: lesson.content ?? undefined,
              videoUrl: lesson.videoUrl ?? undefined,
              duration:
                typeof lesson.duration === "number" && lesson.duration > 0
                  ? lesson.duration
                  : 600,
              order:
                typeof lesson.order === "number" && lesson.order > 0
                  ? lesson.order
                  : index + 1,
              completed,
              progress: completed ? 100 : fallbackProgress,
            };
          });

          setLessons(normalizedLessons);
          if (normalizedLessons.length > 0) {
            setActiveLesson(normalizedLessons[0].id);
          }
        }
      } catch (error) {
        logger.error("Error fetching lessons:", error);
      }
    };

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCourse(), fetchLessons()]);
      setLoading(false);
    };

    loadData();
  }, [courseId, userId, router]);

  const handleEnroll = async () => {
    if (!userId || !courseId) return;
    setEnrolling(true);

    try {
      if (courseId.startsWith("fake-course-")) {
        setTimeout(() => {
          if (course) setCourse({ ...course, enrolled: true, progress: 0 });
          setEnrolling(false);
        }, 1000);
        return;
      }

      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: courseId })
      });

      if (res.ok) {
        if (course) {
          setCourse({ ...course, enrolled: true, progress: 0 });
        }
      } else {
        alert("حدث خطأ أثناء التسجيل في الدورة");
      }
    } catch (error) {
      logger.error("Error enrolling in course:", error);
      alert("حدث خطأ أثناء التسجيل في الدورة");
    } finally {
      if (!courseId.startsWith("fake-course-")) {
        setEnrolling(false);
      }
    }
  };

  const handleUnenroll = async () => {
    if (!userId || !courseId) return;
    setEnrolling(true);

    try {
      if (courseId.startsWith("fake-course-")) {
        setTimeout(() => {
          if (course) setCourse({ ...course, enrolled: false, progress: undefined });
          setEnrolling(false);
        }, 1000);
        return;
      }

      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      if (res.ok) {
        if (course) {
          setCourse({ ...course, enrolled: false });
        }
      } else {
        alert("حدث خطأ أثناء إلغاء التسجيل من الدورة");
      }
    } catch (error) {
      logger.error("Error unenrolling from course:", error);
      alert("حدث خطأ أثناء إلغاء التسجيل من الدورة");
    } finally {
      if (!courseId.startsWith("fake-course-")) {
        setEnrolling(false);
      }
    }
  };

  const handleLessonComplete = async (lessonId: string) => {
    if (!userId) return;
    const targetLesson = lessons.find((lesson) => lesson.id === lessonId);
    if (!targetLesson || targetLesson.completed) return;

    const markLessonAsCompletedLocally = () => {
      setLessons((previousLessons) => {
        const updatedLessons = previousLessons.map((lesson) =>
          lesson.id === lessonId ? { ...lesson, completed: true, progress: 100 } : lesson
        );
        const completedLessons = updatedLessons.filter((lesson) => lesson.completed).length;
        const newProgress =
          updatedLessons.length > 0
            ? Math.round((completedLessons / updatedLessons.length) * 100)
            : 0;

        setCourse((previousCourse) =>
          previousCourse ? { ...previousCourse, progress: newProgress } : previousCourse
        );

        return updatedLessons;
      });
    };

    try {
      if (courseId.startsWith("fake-course-")) {
        markLessonAsCompletedLocally();
        return;
      }

      const res = await fetch(`/api/courses/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: true,
          subject: course?.subject || ""
        })
      });

      if (res.ok) {
        markLessonAsCompletedLocally();

      } else {
        alert("حدث خطأ أثناء تحديث تقدم الدرس");
      }
    } catch (error) {
      logger.error("Error updating lesson progress:", error);
      alert("حدث خطأ أثناء تحديث تقدم الدرس");
    }
  };

  const activeLessonData = useMemo(() => {
    return lessons.find(l => l.id === activeLesson);
  }, [lessons, activeLesson]);

  const completedLessonsCount = useMemo(() => {
    return lessons.filter(l => l.completed).length;
  }, [lessons]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mx-auto mb-4"
          >
            <div className="h-16 w-16 rounded-full border-4 border-slate-200 dark:border-slate-700 relative">
              <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-blue-500" />
            </div>
          </motion.div>
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل الدورة...</p>
        </motion.div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">الدورة غير موجودة</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">لم نتمكن من العثور على الدورة المطلوبة</p>
          <Link href="/courses" className="text-blue-500 hover:underline">العودة إلى الدورات</Link>
        </div>
      </div>
    );
  }

  const levelInfo = levelConfig[course.level];

  return (
          <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="px-4 md:px-6 lg:px-8">
          <section className="mx-auto max-w-7xl py-8 space-y-6">
            {/* Breadcrumb */}
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
            >
              <Link href="/courses" className="hover:text-blue-500 transition-colors">
                الدورات التعليمية
              </Link>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-slate-900 dark:text-white font-medium truncate max-w-xs">
                {course.title}
              </span>
            </motion.nav>

            {/* Course Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl shadow-xl"
            >
              <div className="lg:flex">
                {/* Thumbnail */}
                <div className="lg:w-2/5 relative">
                  <div className="aspect-video lg:aspect-auto lg:h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full min-h-[250px] flex items-center justify-center">
                        <motion.div
                          animate={{ 
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{ duration: 4, repeat: Infinity }}
                        >
                          <GraduationCap className="h-24 w-24 text-blue-400/60" />
                        </motion.div>
                      </div>
                    )}
                  </div>

                  {/* Overlay badges */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <span className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-sm font-medium text-slate-700 dark:text-slate-200 shadow-lg">
                      {course.subject}
                    </span>
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${levelInfo.color}`}>
                      {levelInfo.label}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="lg:w-3/5 p-6 lg:p-8">
                  <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    {course.title}
                  </h1>

                  <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                    {course.description}
                  </p>

                  {/* Instructor */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {course.instructor.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">المدرب</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{course.instructor}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Star className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{course.rating.toFixed(1)}</p>
                        <p className="text-xs text-slate-500">التقييم</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{course.enrolledCount}</p>
                        <p className="text-xs text-slate-500">طالب</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{course.duration}</p>
                        <p className="text-xs text-slate-500">ساعة</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{lessons.length}</p>
                        <p className="text-xs text-slate-500">درس</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress (for enrolled) */}
                  {course.enrolled && course.progress !== undefined && (
                    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-100 dark:border-blue-800/30">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">تقدمك في الدورة</span>
                        <span className="text-lg font-bold text-blue-600">{course.progress}%</span>
                      </div>
                      <div className="h-3 bg-white dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${course.progress}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {completedLessonsCount} من {lessons.length} درس مكتمل
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {course.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    {course.enrolled ? (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleUnenroll}
                          disabled={enrolling}
                          className="px-6 py-3 rounded-xl border border-rose-300 text-rose-600 font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50"
                        >
                          {enrolling ? <Loader2 className="h-5 w-5 animate-spin" /> : "إلغاء التسجيل"}
                        </motion.button>
                      </>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleEnroll}
                        disabled={enrolling}
                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-50"
                      >
                        {enrolling ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : course.price > 0 ? (
                          `سجل الآن - ${course.price} ريال`
                        ) : (
                          "سجل مجاناً"
                        )}
                      </motion.button>
                    )}
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setBookmarked(!bookmarked)}
                      className={`p-3 rounded-xl border transition-colors ${
                        bookmarked
                          ? "border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-500"
                          : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-300"
                      }`}
                    >
                      {bookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-300 transition-colors"
                    >
                      <Share2 className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Course Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lessons List */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-1"
              >
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl overflow-hidden sticky top-4">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      محتوى الدورة
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {lessons.length} درس • {completedLessonsCount} مكتمل
                    </p>
                  </div>
                  
                  <div className="max-h-[500px] overflow-y-auto">
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                      {lessons.map((lesson, index) => (
                        <li key={lesson.id}>
                          <motion.button
                            whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                            className={`w-full text-right p-4 transition-all ${
                              activeLesson === lesson.id
                                ? "bg-blue-50 dark:bg-blue-900/30 border-r-4 border-blue-500"
                                : ""
                            }`}
                            onClick={() => setActiveLesson(lesson.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                lesson.completed
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                                  : activeLesson === lesson.id
                                  ? "bg-blue-500 text-white"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                              }`}>
                                {lesson.completed ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  index + 1
                                )}
                              </div>
                              <div className="flex-grow">
                                <p className={`font-medium text-sm ${
                                  activeLesson === lesson.id
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-slate-900 dark:text-white"
                                }`}>
                                  {lesson.title}
                                </p>
                                {lesson.description && (
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                    {lesson.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-400">
                                    {Math.floor(lesson.duration / 60)}:{String(lesson.duration % 60).padStart(2, "0")}
                                  </span>
                                  {!course.enrolled && lesson.videoUrl && (
                                    <Lock className="h-3 w-3 text-slate-400" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* Lesson Content */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-2"
              >
                <AnimatePresence mode="wait">
                  {activeLessonData ? (
                    <motion.div
                      key={activeLessonData.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl overflow-hidden"
                    >
                      {/* Lesson header */}
                      <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {activeLessonData.title}
                          </h2>
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {Math.floor(activeLessonData.duration / 60)}:{String(activeLessonData.duration % 60).padStart(2, "0")}
                          </span>
                        </div>
                        {activeLessonData.description && (
                          <p className="text-slate-600 dark:text-slate-300">
                            {activeLessonData.description}
                          </p>
                        )}
                      </div>

                      {/* Video player area */}
                      {activeLessonData.videoUrl && course.enrolled ? (
                        <CourseVideoPlayer
                          courseId={course.id}
                          lessonId={activeLessonData.id}
                          lessonTitle={activeLessonData.title}
                          videoUrl={activeLessonData.videoUrl}
                          alreadyCompleted={activeLessonData.completed}
                          onLessonAutoComplete={() => {
                            void handleLessonComplete(activeLessonData.id);
                          }}
                        />
                      ) : activeLessonData.videoUrl && !course.enrolled ? (
                        <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                          <div className="text-center p-8">
                            <Lock className="h-16 w-16 mx-auto mb-4 text-slate-500" />
                            <h3 className="text-xl font-bold text-white mb-2">محتوى محمي</h3>
                            <p className="text-slate-400 mb-6 max-w-md">
                              سجل في الدورة للوصول إلى جميع الدروس والفيديوهات
                            </p>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleEnroll}
                              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium shadow-lg"
                            >
                              {course.price > 0 ? `سجل الآن - ${course.price} ريال` : "سجل مجاناً"}
                            </motion.button>
                          </div>
                        </div>
                      ) : null}

                      {/* Lesson content */}
                      {activeLessonData.content && course.enrolled ? (
                        <div className="p-6">
                          <div 
                            className="prose prose-slate dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: activeLessonData.content }}
                          />
                        </div>
                      ) : activeLessonData.content && !course.enrolled ? (
                        <div className="p-6">
                          <div className="p-8 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-center">
                            <Lock className="h-8 w-8 mx-auto mb-3 text-slate-400" />
                            <p className="text-slate-500 dark:text-slate-400">
                              سجل في الدورة للوصول إلى المحتوى الكامل للدرس
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {/* Lesson navigation */}
                      {course.enrolled && lessons.length > 0 && (
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex items-center justify-between">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                const currentIndex = lessons.findIndex(l => l.id === activeLesson);
                                if (currentIndex > 0) {
                                  setActiveLesson(lessons[currentIndex - 1].id);
                                }
                              }}
                              disabled={lessons.findIndex(l => l.id === activeLesson) === 0}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:border-blue-300 transition-colors"
                            >
                              <ChevronRight className="h-4 w-4" />
                              الدرس السابق
                            </motion.button>

                            {!activeLessonData.completed && (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleLessonComplete(activeLessonData.id)}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/25"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                تحديد كمكتمل
                              </motion.button>
                            )}

                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                const currentIndex = lessons.findIndex(l => l.id === activeLesson);
                                if (currentIndex < lessons.length - 1) {
                                  setActiveLesson(lessons[currentIndex + 1].id);
                                }
                              }}
                              disabled={lessons.findIndex(l => l.id === activeLesson) === lessons.length - 1}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:border-blue-300 transition-colors"
                            >
                              الدرس التالي
                              <ChevronLeft className="h-4 w-4" />
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-12 text-center"
                    >
                      <BookOpen className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        اختر درساً للمشاهدة
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400">
                        اختر درساً من القائمة الجانبية لعرض محتواه
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </section>
        </div>
      </div>
      );
}

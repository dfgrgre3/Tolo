"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { ensureUser } from "@/lib/user-utils";
import { logger } from "@/lib/logger";
import { CourseVideoPlayer } from "@/components/video/CourseVideoPlayer";
import { toast } from "sonner";
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
  Share2,
  Bookmark,
  BookmarkCheck,
  Loader2,
  Play,
  Award,

  FileText,
  MessageSquare,
  Download,


  Shield,


  Layers } from
"lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/api-client";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {name: string | null;avatar: string | null;};
};

type ReviewStats = {
  totalReviews: number;
  avgRating: number;
  distribution: Record<number, number>;
};

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
  tags?: string[];
  enrolled: boolean;
  progress?: number;
  lessonsCount?: number;
  whatYouLearn?: string[];
  coursePrerequisites?: string[];
  targetAudience?: string[];
  requirements?: string;
  learningObjectives?: string;
};

type CourseLesson = {
  id: string;
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  type: "VIDEO" | "ARTICLE" | "QUIZ" | "FILE" | "ASSIGNMENT";
  isFree: boolean;
  locked: boolean;
  duration: number;
  order: number;
  completed: boolean;
  progress: number;
};

const levelConfig = {
  BEGINNER: { label: "مبتدئ", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  INTERMEDIATE: { label: "متوسط", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  ADVANCED: { label: "متقدم", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" }
};

const container = {
  hidden: { opacity: 0 as const },
  show: { opacity: 1 as const, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};

const fadeUp = {
  hidden: { opacity: 0 as const, y: 16 },
  show: { opacity: 1 as const, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const } }
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (authUser?.id) {
      setUserId(authUser.id);
    } else if (!authLoading) {
      ensureUser().then(setUserId);
    }
  }, [authUser, authLoading]);

  useEffect(() => {
    if (!courseId) return;

    const fetchCourse = async () => {
      try {
        const courseData = await apiClient.get<any>(`/courses/${courseId}${userId ? `?userId=${userId}` : ""}`);
        
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
            progress: courseData.enrollment ? courseData.enrollment.progress || 0 : undefined
          });
        }
      } catch (error) {
        logger.error("Error fetching course:", error);
      }
    };


    const fetchLessons = async () => {
      try {
        const data = await apiClient.get<any>(`/courses/${courseId}/lessons${userId ? `?userId=${userId}` : ""}`);
        
        const payload = data.data ?? data;
        const rawLessons = Array.isArray(payload) ? payload : (payload.lessons ?? []);
        const progressMap = payload.progress || {};

        const normalized = rawLessons.map((l: any, i: number) => {
          const durationMinutes = typeof l.durationMinutes === "number" ? l.durationMinutes : l.duration || 0;

          return ({
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
          });
        });
        setLessons(normalized);
        if (normalized.length > 0) {
          const firstPlayableLesson = normalized.find((lesson: any) => !lesson.locked) || normalized[0];
          setActiveLesson(firstPlayableLesson.id);
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
      if (course) setCourse({ ...course, enrolled: true, progress: 0 });
    } catch (err: any) {
      // Check if this is a payment required error (HTTP 402)
      if (err?.status === 402 || err?.data?.requiresPayment) {
        router.push(`/courses/${courseId}/checkout`);
        return;
      }
      logger.error("Error in handleEnroll", err);
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
  const canAccessActiveLesson = Boolean(course?.enrolled || activeLessonData?.isFree);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0B0D14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 border-2 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-500 font-medium">جاري تحميل الدورة...</p>
        </div>
      </div>);

  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0B0D14] flex items-center justify-center">
        <div className="text-center space-y-4">
          <GraduationCap className="h-16 w-16 text-gray-300 mx-auto" />
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">لم يتم العثور على الدورة</h2>
          <Link href="/courses">
            <Button className="mt-4">العودة إلى الدورات</Button>
          </Link>
        </div>
      </div>);

  }

  const levelInfo = levelConfig[course.level] || levelConfig.INTERMEDIATE;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0D14] pb-20" dir="rtl">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/[0.02] blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/[0.02] blur-[130px] rounded-full" />
      </div>

      <m.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        
        {/* Breadcrumb */}
        <m.nav
          variants={fadeUp}
          className="flex items-center gap-2 text-sm text-gray-500">
          
          <Link href="/courses" className="hover:text-primary transition-colors font-medium">
            الدورات التعليمية
          </Link>
          <ChevronLeft className="h-4 w-4" />
          <span className="text-gray-900 dark:text-white font-bold truncate">{course.title}</span>
        </m.nav>

        {/* Course Header */}
        <m.div
          variants={fadeUp}
          className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Left: Course Info (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className={cn("border px-3 py-1 font-medium text-xs", levelInfo.bg, levelInfo.color, levelInfo.border)}>
                {levelInfo.label}
              </Badge>
              <Badge className="border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 px-3 py-1 font-medium text-xs">
                {course.subject}
              </Badge>
              {course.price === 0 &&
              <Badge className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 px-3 py-1 font-medium text-xs">
                  مجانية
                </Badge>
              }
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
              {course.title}
            </h1>

            {/* Description */}
            <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
              {course.description}
            </p>

            {/* Instructor */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                {course.instructor.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">المعلم</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{course.instructor}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4">
              {[
              { icon: Star, label: "التقييم", value: course.rating.toFixed(1), color: "text-amber-500" },
              { icon: Users, label: "المسجلين", value: course.enrolledCount, color: "text-blue-500" },
              { icon: Clock, label: "المدة", value: `${course.duration} ساعة`, color: "text-purple-500" },
              { icon: BookOpen, label: "الدروس", value: lessons.length, color: "text-emerald-500" }].
              map((stat, i) =>
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/60 px-4 py-3">
                
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{stat.value}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            {(course.tags || []).length > 0 &&
            <div className="flex flex-wrap gap-2">
                {(course.tags || []).map((tag) =>
              <span key={tag} className="rounded-lg bg-gray-100 dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                    {tag}
                  </span>
              )}
              </div>
            }
          </div>

          {/* Right: Action Card (2 cols) */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-6 space-y-6 shadow-lg shadow-black/5 dark:shadow-black/20">
              {/* Thumbnail */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                {course.thumbnailUrl ?
                <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" /> :

                <div className="flex items-center justify-center h-full">
                    <GraduationCap className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                  </div>
                }
                {course.enrolled &&
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <button
                    onClick={() => router.push(`/learning/${courseId}`)}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 hover:scale-110 transition-transform">
                    
                      <Play className="h-6 w-6 text-white fill-white" />
                    </button>
                  </div>
                }
              </div>

              {/* Price */}
              <div className="flex items-center justify-between">
                <div className="text-3xl font-black text-gray-900 dark:text-white">
                  {course.price === 0 ?
                  <span className="text-emerald-500">مجاناً</span> :

                  <div className="flex items-baseline gap-1">
                      <span>{course.price}</span>
                      <span className="text-sm font-bold text-gray-400">ج.م</span>
                    </div>
                  }
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setBookmarked(!bookmarked)}
                    className={cn("h-10 w-10 rounded-xl", bookmarked ? "text-primary bg-primary/10" : "text-gray-400")}>
                    
                    {bookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-gray-400">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Progress or Enroll */}
              {course.enrolled ?
              <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-500">التقدم في الدورة</span>
                      <span className="font-black text-primary">{courseProgress}%</span>
                    </div>
                    <Progress value={courseProgress} className="h-2" />
                    <p className="text-[11px] text-gray-400">
                      {completedCount} من {lessons.length} دروس مكتملة
                    </p>
                  </div>

                  <Button
                  onClick={() => router.push(`/learning/${courseId}`)}
                  className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all gap-2">
                  
                    <Play className="h-4 w-4 fill-current" />
                    {courseProgress > 0 ? "متابعة التعلم" : "ابدأ التعلم الآن"}
                  </Button>
                </div> :

              <Button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full h-14 bg-primary text-white font-bold text-base rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all gap-2">
                
                  {enrolling ?
                <Loader2 className="h-5 w-5 animate-spin" /> :

                <Shield className="h-5 w-5" />
                }
                  <span>{course.price > 0 ? `سجل الآن - ${course.price} ج.م` : "ابدأ التعلم مجاناً"}</span>
                </Button>
              }

              {/* Course features */}
              <div className="space-y-3 border-t border-gray-100 dark:border-white/5 pt-4">
                {[
                { icon: BookOpen, text: `${lessons.length} دروس تعليمية` },
                { icon: Clock, text: `${course.duration} ساعات محتوى` },
                { icon: Download, text: "وصول مدى الحياة" },
                { icon: Award, text: "شهادة إتمام" },
                { icon: MessageSquare, text: "دعم ومناقشات" }].
                map((feature, i) =>
                <div key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <feature.icon className="h-4 w-4 text-gray-400" />
                    <span>{feature.text}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </m.div>

        {/* Tabs */}
        <m.div variants={fadeUp} className="space-y-8">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/5 max-w-fit">
            {[
            { key: "curriculum", label: "المنهج الدراسي", icon: Layers },
            { key: "overview", label: "نظرة عامة", icon: FileText },
            { key: "reviews", label: "التقييمات", icon: Star }].
            map((tab) =>
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "curriculum" | "overview" | "reviews")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                activeTab === tab.key ?
                "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" :
                "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
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
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    قائمة الدروس
                  </h2>
                  <span className="text-xs font-medium text-gray-500">
                    {completedCount}/{lessons.length} مكتملة
                  </span>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {lessons.map((lesson, idx) =>
                <button
                  key={lesson.id}
                  onClick={() => setActiveLesson(lesson.id)}
                  className={cn(
                    "w-full p-4 rounded-xl text-right flex gap-4 items-center transition-all group",
                    activeLesson === lesson.id ?
                    "bg-primary/5 dark:bg-primary/10 border border-primary/20" :
                    "bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/10"
                  )}>
                  
                      <div
                    className={cn(
                      "h-9 w-9 min-w-[36px] rounded-xl flex items-center justify-center text-xs font-bold transition-all",
                      lesson.completed ?
                      "bg-emerald-500 text-white" :
                      activeLesson === lesson.id ?
                      "bg-primary text-white" :
                      "bg-gray-100 dark:bg-white/5 text-gray-500"
                    )}>
                    
                        {lesson.completed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                      className={cn(
                        "font-bold text-sm truncate transition-colors",
                        activeLesson === lesson.id ? "text-primary" : "text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white"
                      )}>
                      
                          {lesson.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-[11px] text-gray-400">
                            {Math.floor(lesson.duration / 60)} دقيقة
                          </span>
                          {lesson.isFree &&
                      <Badge className="h-5 border-0 bg-emerald-500/10 px-2 text-[9px] font-bold text-emerald-500">
                              معاينة مجانية
                            </Badge>
                      }
                          {lesson.locked &&
                      <Lock className="w-3 h-3 text-gray-400" />
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
                      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80">
                        {canAccessActiveLesson && activeLessonData.videoUrl ?
                    <CourseVideoPlayer
                      key={activeLessonData.id}
                      courseId={course.id}
                      lessonId={activeLessonData.id}
                      lessonTitle={activeLessonData.title}
                      videoUrl={activeLessonData.videoUrl}
                      alreadyCompleted={activeLessonData.completed}
                      watermarkText={authUser?.name || userId || "Student"}
                      onLessonAutoComplete={() => course.enrolled && void handleLessonComplete(activeLessonData.id)} /> :


                    <div className="aspect-video flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-800">
                            {canAccessActiveLesson ?
                      <>
                                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                                <p className="text-sm text-gray-500 font-medium">محتوى نصي - لا يوجد فيديو لهذا الدرس</p>
                              </> :

                      <>
                                <Lock className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
                                  المحتوى مقفل
                                </h3>
                                <p className="text-sm text-gray-500 mb-4 max-w-sm">
                                  سجل في الدورة لتتمكن من الوصول إلى جميع الدروس والمحتوى التعليمي.
                                </p>
                                <Button onClick={handleEnroll} className="gap-2 rounded-xl bg-primary text-white shadow-lg">
                                  <Shield className="h-4 w-4" />
                                  <span>سجل الآن</span>
                                </Button>
                              </>
                      }
                          </div>
                    }

                        {/* Lesson details */}
                        <div className="p-6 space-y-4 border-t border-gray-100 dark:border-white/5">
                          <div className="flex items-center justify-between">
                            <div>
                              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{activeLessonData.title}</h2>
                              {activeLessonData.description &&
                          <p className="text-sm text-gray-500 mt-1">{activeLessonData.description}</p>
                          }
                            </div>
                            {!activeLessonData.completed && course.enrolled &&
                        <Button
                          onClick={() => handleLessonComplete(activeLessonData.id)}
                          size="sm"
                          className="gap-1.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600">
                          
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
                      className="gap-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700"
                      onClick={() => {
                        const idx = lessons.findIndex((l) => l.id === activeLesson);
                        if (idx > 0) setActiveLesson(lessons[idx - 1].id);
                      }}>
                      
                          <ChevronRight className="w-4 h-4" />
                          <span>الدرس السابق</span>
                        </Button>

                        <Button
                      className="gap-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 text-sm font-medium"
                      onClick={() => {
                        const idx = lessons.findIndex((l) => l.id === activeLesson);
                        if (idx < lessons.length - 1) setActiveLesson(lessons[idx + 1].id);
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
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
            
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">عن هذه الدورة</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{course.description}</p>
                </div>

                <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">ما ستتعلمه</h3>
                  <ul className="space-y-3">
                    {(course.whatYouLearn && course.whatYouLearn.length > 0 ?
                  course.whatYouLearn :
                  course.learningObjectives ?
                  course.learningObjectives.split('\n').filter(Boolean) :
                  ["فهم المفاهيم الأساسية للموضوع", "تطبيق المعرفة في مشاريع عملية", "اكتساب مهارات متقدمة في المجال", "الاستعداد للاختبارات والتقييمات"]).
                  map((item: string, i: number) =>
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                  )}
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">المتطلبات</h3>
                  <ul className="space-y-3">
                    {(course.coursePrerequisites && course.coursePrerequisites.length > 0 ?
                  course.coursePrerequisites :
                  course.requirements ?
                  course.requirements.split('\n').filter(Boolean) :
                  ["المعرفة الأساسية بالموضوع", "الرغبة في التعلم والتطبيق", "جهاز حاسوب أو هاتف ذكي"]).
                  map((item: string, i: number) =>
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span>{item}</span>
                      </li>
                  )}
                  </ul>
                </div>

                <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">عن المعلم</h3>
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold">
                      {course.instructor.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{course.instructor}</p>
                      <div className="flex items-center gap-1 text-amber-500 mt-1">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-xs font-bold">{course.rating.toFixed(1)} تقييم</span>
                      </div>
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
      </m.div>
    </div>);

}

// ============ Reviews Tab Component ============

function ReviewsTab({
  courseId,
  courseRating,
  enrolled,
  reviews,
  setReviews,
  reviewStats,
  setReviewStats,
  reviewsLoading,
  setReviewsLoading,
  userRating,
  setUserRating,
  userComment,
  setUserComment,
  submittingReview,
  setSubmittingReview

}: {courseId: string;courseRating: number;enrolled: boolean;reviews: Review[];setReviews: (r: Review[]) => void;reviewStats: ReviewStats | null;setReviewStats: (s: ReviewStats | null) => void;reviewsLoading: boolean;setReviewsLoading: (l: boolean) => void;userRating: number;setUserRating: (r: number) => void;userComment: string;setUserComment: (c: string) => void;submittingReview: boolean;setSubmittingReview: (s: boolean) => void;}) {
  useEffect(() => {
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const res = await fetch(`/api/courses/${courseId}/reviews`);
        if (res.ok) {
          const data = await res.json();
          const reviewData = data.data || data;
          setReviews(reviewData.reviews || []);
          setReviewStats(reviewData.stats || null);
        }
      } catch {

        // silently handled
      } finally {setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [courseId, setReviews, setReviewStats, setReviewsLoading]);

  const handleSubmitReview = async () => {
    if (userRating === 0) {
      toast.error("يرجى اختيار تقييم");
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: userRating, comment: userComment || undefined })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`تم إرسال تقييمك! +${data.data?.xpAwarded || 10} XP`);
        setUserRating(0);
        setUserComment("");
        // Refresh reviews
        const refreshRes = await fetch(`/api/courses/${courseId}/reviews`);
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const reviewData = refreshData.data || refreshData;
          setReviews(reviewData.reviews || []);
          setReviewStats(reviewData.stats || null);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "فشل إرسال التقييم");
      }
    } catch {
      toast.error("حدث خطأ أثناء إرسال التقييم");
    } finally {
      setSubmittingReview(false);
    }
  };

  const avgRating = reviewStats?.avgRating || courseRating;
  const totalReviews = reviewStats?.totalReviews || 0;

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl space-y-6">
      
      {/* Review summary */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-6">
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-5xl font-black text-gray-900 dark:text-white">{avgRating.toFixed(1)}</p>
            <div className="flex items-center justify-center gap-0.5 mt-2">
              {Array.from({ length: 5 }).map((_, i) =>
              <Star
                key={i}
                className={cn(
                  "h-4 w-4",
                  i < Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-300"
                )} />

              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{totalReviews} تقييم</p>
          </div>
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = reviewStats?.distribution?.[stars] || 0;
              const percentage = totalReviews > 0 ? count / totalReviews * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-500 w-3">{stars}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${percentage}%` }} />
                    
                  </div>
                  <span className="text-[10px] text-gray-400 w-6 text-left">{count}</span>
                </div>);

            })}
          </div>
        </div>
      </div>

      {/* Submit Review Form */}
      {enrolled &&
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">شارك تقييمك</h3>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) =>
          <button
            key={i}
            onClick={() => setUserRating(i + 1)}
            className="p-1 transition-transform hover:scale-110">
            
                <Star
              className={cn(
                "h-7 w-7 transition-colors",
                i < userRating ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300"
              )} />
            
              </button>
          )}
            {userRating > 0 &&
          <span className="text-sm font-bold text-amber-500 mr-2">{userRating}/5</span>
          }
          </div>
          <textarea
          value={userComment}
          onChange={(e) => setUserComment(e.target.value)}
          placeholder="اكتب تعليقك (اختياري)..."
          className="w-full h-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
        
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">ستحصل على 10 نقطة XP عند إرسال تقييمك</p>
            <Button
            onClick={handleSubmitReview}
            disabled={submittingReview || userRating === 0}
            className="gap-2 bg-primary text-white rounded-xl h-10 px-6 font-bold text-sm shadow-lg shadow-primary/20">
            
              {submittingReview && <Loader2 className="h-4 w-4 animate-spin" />}
              إرسال التقييم
            </Button>
          </div>
        </div>
      }

      {/* Reviews List */}
      {reviewsLoading ?
      <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-gray-500">جاري تحميل التقييمات...</p>
        </div> :
      reviews.length > 0 ?
      <div className="space-y-3">
          {reviews.map((review) =>
        <div
          key={review.id}
          className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/60 p-5 space-y-3">
          
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                    {review.user?.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{review.user?.name || "مستخدم"}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) =>
              <Star
                key={i}
                className={cn(
                  "h-3.5 w-3.5",
                  i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                )} />

              )}
                </div>
              </div>
              {review.comment &&
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{review.comment}</p>
          }
            </div>
        )}
        </div> :

      <div className="text-center py-12 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">لا توجد تقييمات بعد</p>
          <p className="text-xs text-gray-400 mt-1">
            {enrolled ? "كن أول من يشارك رأيه!" : "سجل في الدورة لتتمكن من التقييم"}
          </p>
        </div>
      }
    </m.div>);

}

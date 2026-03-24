"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ensureUser } from "@/lib/user-utils";
import { logger } from "@/lib/logger";
import { CourseVideoPlayer } from "@/components/video/CourseVideoPlayer";
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




  Sword,
  Target } from


"lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";

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

const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-8 transition-all",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

const levelConfig = {
  BEGINNER: { label: "مبتدئ", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  INTERMEDIATE: { label: "متوسط", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  ADVANCED: { label: "متقدم", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" }
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
  const [, setReviews] = useState<any[]>([]);
  const [, setLeaderboard] = useState<any[]>([]);

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
              level: subject.level as any || "INTERMEDIATE",
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
        }
      } catch (error) {
        logger.error("Error fetching course:", error);
      }
    };

    const fetchLessons = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/lessons${userId ? `?userId=${userId}` : ""}`);
        if (res.ok) {
          const data = await res.json();
          const rawLessons = Array.isArray(data) ? data : data.lessons ?? [];
          const progressMap = data.progress || {};

          const normalized = rawLessons.map((l: any, i: number) => ({
            id: l.id,
            title: l.title || l.name || `الدرس ${i + 1}`,
            description: l.description || undefined,
            content: l.content || undefined,
            videoUrl: l.videoUrl || undefined,
            duration: l.duration || 600,
            order: l.order || i + 1,
            completed: l.completed || Boolean(progressMap[l.id]),
            progress: l.completed ? 100 : l.progress || 0
          }));
          setLessons(normalized);
          if (normalized.length > 0) setActiveLesson(normalized[0].id);
        }
      } catch (error) {
        logger.error("Error fetching lessons:", error);
      }
    };

    const fetchExtras = async () => {
      try {
        const [reviewsRes, leaderboardRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/reviews`),
        fetch(`/api/courses/${courseId}/leaderboard`)]
        );
        if (reviewsRes.ok) setReviews((await reviewsRes.json()).data || []);
        if (leaderboardRes.ok) setLeaderboard((await leaderboardRes.json()).data || []);
      } catch (err) {logger.error(String(err));}
    };

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCourse(), fetchLessons(), fetchExtras()]);
      setLoading(false);
    };
    loadData();
  }, [courseId, userId, router]);

  const handleEnroll = async () => {
    if (!userId || !courseId) return;
    setEnrolling(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: courseId })
      });
      if (res.ok) {
        if (course) setCourse({ ...course, enrolled: true, progress: 0 });
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleLessonComplete = async (lessonId: string) => {
    if (!userId || !course) return;
    try {
      setLessons((prev) => prev.map((l) => l.id === lessonId ? { ...l, completed: true, progress: 100 } : l));
      await fetch(`/api/courses/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, subject: course.subject })
      });
    } catch (err) {
      logger.error("Error marking lesson complete:", err);
    }
  };

  const activeLessonData = useMemo(() => lessons.find((l) => l.id === activeLesson), [lessons, activeLesson]);
  const _completedCount = useMemo(() => lessons.filter((l) => l.completed).length, [lessons]);

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
       <div className="relative h-24 w-24">
          <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
          <div className="absolute inset-4 border-b-2 border-primary/30 rounded-full animate-spin-reverse" />
       </div>
    </div>);


  if (!course) return <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center">Course not found</div>;

  const levelInfo = levelConfig[course.level] || levelConfig.INTERMEDIATE;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-gray-100 overflow-hidden pb-40" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full opacity-30" />
        <div className="absolute bottom-[20%] left-[5%] w-[500px] h-[500px] bg-purple-600/5 blur-[130px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        {/* --- Breadcrumb & Actions --- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
           <motion.nav
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
            
              <Link href="/courses" className="hover:text-primary transition-colors">مخطوطات العلم</Link>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-white">{course.title}</span>
           </motion.nav>

           <div className="flex items-center gap-3">
              <Button
              variant="ghost"
              onClick={() => setBookmarked(!bookmarked)}
              className={cn("h-12 w-12 rounded-2xl border border-white/5", bookmarked ? "bg-primary text-black" : "bg-white/5 text-gray-400")}>
              
                 {bookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" className="h-12 w-12 rounded-2xl border border-white/5 bg-white/5 text-gray-400">
                 <Share2 className="w-5 h-5" />
              </Button>
           </div>
        </div>

        {/* --- Course Master Header --- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className={STYLES.glass + " group overflow-hidden"}>
          
           <div className="lg:flex">
              <div className="lg:w-2/5 relative overflow-hidden group/thumb">
                 <div className="aspect-video lg:aspect-auto lg:h-full bg-gradient-to-br from-primary/20 via-black to-black">
                    {course.thumbnailUrl ?
                <img src={course.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover/thumb:scale-110" /> :

                <div className="w-full h-full flex items-center justify-center opacity-20">
                         <GraduationCap className="h-32 w-32" />
                      </div>
                }
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                 </div>
                 <div className="absolute top-6 right-6 flex flex-col gap-2">
                    <Badge className="bg-black/60 backdrop-blur-md text-white font-black text-[9px] uppercase tracking-widest px-4 h-7 border border-white/10">{course.subject}</Badge>
                    <Badge className={cn("font-black text-[9px] uppercase tracking-widest px-4 h-7 border", levelInfo.color)}>{levelInfo.label}</Badge>
                 </div>
              </div>

              <div className="lg:w-3/5 p-10 lg:p-16 space-y-8">
                 <div className="space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight">{course.title}</h1>
                    <p className="text-lg text-gray-400 font-medium leading-relaxed max-w-2xl">{course.description}</p>
                 </div>

                 <div className="flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xl">
                       {course.instructor.charAt(0)}
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">المعلم المسؤول</p>
                       <p className="text-xl font-black text-white">{course.instructor}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                { icon: Star, label: "التقييم", val: course.rating.toFixed(1), color: "text-amber-400" },
                { icon: Users, label: "المتدربين", val: course.enrolledCount, color: "text-blue-400" },
                { icon: Clock, label: "الساعات", val: course.duration, color: "text-purple-400" },
                { icon: BookOpen, label: "الدروس", val: lessons.length, color: "text-emerald-400" }].
                map((stat, i) =>
                <div key={i} className="space-y-2">
                         <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                            <span>{stat.label}</span>
                          </div>
                         <p className="text-2xl font-black text-white">{stat.val}</p>
                      </div>
                )}
                 </div>

                 <div className="flex flex-wrap items-center gap-6 pt-4">
                    {course.enrolled ?
                <div className="flex-1 space-y-4 bg-white/5 p-6 rounded-2xl border border-white/5">
                         <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-gray-400">تقدمك العسكري</span>
                            <span className="text-primary">{course.progress}%</span>
                         </div>
                         <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-6">
                            <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${course.progress}%` }}
                      className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                    
                         </div>
                         <Button
                    onClick={() => router.push(`/learning/${courseId}`)}
                    className="w-full h-14 bg-primary text-black font-black rounded-xl hover:scale-[1.03] transition-all gap-3">
                    
                            <Play className="w-5 h-5 fill-current" />
                            استكمال المغامرة التعليمية
                         </Button>
                      </div> :

                <Button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="h-16 px-12 bg-primary text-black font-black text-lg rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.03] transition-all flex gap-4">
                  
                         {enrolling ? <Loader2 className="animate-spin" /> : <Sword className="w-6 h-6" />}
                         <span>{course.price > 0 ? `سجل الآن - ${course.price} ريال` : "ابدأ رحلتك مجاناً"}</span>
                      </Button>
                }
                 </div>
              </div>
           </div>
        </motion.div>

        {/* --- Battle Plan: Content Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
           {/* Sidebar: Lessons Scroll */}
           <div className="lg:col-span-4 space-y-8 sticky top-12">
              <div className={STYLES.glass + " p-0 overflow-hidden"}>
                 <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                       <h2 className="text-xl font-black text-white">خارطة الدروس</h2>
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">رتب مهامك التعليمية</p>
                    </div>
                    <Target className="w-6 h-6 text-primary opacity-50" />
                 </div>
                 
                 <div className="max-h-[600px] overflow-y-auto no-scrollbar py-4 divide-y divide-white/5">
                    {lessons.map((lesson, idx) =>
                <button
                  key={lesson.id}
                  onClick={() => setActiveLesson(lesson.id)}
                  className={cn(
                    "w-full p-6 text-right transition-all flex gap-6 items-start group",
                    activeLesson === lesson.id ? "bg-primary/10" : "hover:bg-white/[0.02]"
                  )}>
                  
                         <div className={cn(
                    "mt-1 h-8 w-8 min-w-[32px] rounded-xl flex items-center justify-center text-xs font-black transition-all",
                    lesson.completed ? "bg-emerald-500 text-black" : activeLesson === lesson.id ? "bg-primary text-black" : "bg-white/5 text-gray-500"
                  )}>
                            {lesson.completed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                         </div>
                         <div className="flex-1 space-y-1">
                            <h4 className={cn("font-black text-sm transition-colors", activeLesson === lesson.id ? "text-primary" : "text-gray-300 group-hover:text-white")}>{lesson.title}</h4>
                            <div className="flex items-center gap-3 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                               <Clock className="w-3 h-3" />
                               <span>{Math.floor(lesson.duration / 60)}:00 دقيقة</span>
                               {!course.enrolled && <Lock className="w-3 h-3 text-red-500/50" />}
                            </div>
                         </div>
                      </button>
                )}
                 </div>
              </div>
           </div>

           {/* Main Theatre: Player & Content */}
           <div className="lg:col-span-8 space-y-12">
              <AnimatePresence mode="wait">
                 {activeLessonData &&
              <motion.div
                key={activeLessonData.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-10">
                
                      <div className={STYLES.glass + " p-0 group"}>
                         {activeLessonData.videoUrl ?
                  <CourseVideoPlayer
                    courseId={course.id}
                    lessonId={activeLessonData.id}
                    lessonTitle={activeLessonData.title}
                    videoUrl={activeLessonData.videoUrl}
                    alreadyCompleted={activeLessonData.completed}
                    onLessonAutoComplete={() => course.enrolled && void handleLessonComplete(activeLessonData.id)} /> :


                  <div className="aspect-video bg-black flex flex-col items-center justify-center p-12 text-center group">
                              <div className="relative mb-8">
                                 <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full group-hover:bg-primary/40 transition-all" />
                                 <Lock className="w-20 h-20 text-white/20 relative z-10" />
                              </div>
                              <h3 className="text-3xl font-black text-white mb-4">هذا المحتوى محمي بالأختام الملكية</h3>
                              <p className="text-gray-500 font-medium max-w-md mb-8">يجب عليك الانضمام إلى فيلق هذه الدورة أولاً لتتمكن من مشاهدة الدروس واستخراج الحكمة منها.</p>
                              {!course.enrolled &&
                    <Button
                      onClick={handleEnroll}
                      className="h-14 px-10 bg-white text-black font-black rounded-2xl gap-3 hover:scale-105 transition-all">
                      
                                   <span>فك الختم الآن</span>
                                   <Sword className="w-5 h-5" />
                                </Button>
                    }
                           </div>
                  }

                         <div className="p-10 space-y-6">
                            <div className="flex items-center justify-between border-b border-white/5 pb-8">
                               <div className="space-y-1">
                                  <h2 className="text-3xl font-black text-white">{activeLessonData.title}</h2>
                                  <p className="text-sm text-gray-500 font-medium">{activeLessonData.description}</p>
                               </div>
                               {!activeLessonData.completed && course.enrolled &&
                      <Button
                        onClick={() => handleLessonComplete(activeLessonData.id)}
                        className="h-12 px-6 bg-emerald-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-400">
                        تمت المهمة بنجاح ✅</Button>
                      }
                            </div>

                            {activeLessonData.content && course.enrolled &&
                    <div
                      className="prose prose-invert prose-p:text-gray-400 prose-headings:text-white max-w-none pt-4"
                      dangerouslySetInnerHTML={{ __html: activeLessonData.content }} />

                    }
                         </div>
                      </div>

                      {/* Training Navigation */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                         <Button
                    variant="ghost"
                    className="h-14 px-8 rounded-2xl border border-white/5 flex gap-3 text-gray-400 hover:text-white font-black uppercase tracking-widest text-[10px]"
                    onClick={() => {
                      const idx = lessons.findIndex((l) => l.id === activeLesson);
                      if (idx > 0) setActiveLesson(lessons[idx - 1].id);
                    }}>
                    
                            <ChevronRight className="w-4 h-4" />
                            <span>المهمة السابقة</span>
                         </Button>
                         
                         <Button
                    className="h-14 px-10 rounded-2xl bg-white/5 border border-white/10 flex gap-3 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10"
                    onClick={() => {
                      const idx = lessons.findIndex((l) => l.id === activeLesson);
                      if (idx < lessons.length - 1) setActiveLesson(lessons[idx + 1].id);
                    }}>
                    
                            <span>المهمة التالية</span>
                            <ChevronLeft className="w-4 h-4" />
                         </Button>
                      </div>
                   </motion.div>
              }
              </AnimatePresence>
           </div>
        </div>
      </div>
    </div>);

}
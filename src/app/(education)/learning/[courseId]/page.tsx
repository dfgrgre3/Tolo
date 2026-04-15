"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  FileText,
  Download,
  MessageSquare,
  BookOpen,
  Trophy,
  ArrowRight,
  Menu,
  X,
  Star,
  Share2,
  Bookmark,
  BarChart3,
  Clock,
  Zap,
  Award,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { CourseVideoPlayer, type CourseVideoPlayerApi } from "@/components/video/CourseVideoPlayer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

type Attachment = {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
};

type Lesson = {
  id: string;
  name: string;
  description: string;
  content: string;
  videoUrl: string;
  type: "VIDEO" | "ARTICLE" | "QUIZ" | "FILE";
  completed: boolean;
  order: number;
  attachments: Attachment[];
};

type Chapter = {
  id: string;
  name: string;
  order: number;
  subTopics: Lesson[];
};

type Course = {
  id: string;
  nameAr: string;
  name: string;
  instructorName: string;
  thumbnailUrl: string;
  rating: number;
};

type Question = {
  id: string;
  content: string;
  createdAt: string;
  user?: {
    name: string;
  };
};

type TabKey = "content" | "resources" | "qna" | "notes";

export default function AdvancedLearningHub() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const playerApiRef = useRef<CourseVideoPlayerApi | null>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("content");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/curriculum`);
        if (res.ok) {
          const data = await res.json();
          setChapters(data.curriculum || []);

          const courseRes = await fetch(`/api/courses/${courseId}`);
          if (courseRes.ok) {
            const cData = await courseRes.json();
            setCourse(cData.subject);
          }

          if (data.curriculum?.[0]?.subTopics?.[0]) {
            setActiveLesson(data.curriculum[0].subTopics[0]);
          }
        }
      } catch (err) {
        logger.error("Error loading learning hub:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId]);

  useEffect(() => {
    if (!activeLesson) return;

    const fetchLessonExtras = async () => {
      try {
        const noteRes = await fetch(`/api/courses/lessons/${activeLesson.id}/notes`);
        if (noteRes.ok) {
          const noteData = await noteRes.json();
          setNoteContent(noteData.data?.content || "");
        }

        const qRes = await fetch(`/api/courses/lessons/${activeLesson.id}/questions`);
        if (qRes.ok) {
          const qData = await qRes.json();
          setQuestions(qData.data || []);
        }
      } catch (err) {
        logger.error("Error fetching lesson extras", err);
      }
    };

    fetchLessonExtras();
  }, [activeLesson]);

  const saveNote = async () => {
    if (!activeLesson) return;
    setSavingNote(true);
    try {
      await fetch(`/api/courses/lessons/${activeLesson.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      });
    } catch (err) {
      logger.error("Error saving note", err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleInsertTimestamp = useCallback(() => {
    if (playerApiRef.current) {
      const time = playerApiRef.current.getCurrentTime();
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setNoteContent(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n') + `[${formatted}] `);
    }
  }, []);

  const postQuestion = async () => {
    if (!activeLesson || !newQuestion.trim()) return;
    setAddingQuestion(true);
    try {
      const res = await fetch(`/api/courses/lessons/${activeLesson.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newQuestion }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions((prev) => [data.data, ...prev]);
        setNewQuestion("");
      }
    } catch (err) {
      logger.error("Error posting question", err);
    } finally {
      setAddingQuestion(false);
    }
  };

  const totalLessons = useMemo(
    () => chapters.reduce((acc, c) => acc + c.subTopics.length, 0),
    [chapters]
  );

  const completedLessons = useMemo(
    () => chapters.reduce((acc, c) => acc + c.subTopics.filter((l) => l.completed).length, 0),
    [chapters]
  );

  const progress = useMemo(
    () => (totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0),
    [totalLessons, completedLessons]
  );

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [lastXpAwarded, setLastXpAwarded] = useState(0);

  const handleLessonComplete = async (lessonId: string) => {
    try {
      const res = await fetch(`/api/courses/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, subject: course?.nameAr || course?.name }),
      });

      if (res.ok) {
        const data = await res.json();
        const integration = data.data || data;

        // Show XP toast
        if (integration.xpAwarded) {
          toast.success(`أحسنت! +${integration.xpAwarded} XP`, {
            icon: "⚡",
            description: integration.isCourseComplete ? "لقد أتممت الدورة بالكامل!" : undefined
          });
          setLastXpAwarded(integration.xpAwarded);
        }

        if (integration.isCourseComplete) {
          setShowCompletionModal(true);
        }

        setChapters((prev) =>
          prev.map((c) => ({
            ...c,
            subTopics: c.subTopics.map((l) => (l.id === lessonId ? { ...l, completed: true } : l)),
          }))
        );
      }
    } catch (err) {
      logger.error("Error updating lesson progress", err);
    }
  };

  // Navigate to next lesson
  const navigateLesson = useCallback(
    (direction: "next" | "prev") => {
      if (!activeLesson) return;
      const allLessons = chapters.flatMap((c) => c.subTopics);
      const currentIdx = allLessons.findIndex((l) => l.id === activeLesson.id);
      if (direction === "next" && currentIdx < allLessons.length - 1) {
        setActiveLesson(allLessons[currentIdx + 1]);
      } else if (direction === "prev" && currentIdx > 0) {
        setActiveLesson(allLessons[currentIdx - 1]);
      }
    },
    [activeLesson, chapters]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0B0D14]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 border-2 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-500 font-medium">جاري تحميل بيئة التعلم...</p>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
    { key: "content", label: "المحتوى", icon: BookOpen },
    { key: "resources", label: "المرفقات", icon: Download },
    { key: "qna", label: "المناقشات", icon: MessageSquare },
    { key: "notes", label: "ملاحظاتي", icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-white dark:bg-[#0B0D14] text-gray-900 dark:text-gray-100 overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="relative bg-gray-50 dark:bg-gray-900/80 border-l border-gray-200 dark:border-white/[0.06] flex flex-col h-full z-20 overflow-hidden"
          >
            {/* Sidebar header */}
            <div className="p-5 border-b border-gray-200 dark:border-white/[0.06] space-y-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
                    {course?.nameAr || course?.name || "الدورة التعليمية"}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-500">التقدم في الدورة</span>
                  <span className={cn("font-bold", progress >= 80 ? "text-emerald-500" : "text-primary")}>
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-[10px] text-gray-400">
                  {completedLessons} من {totalLessons} دروس مكتملة
                </p>
              </div>

              {/* Achievement badge */}
              {progress === 100 && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-600 dark:text-emerald-400">
                  <Trophy className="h-4 w-4" />
                  <span className="text-xs font-bold">تهانينا! أكملت جميع الدروس 🎉</span>
                </div>
              )}
            </div>

            {/* Chapter list */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-4 pb-20">
                {chapters.map((chapter, cIdx) => {
                  const chapterCompleted = chapter.subTopics.filter((l) => l.completed).length;
                  const chapterTotal = chapter.subTopics.length;

                  return (
                    <div key={chapter.id} className="space-y-1.5">
                      {/* Chapter header */}
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {cIdx + 1}
                          </div>
                          <h3 className="font-bold text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                            {chapter.name}
                          </h3>
                        </div>
                        <span className="text-[10px] font-medium text-gray-400">
                          {chapterCompleted}/{chapterTotal}
                        </span>
                      </div>

                      {/* Lessons */}
                      <div className="space-y-0.5">
                        {chapter.subTopics.map((lesson) => (
                          <button
                            key={lesson.id}
                            onClick={() => setActiveLesson(lesson)}
                            className={cn(
                              "w-full p-3 rounded-xl text-right flex items-center gap-3 transition-all group",
                              activeLesson?.id === lesson.id
                                ? "bg-primary/5 dark:bg-primary/10 border border-primary/20"
                                : "hover:bg-gray-100 dark:hover:bg-white/[0.03] border border-transparent"
                            )}
                          >
                            <div
                              className={cn(
                                "h-7 w-7 min-w-[28px] rounded-lg flex items-center justify-center transition-all",
                                lesson.completed
                                  ? "bg-emerald-500 text-white"
                                  : activeLesson?.id === lesson.id
                                    ? "bg-primary text-white"
                                    : "bg-gray-200 dark:bg-white/5 text-gray-500"
                              )}
                            >
                              {lesson.completed ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3 h-3 ml-0.5" />
                              )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p
                                className={cn(
                                  "text-[13px] font-medium truncate transition-colors",
                                  activeLesson?.id === lesson.id
                                    ? "text-primary"
                                    : "text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white"
                                )}
                              >
                                {lesson.name}
                              </p>
                              <span className="text-[10px] text-gray-400">
                                {lesson.type === "VIDEO" ? "فيديو" : "محتوى نصي"}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Top bar */}
        <header className="h-14 border-b border-gray-200 dark:border-white/[0.06] bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="h-8 w-8 rounded-lg">
                <PanelLeftOpen className="w-4 h-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
              </div>
              <h1 className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[200px] lg:max-w-md">
                {activeLesson?.name || course?.nameAr || course?.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{progress}%</span>
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/academy")}
              className="gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج للأكاديمية</span>
            </Button>
          </div>
        </header>

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto bg-black">
          {/* Theater Video Area */}
          <div className="w-full bg-black relative">
            {activeLesson?.videoUrl && activeLesson.type === "VIDEO" ? (
              <CourseVideoPlayer
                courseId={courseId}
                lessonId={activeLesson.id}
                lessonTitle={activeLesson.name}
                videoUrl={activeLesson.videoUrl}
                alreadyCompleted={activeLesson.completed}
                onLessonAutoComplete={() => handleLessonComplete(activeLesson.id)}
                onNextVideo={() => navigateLesson("next")}
                playerApiRef={playerApiRef}
                className="w-full rounded-none border-0 shadow-none max-h-[40vh] md:max-h-[60vh] lg:max-h-[80vh] object-contain bg-black"
              />
            ) : (
              <div className="aspect-video w-full max-h-[40vh] md:max-h-[60vh] flex flex-col items-center justify-center bg-gray-900 border-b border-white/5 text-center px-4">
                <FileText className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-bold text-white">محتوى نصي</h3>
                <p className="text-sm text-gray-400 mt-2 max-w-sm">هذا الدرس لا يحتوي على فيديو. قم بمراجعة وتصفح المحتوى والمرفقات بالأسفل.</p>
              </div>
            )}
          </div>

          <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-8 bg-white dark:bg-[#0B0D14] min-h-screen rounded-t-3xl -mt-6 relative z-10 shadow-[0_-15px_40px_rgba(0,0,0,0.5)] border-t border-gray-100 dark:border-white/5">

            {/* Lesson header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-0 text-[10px] uppercase tracking-wider px-2.5 h-5">
                    الدرس التعليمي
                  </Badge>
                  {activeLesson?.completed && (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[10px] uppercase tracking-wider px-2.5 h-5">
                      <CheckCircle2 className="h-3 w-3 ml-1" />
                      مكتمل
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {activeLesson?.name}
                </h2>
              </div>
              {activeLesson && !activeLesson.completed && (
                <Button
                  onClick={() => handleLessonComplete(activeLesson.id)}
                  className="gap-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 h-11"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-bold">تحديد كمكتمل</span>
                </Button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/5 max-w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-all",
                    activeTab === tab.key
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="min-h-[300px]"
              >
                {/* Content Tab */}
                {activeTab === "content" && (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-headings:text-gray-900 dark:prose-headings:text-white"
                    dangerouslySetInnerHTML={{
                      __html:
                        activeLesson?.content ||
                        '<p class="text-gray-400 italic">لا يوجد محتوى نصي لهذا الدرس.</p>',
                    }}
                  />
                )}

                {/* Resources Tab */}
                {activeTab === "resources" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeLesson?.attachments && activeLesson.attachments.length > 0 ? (
                      activeLesson.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="p-4 rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/60 flex items-center justify-between group hover:border-primary/30 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-700 dark:text-gray-200">{att.title}</p>
                              <p className="text-[10px] text-gray-400 uppercase font-medium">
                                {att.fileType} • {(att.fileSize / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => window.open(att.fileUrl)} className="h-8 w-8 rounded-lg">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-16 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10">
                        <Download className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 font-medium">لا توجد مرفقات لهذا الدرس</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Q&A Tab */}
                {activeTab === "qna" && (
                  <div className="space-y-6">
                    {/* New question form */}
                    <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/60 p-5 space-y-4">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        طرح سؤال جديد
                      </label>
                      <textarea
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="اكتب سؤالك هنا..."
                        className="w-full h-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={postQuestion}
                          disabled={addingQuestion || !newQuestion.trim()}
                          className="bg-primary text-white rounded-xl h-9 px-5 text-xs font-bold"
                        >
                          {addingQuestion && <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" />}
                          نشر السؤال
                        </Button>
                      </div>
                    </div>

                    {/* Questions list */}
                    <div className="space-y-3">
                      {questions.length > 0 ? (
                        questions.map((q) => (
                          <div
                            key={q.id}
                            className="p-5 rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/60 space-y-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                {q.user?.name?.charAt(0) || "U"}
                              </div>
                              <div>
                                <p className="font-medium text-sm text-gray-900 dark:text-white">{q.user?.name}</p>
                                <p className="text-[10px] text-gray-400">
                                  {new Date(q.createdAt).toLocaleDateString("ar-EG")}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{q.content}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10">
                          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500 font-medium">لا توجد أسئلة بعد</p>
                          <p className="text-xs text-gray-400 mt-1">كن أول من يسأل!</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes Tab */}
                {activeTab === "notes" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">ملاحظاتي</h3>
                      <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-2.5 h-5">
                        خاصة بك
                      </Badge>
                    </div>
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="سجل أهم النقاط والملاحظات من هذا الدرس..."
                      className="w-full min-h-[300px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl p-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                    />
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-200 dark:border-white/5 mt-2">
                      <Button
                        onClick={handleInsertTimestamp}
                        variant="ghost"
                        className="gap-2 rounded-xl h-9 px-4 font-bold text-xs text-primary hover:bg-primary/10"
                      >
                         <Clock className="h-3.5 w-3.5" /> أضف الطابع الزمني 
                      </Button>
                      <Button
                        onClick={saveNote}
                        disabled={savingNote}
                        className="gap-2 bg-primary text-white rounded-xl h-9 px-6 font-bold text-xs shadow-lg shadow-primary/20 hover:bg-primary/90"
                      >
                        {savingNote && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        حفظ الملاحظات
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Footer navigation */}
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/[0.06] pt-8">
              <Button
                variant="ghost"
                className="gap-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700"
                onClick={() => navigateLesson("prev")}
              >
                <ChevronRight className="w-4 h-4" />
                <span>الدرس السابق</span>
              </Button>

              <Button
                variant="ghost"
                className="gap-2 rounded-xl text-sm font-medium text-gray-500"
                onClick={() => router.push(`/courses/${courseId}`)}
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">صفحة الدورة</span>
              </Button>

              <Button
                className="gap-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 text-sm font-medium"
                onClick={() => navigateLesson("next")}
              >
                <span>الدرس التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <CourseCompletionModal
            courseName={course?.nameAr || course?.name || "الدورة"}
            onClose={() => setShowCompletionModal(false)}
            courseId={courseId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Components ============

function CourseCompletionModal({
  courseName,
  onClose,
  courseId,
}: {
  courseName: string;
  onClose: () => void;
  courseId: string;
}) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-gray-900 shadow-2xl"
      >
        {/* Decorative background */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-primary via-orange-500 to-amber-500" />
        <div className="absolute top-8 left-1/2 -translate-x-1/2">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-xl rotate-12">
            <Trophy className="h-10 w-10 text-amber-500" />
          </div>
        </div>

        <div className="relative pt-32 p-8 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white">ألف مبروك!</h2>
            <p className="text-gray-500 font-medium">
              لقد أتممت دورة <span className="text-primary font-bold">"{courseName}"</span> بنجاح.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">النقاط المكتسبة</p>
              <p className="text-2xl font-black text-primary">+100 XP</p>
            </div>
            <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">المستوى</p>
              <p className="text-2xl font-black text-amber-500">خبير</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                onClose();
                router.push(`/courses/${courseId}`);
              }}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20"
            >
              عرض الشهادة والتقييم
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full h-12 text-gray-500 font-bold"
            >
              إغلاق
            </Button>
          </div>
        </div>

        {/* Confetti simulation (visual only) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, x: Math.random() * 500, rotate: 0 }}
              animate={{ y: 600, x: Math.random() * 500, rotate: 360 }}
              transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
              className={cn(
                "absolute h-2 w-2 rounded-full",
                ["bg-primary", "bg-amber-500", "bg-emerald-500", "bg-violet-500"][i % 4]
              )}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
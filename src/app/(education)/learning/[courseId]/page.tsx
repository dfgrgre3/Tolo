"use client";

import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileCode2,
  FileText,
  HelpCircle,
  Layers3,
  Loader2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Search,
  Send,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { CourseVideoPlayer, type CourseVideoPlayerApi } from "@/components/video/CourseVideoPlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

type Attachment = {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
};

type LessonQuestion = {
  id: string;
  content: string;
  createdAt: string;
  user?: {
    name?: string | null;
  };
};

type Lesson = {
  id: string;
  name: string;
  description: string | null;
  content: string | null;
  videoUrl: string | null;
  type: "VIDEO" | "ARTICLE" | "QUIZ" | "FILE" | "ASSIGNMENT";
  completed: boolean;
  order: number;
  durationMinutes: number;
  isFree: boolean;
  locked: boolean;
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
  title: string;
  instructor: string;
  rating: number;
  thumbnailUrl?: string | null;
};

type TabKey = "content" | "resources" | "qna" | "notes" | "ai";

function formatLessonType(type: Lesson["type"]) {
  switch (type) {
    case "VIDEO":
      return "فيديو";
    case "QUIZ":
      return "اختبار";
    case "FILE":
      return "ملف";
    case "ARTICLE":
      return "شرح نصي";
    case "ASSIGNMENT":
      return "واجب";
    default:
      return "درس";
  }
}

function formatMinutes(durationMinutes: number) {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return "أقل من دقيقة";
  }

  if (durationMinutes < 60) {
    return `${durationMinutes.toLocaleString("ar-EG")} دقيقة`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (minutes === 0) {
    return `${hours.toLocaleString("ar-EG")} ساعة`;
  }

  return `${hours.toLocaleString("ar-EG")} س ${minutes.toLocaleString("ar-EG")} د`;
}

function bytesToMegaBytes(size: number) {
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export default function AdvancedLearningHub() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const playerApiRef = useRef<CourseVideoPlayerApi | null>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("content");
  const [lessonSearch, setLessonSearch] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [questions, setQuestions] = useState<LessonQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [postingQuestion, setPostingQuestion] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [aiMessages, setAiMessages] = useState<
    { role: "assistant" | "user"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "أنا مساعدك الدراسي داخل الدرس. اسألني عن النقاط الصعبة، اطلب تلخيصًا سريعًا، أو اطلب خطة مراجعة للجزء الجاري.",
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const deferredLessonSearch = useDeferredValue(lessonSearch);

  useEffect(() => {
    const loadLearningHub = async () => {
      try {
        setLoading(true);

        const [curriculumRes, courseRes] = await Promise.all([
          fetch(`/api/courses/${courseId}/curriculum`, { cache: "no-store" }),
          fetch(`/api/courses/${courseId}`, { cache: "no-store" }),
        ]);

        if (!courseRes.ok) {
          throw new Error("تعذر تحميل بيانات الدورة.");
        }

        const coursePayload = await courseRes.json();
        if (!coursePayload.enrollment) {
          toast.error("يجب التسجيل في الدورة للوصول إلى بيئة التعلم.");
          router.replace(`/courses/${courseId}`);
          return;
        }

        const subject = coursePayload.subject;
        setCourse({
          id: subject.id,
          title: subject.nameAr || subject.name,
          instructor: subject.instructorName || "فريق ثانوي",
          rating: subject.rating || 0,
          thumbnailUrl: subject.thumbnailUrl || null,
        });

        if (!curriculumRes.ok) {
          throw new Error("تعذر تحميل المنهج الدراسي.");
        }

        const curriculumPayload = await curriculumRes.json();
        const nextChapters: Chapter[] =
          (curriculumPayload.data ?? curriculumPayload).curriculum || [];

        setChapters(nextChapters);

        // Try to restore state from localStorage
        const storedStateRaw = localStorage.getItem(`learning-hub-state:${courseId}`);
        const storedState = storedStateRaw ? JSON.parse(storedStateRaw) : null;

        const allAvailableLessons = nextChapters.flatMap((chapter) => chapter.subTopics);
        
        let initialLessonId = null;

        if (storedState?.activeLessonId && allAvailableLessons.some(l => l.id === storedState.activeLessonId)) {
          initialLessonId = storedState.activeLessonId;
          if (storedState.activeTab) setActiveTab(storedState.activeTab);
          if (typeof storedState.sidebarOpen === 'boolean') setSidebarOpen(storedState.sidebarOpen);
          if (typeof storedState.isTheaterMode === 'boolean') setIsTheaterMode(storedState.isTheaterMode);
          if (typeof storedState.autoPlayNext === 'boolean') setAutoPlayNext(storedState.autoPlayNext);
        } else {
          const firstIncompleteLesson =
            allAvailableLessons.find((lesson) => !lesson.completed && !lesson.locked) ||
            allAvailableLessons.find((lesson) => !lesson.locked) ||
            allAvailableLessons[0] ||
            null;
          
          if (firstIncompleteLesson) {
            initialLessonId = firstIncompleteLesson.id;
          }
        }

        if (initialLessonId) {
          setActiveLessonId(initialLessonId);
        }
        setIsInitialized(true);
      } catch (loadError) {
        logger.error("Error loading learning hub", loadError);
        toast.error(
          loadError instanceof Error
            ? loadError.message
            : "حدث خطأ أثناء تحميل بيئة التعلم."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadLearningHub();
  }, [courseId, router]);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized || !courseId) return;

    const stateToSave = {
      activeLessonId,
      activeTab,
      sidebarOpen,
      isTheaterMode,
      autoPlayNext,
    };

    localStorage.setItem(`learning-hub-state:${courseId}`, JSON.stringify(stateToSave));
  }, [activeLessonId, activeTab, sidebarOpen, isTheaterMode, autoPlayNext, courseId, isInitialized]);

  const allLessons = useMemo(
    () => chapters.flatMap((chapter) => chapter.subTopics),
    [chapters]
  );

  const activeLesson = useMemo(
    () => allLessons.find((lesson) => lesson.id === activeLessonId) ?? null,
    [activeLessonId, allLessons]
  );

  const lessonIndex = useMemo(
    () => allLessons.findIndex((lesson) => lesson.id === activeLessonId),
    [activeLessonId, allLessons]
  );

  const previousLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex >= 0 && lessonIndex < allLessons.length - 1
      ? allLessons[lessonIndex + 1]
      : null;

  useEffect(() => {
    if (!activeLessonId) {
      return;
    }

    const loadLessonExtras = async () => {
      try {
        const [noteRes, questionsRes] = await Promise.all([
          fetch(`/api/courses/lessons/${activeLessonId}/notes`, {
            cache: "no-store",
          }),
          fetch(`/api/courses/lessons/${activeLessonId}/questions`, {
            cache: "no-store",
          }),
        ]);

        if (noteRes.ok) {
          const notePayload = await noteRes.json();
          setNoteContent(notePayload.data?.content || "");
        } else {
          setNoteContent("");
        }

        if (questionsRes.ok) {
          const questionsPayload = await questionsRes.json();
          setQuestions(questionsPayload.data || []);
        } else {
          setQuestions([]);
        }
      } catch (extrasError) {
        logger.error("Error loading lesson extras", extrasError);
      }
    };

    void loadLessonExtras();
  }, [activeLessonId]);

  const progress = useMemo(() => {
    if (allLessons.length === 0) {
      return 0;
    }

    const completedLessons = allLessons.filter((lesson) => lesson.completed).length;
    return Math.round((completedLessons / allLessons.length) * 100);
  }, [allLessons]);

  const totalDurationMinutes = useMemo(
    () =>
      allLessons.reduce(
        (sum, lesson) => sum + (lesson.durationMinutes || 0),
        0
      ),
    [allLessons]
  );

  const totalAttachments = useMemo(
    () =>
      allLessons.reduce(
        (sum, lesson) => sum + (lesson.attachments?.length || 0),
        0
      ),
    [allLessons]
  );

  const filteredChapters = useMemo(() => {
    const normalizedSearch = deferredLessonSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return chapters;
    }

    return chapters
      .map((chapter) => {
        const matchingLessons = chapter.subTopics.filter((lesson) =>
          [lesson.name, lesson.description || "", formatLessonType(lesson.type)]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch)
        );

        return {
          ...chapter,
          subTopics: matchingLessons,
        };
      })
      .filter((chapter) => chapter.subTopics.length > 0);
  }, [chapters, deferredLessonSearch]);

  const bookmarks = useMemo(() => {
    if (!activeLesson?.content) {
      return [];
    }

    const regex = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]\s*([^\n<]+)/g;
    const nextBookmarks: { time: number; label: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(activeLesson.content)) !== null) {
      const hours = match[1] ? Number(match[1]) : 0;
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      const label = match[4].trim();

      nextBookmarks.push({
        time: hours * 3600 + minutes * 60 + seconds,
        label,
      });
    }

    return nextBookmarks;
  }, [activeLesson?.content]);

  const aiPromptSuggestions = useMemo(
    () => [
      "لخّص هذا الدرس في نقاط سريعة",
      "ما أهم الأفكار التي يجب مراجعتها قبل الامتحان؟",
      "حوّل هذا الدرس إلى أسئلة تدريبية قصيرة",
    ],
    []
  );

  const navigateToLesson = useCallback((lessonId: string) => {
    startTransition(() => {
      setActiveLessonId(lessonId);
      setActiveTab("content");
    });
  }, []);

  const navigateRelative = useCallback(
    (direction: "next" | "prev") => {
      const targetLesson = direction === "next" ? nextLesson : previousLesson;
      if (!targetLesson) {
        return;
      }

      navigateToLesson(targetLesson.id);
    },
    [navigateToLesson, nextLesson, previousLesson]
  );

  const handleLessonComplete = useCallback(
    async (lessonId: string) => {
      try {
        const response = await fetch(`/api/courses/lessons/${lessonId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: true }),
        });

        if (!response.ok) {
          throw new Error("تعذر تحديث حالة الدرس.");
        }

        const payload = await response.json();
        const data = payload.data ?? payload;

        setChapters((current) =>
          current.map((chapter) => ({
            ...chapter,
            subTopics: chapter.subTopics.map((lesson) =>
              lesson.id === lessonId ? { ...lesson, completed: true } : lesson
            ),
          }))
        );

        if (data.xpAwarded) {
          toast.success(`أحسنت! حصلت على ${data.xpAwarded} نقطة XP.`);
        } else {
          toast.success("تم تسجيل الدرس كمكتمل.");
        }

        if (data.isCourseComplete) {
          toast.success("رائع، لقد أنهيت الدورة بالكامل.");
        }
      } catch (completeError) {
        logger.error("Error completing lesson", completeError);
        toast.error("تعذر تسجيل إكمال الدرس.");
      }
    },
    []
  );

  const saveNote = useCallback(async () => {
    if (!activeLessonId) {
      return;
    }

    try {
      setSavingNote(true);
      const response = await fetch(`/api/courses/lessons/${activeLessonId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      });

      if (!response.ok) {
        throw new Error("تعذر حفظ الملاحظات.");
      }

      toast.success("تم حفظ الملاحظات.");
    } catch (saveError) {
      logger.error("Error saving note", saveError);
      toast.error("تعذر حفظ الملاحظات.");
    } finally {
      setSavingNote(false);
    }
  }, [activeLessonId, noteContent]);

  const addTimestampToNotes = useCallback(() => {
    const currentTime = playerApiRef.current?.getCurrentTime() ?? 0;
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const timestamp = `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}] `;

    setNoteContent((current) =>
      current.trim().length === 0 ? timestamp : `${current}\n${timestamp}`
    );
    setActiveTab("notes");
  }, []);

  const postQuestion = useCallback(async () => {
    if (!activeLessonId || !newQuestion.trim()) {
      return;
    }

    try {
      setPostingQuestion(true);
      const response = await fetch(
        `/api/courses/lessons/${activeLessonId}/questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newQuestion.trim() }),
        }
      );

      if (!response.ok) {
        throw new Error("تعذر إرسال السؤال.");
      }

      const payload = await response.json();
      setQuestions((current) => [payload.data, ...current]);
      setNewQuestion("");
      toast.success("تم إرسال سؤالك إلى مناقشات الدرس.");
    } catch (questionError) {
      logger.error("Error posting question", questionError);
      toast.error("تعذر إرسال السؤال.");
    } finally {
      setPostingQuestion(false);
    }
  }, [activeLessonId, newQuestion]);

  const sendAiMessage = useCallback(
    async (message?: string) => {
      const prompt = (message ?? aiInput).trim();
      if (!prompt || aiLoading) {
        return;
      }

      setAiInput("");
      setAiMessages((current) => [
        ...current,
        { role: "user", content: prompt },
      ]);
      setAiLoading(true);

      const lessonName = activeLesson?.name || "هذا الدرس";

      window.setTimeout(() => {
        setAiMessages((current) => [
          ...current,
          {
            role: "assistant",
            content:
              prompt.includes("لخّص") || prompt.includes("تلخيص")
                ? `ملخص سريع لدرس "${lessonName}": ابدأ بالفكرة الأساسية، ثم اربطها بالأمثلة الموجودة داخل الشرح، وبعدها راجع النقاط الزمنية المهمة في المشغل والملاحظات التي أضفتها.`
                : prompt.includes("أسئلة") || prompt.includes("اختبار")
                ? `يمكنك تحويل درس "${lessonName}" إلى مراجعة فعالة عبر 3 خطوات: سؤال مباشر عن المفهوم، سؤال تطبيقي، ثم سؤال يقارن بين الحالات المختلفة.`
                : `بخصوص "${lessonName}"، أنصحك بالتركيز على الأجزاء التي تحمل طابعًا تطبيقيًا، ثم تثبيت الفهم بملخص من 5 نقاط وسؤالين ذاتيين بعد الانتهاء من المشاهدة.`,
          },
        ]);
        setAiLoading(false);
      }, 1000);
    },
    [activeLesson?.name, aiInput, aiLoading]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffdf9] dark:bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-2 border-orange-500/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-orange-500" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            جارٍ تجهيز بيئة التعلّم...
          </p>
        </div>
      </div>
    );
  }

  if (!course || !activeLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffdf9] dark:bg-[#09090b]">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-950/70">
          <h2 className="text-2xl font-black">تعذر فتح الدرس الحالي</h2>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
            قد تكون الدورة فارغة أو أن تحميل المحتوى لم يكتمل.
          </p>
          <Button
            className="mt-6 rounded-2xl bg-orange-500 text-white hover:bg-orange-600"
            onClick={() => router.push(`/courses/${courseId}`)}
          >
            العودة إلى صفحة الدورة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffdf9] text-slate-900 dark:bg-[#09090b] dark:text-white" dir="rtl">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-[-10%] top-[-8%] h-[380px] w-[380px] rounded-full bg-orange-500/12 blur-[120px]" />
        <div className="absolute left-[-8%] top-[20%] h-[320px] w-[320px] rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl border-slate-200 dark:border-white/10"
              onClick={() => setSidebarOpen((current) => !current)}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>

            <div>
              <p className="text-xs font-bold text-orange-600 dark:text-orange-300">
                غرفة التعلّم
              </p>
              <h1 className="text-base font-black sm:text-lg">{course.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={autoPlayNext ? "default" : "outline"}
              className={cn(
                "rounded-xl",
                autoPlayNext
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "border-slate-200 dark:border-white/10"
              )}
              onClick={() => setAutoPlayNext((current) => !current)}
            >
              التشغيل التلقائي
            </Button>

            <Button
              variant={isTheaterMode ? "default" : "outline"}
              className={cn(
                "rounded-xl",
                isTheaterMode
                  ? "bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                  : "border-slate-200 dark:border-white/10"
              )}
              onClick={() => setIsTheaterMode((current) => !current)}
            >
              وضع المسرح
            </Button>

            <Button
              variant="outline"
              className="rounded-xl border-slate-200 dark:border-white/10"
              onClick={() => router.push(`/courses/${courseId}`)}
            >
              <ArrowLeft className="ml-2 h-4 w-4" />
              صفحة الدورة
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <AnimatePresence initial={false}>
            {sidebarOpen ? (
              <m.aside
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="space-y-4 rounded-[32px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/75 dark:shadow-none"
              >
                <div className="space-y-4 rounded-[28px] bg-slate-50 p-4 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        المدرس
                      </p>
                      <p className="font-black">{course.instructor}</p>
                    </div>
                    <Badge className="border-0 bg-amber-500/10 text-amber-600 dark:text-amber-300">
                      <Star className="ml-1 h-3.5 w-3.5 fill-current" />
                      {course.rating.toFixed(1)}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>التقدّم الكلي</span>
                      <span className="text-orange-500">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                      أنهيت {allLessons.filter((lesson) => lesson.completed).length.toLocaleString("ar-EG")} من{" "}
                      {allLessons.length.toLocaleString("ar-EG")} درس.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-3 dark:bg-white/5">
                      <p className="text-xs font-bold text-slate-400">مدة الدورة</p>
                      <p className="mt-1 font-black">{formatMinutes(totalDurationMinutes)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 dark:bg-white/5">
                      <p className="text-xs font-bold text-slate-400">المرفقات</p>
                      <p className="mt-1 font-black">
                        {totalAttachments.toLocaleString("ar-EG")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={lessonSearch}
                    onChange={(event) => setLessonSearch(event.target.value)}
                    placeholder="ابحث داخل الدروس"
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 pr-11 dark:border-white/10 dark:bg-white/5"
                  />
                </div>

                <div className="max-h-[calc(100vh-260px)] space-y-4 overflow-y-auto pl-1">
                  {filteredChapters.map((chapter, chapterIndex) => {
                    const completedLessons = chapter.subTopics.filter((lesson) => lesson.completed).length;

                    return (
                      <div key={chapter.id} className="space-y-2">
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/10 text-xs font-black text-orange-600 dark:text-orange-300">
                              {chapterIndex + 1}
                            </div>
                            <h3 className="text-sm font-black">{chapter.name}</h3>
                          </div>

                          <span className="text-xs font-bold text-slate-400">
                            {completedLessons.toLocaleString("ar-EG")}/
                            {chapter.subTopics.length.toLocaleString("ar-EG")}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {chapter.subTopics.map((lesson) => (
                            <button
                              key={lesson.id}
                              type="button"
                              onClick={() => navigateToLesson(lesson.id)}
                              className={cn(
                                "w-full rounded-[24px] border px-4 py-3 text-right transition-all",
                                activeLessonId === lesson.id
                                  ? "border-orange-500/20 bg-orange-500/[0.08] shadow-sm dark:bg-orange-500/10"
                                  : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={cn(
                                    "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black",
                                    lesson.completed
                                      ? "bg-emerald-500 text-white"
                                      : activeLessonId === lesson.id
                                      ? "bg-orange-500 text-white"
                                      : "bg-white text-slate-600 dark:bg-white/5 dark:text-slate-300"
                                  )}
                                >
                                  {lesson.completed ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : lesson.type === "VIDEO" ? (
                                    <Play className="h-4 w-4" />
                                  ) : lesson.type === "QUIZ" ? (
                                    <HelpCircle className="h-4 w-4" />
                                  ) : lesson.type === "FILE" ? (
                                    <FileCode2 className="h-4 w-4" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="line-clamp-2 text-sm font-bold">
                                      {lesson.name}
                                    </p>
                                    {lesson.isFree ? (
                                      <Badge className="border-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                                        مجاني
                                      </Badge>
                                    ) : null}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1">
                                      <Clock3 className="h-3.5 w-3.5" />
                                      {formatMinutes(lesson.durationMinutes)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Layers3 className="h-3.5 w-3.5" />
                                      {formatLessonType(lesson.type)}
                                    </span>
                                    {lesson.locked ? (
                                      <span className="text-rose-500">مغلق</span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </m.aside>
            ) : null}
          </AnimatePresence>

          <main className="space-y-6">
            <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_25px_70px_rgba(15,23,42,0.07)] backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:shadow-none">
              <div className="border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-0 bg-orange-500/10 text-orange-600 dark:text-orange-300">
                        {formatLessonType(activeLesson.type)}
                      </Badge>
                      <Badge className="border-0 bg-sky-500/10 text-sky-600 dark:text-sky-300">
                        {lessonIndex + 1} / {allLessons.length}
                      </Badge>
                      {bookmarks.length > 0 ? (
                        <Badge className="border-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                          {bookmarks.length} فصول زمنية
                        </Badge>
                      ) : null}
                    </div>
                    <h2 className="text-2xl font-black sm:text-3xl">
                      {activeLesson.name}
                    </h2>
                    {activeLesson.description ? (
                      <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {activeLesson.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="rounded-2xl border-slate-200 dark:border-white/10"
                      disabled={!previousLesson}
                      onClick={() => navigateRelative("prev")}
                    >
                      <ChevronRight className="ml-2 h-4 w-4" />
                      السابق
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-2xl border-slate-200 dark:border-white/10"
                      disabled={!nextLesson}
                      onClick={() => navigateRelative("next")}
                    >
                      التالي
                      <ChevronLeft className="mr-2 h-4 w-4" />
                    </Button>

                    {!activeLesson.completed ? (
                      <Button
                        className="rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600"
                        onClick={() => void handleLessonComplete(activeLesson.id)}
                      >
                        <CheckCircle2 className="ml-2 h-4 w-4" />
                        تحديد كمكتمل
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="rounded-2xl border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-300"
                        disabled
                      >
                        <CheckCircle2 className="ml-2 h-4 w-4" />
                        مكتمل
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className={cn("p-4 sm:p-5", isTheaterMode && "sm:p-3")}>
                {activeLesson.videoUrl ? (
                  <CourseVideoPlayer
                    key={activeLesson.id}
                    courseId={course.id}
                    lessonId={activeLesson.id}
                    lessonTitle={activeLesson.name}
                    videoUrl={activeLesson.videoUrl}
                    alreadyCompleted={activeLesson.completed}
                    bookmarks={bookmarks}
                    playerApiRef={playerApiRef}
                    watermarkText={course.instructor}
                    isTheaterMode={isTheaterMode}
                    onToggleTheater={() => setIsTheaterMode((current) => !current)}
                    onLessonAutoComplete={() => void handleLessonComplete(activeLesson.id)}
                    onNextVideo={
                      autoPlayNext && nextLesson
                        ? () => navigateToLesson(nextLesson.id)
                        : undefined
                    }
                  />
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center rounded-[28px] bg-slate-100 text-center dark:bg-white/5">
                    <FileText className="mb-4 h-12 w-12 text-slate-400" />
                    <h3 className="text-xl font-black">هذا الدرس لا يحتوي على فيديو</h3>
                    <p className="mt-2 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
                      يمكنك متابعة المحتوى النصي والمرفقات والمناقشات من الأقسام
                      الموجودة أسفل المشغل.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-4">
              {[
                {
                  label: "تقدّم الدورة",
                  value: `${progress}%`,
                  helper: `${allLessons.filter((lesson) => lesson.completed).length.toLocaleString("ar-EG")} درس مكتمل`,
                  tone: "text-orange-500 bg-orange-500/10",
                },
                {
                  label: "زمن هذا الدرس",
                  value: formatMinutes(activeLesson.durationMinutes),
                  helper: formatLessonType(activeLesson.type),
                  tone: "text-sky-500 bg-sky-500/10",
                },
                {
                  label: "مرفقات الدرس",
                  value: activeLesson.attachments.length.toLocaleString("ar-EG"),
                  helper:
                    activeLesson.attachments.length > 0
                      ? "جاهزة للتحميل"
                      : "لا توجد مرفقات",
                  tone: "text-emerald-500 bg-emerald-500/10",
                },
                {
                  label: "نقاط المراجعة",
                  value: bookmarks.length.toLocaleString("ar-EG"),
                  helper:
                    bookmarks.length > 0
                      ? "مرتبطة بزمن الفيديو"
                      : "أضف طوابع زمنية في الملاحظات",
                  tone: "text-amber-500 bg-amber-500/10",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 dark:border-white/10 dark:bg-slate-950/70"
                >
                  <div className={cn("mb-4 inline-flex rounded-2xl p-3", stat.tone)}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-400">{stat.label}</p>
                  <p className="mt-2 text-2xl font-black">{stat.value}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {stat.helper}
                  </p>
                </div>
              ))}
            </section>

            <section className="rounded-[32px] border border-slate-200/80 bg-white/90 p-5 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
              <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
                {[
                  { key: "content", label: "المحتوى", icon: BookOpen },
                  { key: "resources", label: "المرفقات", icon: Download },
                  { key: "qna", label: "المناقشات", icon: MessageSquare },
                  { key: "notes", label: "ملاحظاتي", icon: FileText },
                  { key: "ai", label: "المساعد الذكي", icon: Bot },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as TabKey)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                      activeTab === tab.key
                        ? "bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-white"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <m.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "content" ? (
                    activeLesson.content ? (
                      <div
                        className="prose prose-sm max-w-none leading-8 text-slate-700 dark:prose-invert dark:text-slate-300"
                        dangerouslySetInnerHTML={{ __html: activeLesson.content }}
                      />
                    ) : (
                      <div className="rounded-[28px] border-2 border-dashed border-slate-300 p-10 text-center dark:border-white/10">
                        <BookOpen className="mx-auto mb-4 h-10 w-10 text-slate-400" />
                        <h3 className="text-xl font-black">لا يوجد شرح نصي لهذا الدرس</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                          اعتمد على الفيديو والمرفقات والملاحظات لتثبيت الفهم.
                        </p>
                      </div>
                    )
                  ) : null}

                  {activeTab === "resources" ? (
                    activeLesson.attachments.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {activeLesson.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="rounded-2xl bg-orange-500/10 p-3 text-orange-600 dark:text-orange-300">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black">
                                  {attachment.title}
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {attachment.fileType} • {bytesToMegaBytes(attachment.fileSize)}
                                </p>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              className="rounded-2xl border-slate-200 dark:border-white/10"
                              onClick={() => window.open(attachment.fileUrl, "_blank")}
                            >
                              <Download className="ml-2 h-4 w-4" />
                              تحميل
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[28px] border-2 border-dashed border-slate-300 p-10 text-center dark:border-white/10">
                        <Download className="mx-auto mb-4 h-10 w-10 text-slate-400" />
                        <h3 className="text-xl font-black">لا توجد مرفقات لهذا الدرس</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                          عندما يضيف المدرس ملفات مساعدة ستظهر هنا مباشرة.
                        </p>
                      </div>
                    )
                  ) : null}

                  {activeTab === "qna" ? (
                    <div className="space-y-6">
                      <div className="rounded-[28px] bg-slate-50 p-5 dark:bg-white/[0.03]">
                        <label className="mb-3 block text-xs font-bold text-slate-500 dark:text-slate-400">
                          اطرح سؤالًا حول هذا الدرس
                        </label>
                        <textarea
                          value={newQuestion}
                          onChange={(event) => setNewQuestion(event.target.value)}
                          placeholder="اكتب سؤالك بشكل واضح ليتمكن المدرس أو زملاؤك من مساعدتك..."
                          className="min-h-[130px] w-full rounded-[24px] border border-slate-200 bg-white p-4 text-sm leading-7 outline-none transition focus:border-orange-500/40 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-slate-950/70"
                        />
                        <div className="mt-4 flex justify-end">
                          <Button
                            className="rounded-2xl bg-orange-500 text-white hover:bg-orange-600"
                            disabled={postingQuestion || !newQuestion.trim()}
                            onClick={() => void postQuestion()}
                          >
                            {postingQuestion ? (
                              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            ) : (
                              <MessageSquare className="ml-2 h-4 w-4" />
                            )}
                            إرسال السؤال
                          </Button>
                        </div>
                      </div>

                      {questions.length > 0 ? (
                        <div className="space-y-4">
                          {questions.map((question) => (
                            <div
                              key={question.id}
                              className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]"
                            >
                              <div className="mb-3 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-sm font-black text-orange-600 dark:text-orange-300">
                                  {question.user?.name?.charAt(0) || "؟"}
                                </div>
                                <div>
                                  <p className="text-sm font-black">
                                    {question.user?.name || "طالب"}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(question.createdAt).toLocaleDateString("ar-EG", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                                {question.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[28px] border-2 border-dashed border-slate-300 p-10 text-center dark:border-white/10">
                          <MessageSquare className="mx-auto mb-4 h-10 w-10 text-slate-400" />
                          <h3 className="text-xl font-black">لا توجد أسئلة حتى الآن</h3>
                          <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                            كن أول من يفتح نقاشًا حول هذه الجزئية.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {activeTab === "notes" ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black">ملاحظاتك الخاصة</h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            أضف طابعًا زمنيًا من المشغل ثم دوّن الفكرة المهمة مباشرة.
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="rounded-2xl border-slate-200 dark:border-white/10"
                            onClick={addTimestampToNotes}
                          >
                            <Clock3 className="ml-2 h-4 w-4" />
                            إضافة طابع زمني
                          </Button>
                          <Button
                            className="rounded-2xl bg-orange-500 text-white hover:bg-orange-600"
                            disabled={savingNote}
                            onClick={() => void saveNote()}
                          >
                            {savingNote ? (
                              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="ml-2 h-4 w-4" />
                            )}
                            حفظ الملاحظات
                          </Button>
                        </div>
                      </div>

                      <textarea
                        value={noteContent}
                        onChange={(event) => setNoteContent(event.target.value)}
                        placeholder="اكتب هنا أبرز الأفكار، القوانين، الأخطاء المتكررة، أو أسئلة المراجعة الخاصة بك..."
                        className="min-h-[320px] w-full rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-sm leading-8 outline-none transition focus:border-orange-500/40 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </div>
                  ) : null}

                  {activeTab === "ai" ? (
                    <div className="space-y-5">
                      <div className="rounded-[28px] bg-gradient-to-l from-orange-500 to-amber-500 p-5 text-white">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-white/15 p-3">
                            <Bot className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black">
                              المساعد الدراسي الذكي
                            </h3>
                            <p className="mt-1 text-sm text-white/80">
                              استخدمه في التلخيص، بناء أسئلة تدريبية، أو استخراج
                              أهم ما يجب مراجعته بعد المشاهدة.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {aiPromptSuggestions.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => void sendAiMessage(prompt)}
                            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-orange-500/30 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:text-orange-300"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>

                      <div className="flex h-[420px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex-1 space-y-4 overflow-y-auto p-5">
                          {aiMessages.map((message, index) => (
                            <m.div
                              key={`${message.role}-${index}`}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                "max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-7",
                                message.role === "assistant"
                                  ? "bg-white text-slate-700 dark:bg-slate-950/80 dark:text-slate-200"
                                  : "mr-auto bg-orange-500 text-white"
                              )}
                            >
                              {message.content}
                            </m.div>
                          ))}

                          {aiLoading ? (
                            <div className="max-w-[85%] rounded-3xl bg-white px-4 py-3 text-sm text-slate-600 dark:bg-slate-950/80 dark:text-slate-300">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : null}
                        </div>

                        <div className="border-t border-slate-200 p-4 dark:border-white/10">
                          <div className="relative">
                            <Input
                              value={aiInput}
                              onChange={(event) => setAiInput(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void sendAiMessage();
                                }
                              }}
                              placeholder="اكتب سؤالك عن هذا الدرس..."
                              className="h-12 rounded-2xl border-slate-200 bg-white pl-12 dark:border-white/10 dark:bg-slate-950/80"
                            />
                            <button
                              type="button"
                              onClick={() => void sendAiMessage()}
                              disabled={!aiInput.trim() || aiLoading}
                              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-600 disabled:opacity-50"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </m.div>
              </AnimatePresence>
            </section>

            <section className="flex flex-wrap items-center justify-between gap-3 rounded-[32px] border border-slate-200/80 bg-white/85 p-5 dark:border-white/10 dark:bg-slate-950/70">
              <Button
                variant="outline"
                className="rounded-2xl border-slate-200 dark:border-white/10"
                disabled={!previousLesson}
                onClick={() => navigateRelative("prev")}
              >
                <ChevronRight className="ml-2 h-4 w-4" />
                الدرس السابق
              </Button>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 dark:bg-white/5 dark:text-slate-300">
                {course.title} • {lessonIndex + 1}/{allLessons.length}
              </div>

              <Button
                className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-orange-500 dark:hover:bg-orange-600"
                disabled={!nextLesson}
                onClick={() => navigateRelative("next")}
              >
                الدرس التالي
                <ChevronLeft className="mr-2 h-4 w-4" />
              </Button>
            </section>

            {progress === 100 ? (
              <section className="rounded-[32px] border border-emerald-500/20 bg-emerald-500/10 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-500 p-3 text-white">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                        أنهيت الدورة بالكامل
                      </h3>
                      <p className="mt-1 text-sm leading-7 text-emerald-700/80 dark:text-emerald-200/80">
                        ممتاز. يمكنك الآن مراجعة ملاحظاتك، إعادة أهم المقاطع،
                        ثم العودة إلى صفحة الدورة لمتابعة شهادتك أو تقييمك.
                      </p>
                    </div>
                  </div>

                  <Button
                    className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => router.push(`/courses/${courseId}`)}
                  >
                    العودة إلى الدورة
                  </Button>
                </div>
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

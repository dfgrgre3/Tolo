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
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { CourseVideoPlayerApi } from "@/components/video/CourseVideoPlayer";
import type { Course, Chapter, Lesson, LessonQuestion, TabKey } from "../types";

function applyMockInteractiveQuestions(chapters: Chapter[]) {
  if (chapters.length > 0 && chapters[0]!.subTopics.length > 0) {
    chapters[0]!.subTopics[0]!.interactiveQuestions = [
      {
        id: "q1",
        time: 15,
        question: "ما هي الوحدة الأساسية لقياس المادة في الكيمياء؟",
        options: ["المول", "الجرام", "اللتر", "المتر"],
        correctOptionIndex: 0,
        explanation: "المول هو الوحدة الأساسية لقياس كمية المادة في النظام الدولي للوحدات.",
      },
    ];
  }
}

function resolveInitialLessonState(
  courseId: string,
  chapters: Chapter[],
  callbacks: {
    setActiveTab: (tab: TabKey) => void;
    setSidebarOpen: (open: boolean) => void;
    setIsTheaterMode: (theater: boolean) => void;
    setAutoPlayNext: (autoPlay: boolean) => void;
  }
): string | null {
  const storedStateRaw = localStorage.getItem(`learning-hub-state:${courseId}`);
  const storedState = storedStateRaw ? JSON.parse(storedStateRaw) : null;
  const allAvailableLessons = chapters.flatMap((chapter) => chapter.subTopics);

  if (storedState?.activeLessonId && allAvailableLessons.some((l) => l.id === storedState.activeLessonId)) {
    if (storedState.activeTab) callbacks.setActiveTab(storedState.activeTab);
    if (typeof storedState.sidebarOpen === 'boolean') callbacks.setSidebarOpen(storedState.sidebarOpen);
    if (typeof storedState.isTheaterMode === 'boolean') callbacks.setIsTheaterMode(storedState.isTheaterMode);
    if (typeof storedState.autoPlayNext === 'boolean') callbacks.setAutoPlayNext(storedState.autoPlayNext);
    return storedState.activeLessonId;
  }

  const firstIncompleteLesson =
    allAvailableLessons.find((lesson) => !lesson.completed && !lesson.locked) ||
    allAvailableLessons.find((lesson) => !lesson.locked) ||
    allAvailableLessons[0];

  return firstIncompleteLesson?.id || null;
}

function markLessonCompletedInChapters(chapters: Chapter[], lessonId: string): Chapter[] {
  return chapters.map((chapter) => ({
    ...chapter,
    subTopics: chapter.subTopics.map((lesson) =>
      lesson.id === lessonId ? { ...lesson, completed: true } : lesson
    ),
  }));
}

export function useLearningHub() {
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

        applyMockInteractiveQuestions(nextChapters);
        setChapters(nextChapters);

        const initialLessonId = resolveInitialLessonState(courseId, nextChapters, {
          setActiveTab,
          setSidebarOpen,
          setIsTheaterMode,
          setAutoPlayNext,
        });

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

    loadLearningHub();
  }, [courseId, router]);

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
    if (!activeLessonId) return;

    const loadLessonExtras = async () => {
      try {
        const [noteRes, questionsRes] = await Promise.all([
          fetch(`/api/courses/lessons/${activeLessonId}/notes`, { cache: "no-store" }),
          fetch(`/api/courses/lessons/${activeLessonId}/questions`, { cache: "no-store" }),
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

    loadLessonExtras();
  }, [activeLessonId]);

  const progress = useMemo(() => {
    if (allLessons.length === 0) return 0;
    const completedLessons = allLessons.filter((lesson) => lesson.completed).length;
    return Math.round((completedLessons / allLessons.length) * 100);
  }, [allLessons]);

  const totalDurationMinutes = useMemo(
    () => allLessons.reduce((sum, lesson) => sum + (lesson.durationMinutes || 0), 0),
    [allLessons]
  );

  const totalAttachments = useMemo(
    () => allLessons.reduce((sum, lesson) => sum + (lesson.attachments?.length || 0), 0),
    [allLessons]
  );

  const filteredChapters = useMemo(() => {
    const normalizedSearch = deferredLessonSearch.trim().toLowerCase();
    if (!normalizedSearch) return chapters;

    return chapters
      .map((chapter) => ({
        ...chapter,
        subTopics: chapter.subTopics.filter((lesson) =>
          lesson.name.toLowerCase().includes(normalizedSearch) ||
          (lesson.description || "").toLowerCase().includes(normalizedSearch)
        ),
      }))
      .filter((chapter) => chapter.subTopics.length > 0);
  }, [chapters, deferredLessonSearch]);

  const bookmarks = useMemo(() => {
    if (!activeLesson?.content) return [];
    const regex = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]\s*([^\n<]+)/g;
    const nextBookmarks: { time: number; label: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(activeLesson.content)) !== null) {
      const hours = match[1] ? Number(match[1]) : 0;
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      const label = match[4]!.trim();

      nextBookmarks.push({
        time: hours * 3600 + minutes * 60 + seconds,
        label,
      });
    }

    return nextBookmarks;
  }, [activeLesson?.content]);

  const navigateToLesson = useCallback((lessonId: string) => {
    startTransition(() => {
      setActiveLessonId(lessonId);
      setActiveTab("content");
    });
  }, []);

  const navigateRelative = useCallback(
    (direction: "next" | "prev") => {
      const targetLesson = direction === "next" ? nextLesson : previousLesson;
      if (targetLesson) navigateToLesson(targetLesson.id);
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

        if (!response.ok) throw new Error("تعذر تحديث حالة الدرس.");

        const payload = await response.json();
        const data = payload.data ?? payload;

        setChapters((current) => markLessonCompletedInChapters(current, lessonId));

        if (data.xpAwarded) toast.success(`أحسنت! حصلت على ${data.xpAwarded} نقطة XP.`);
        else toast.success("تم تسجيل الدرس كمكتمل.");

        if (data.isCourseComplete) toast.success("رائع، لقد أنهيت الدورة بالكامل.");
      } catch (completeError) {
        logger.error("Error completing lesson", completeError);
        toast.error("تعذر تسجيل إكمال الدرس.");
      }
    },
    []
  );

  const saveNote = useCallback(async () => {
    if (!activeLessonId) return;

    try {
      setSavingNote(true);
      const response = await fetch(`/api/courses/lessons/${activeLessonId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      });

      if (!response.ok) throw new Error("تعذر حفظ الملاحظات.");
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
    if (!activeLessonId || !newQuestion.trim()) return;

    try {
      setPostingQuestion(true);
      const response = await fetch(`/api/courses/lessons/${activeLessonId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newQuestion.trim() }),
      });

      if (!response.ok) throw new Error("تعذر إرسال السؤال.");

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
      if (!prompt || aiLoading) return;

      setAiInput("");
      setAiMessages((current) => [...current, { role: "user", content: prompt }]);
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

  return {
    courseId,
    course,
    chapters,
    activeLessonId,
    setActiveLessonId,
    sidebarOpen,
    setSidebarOpen,
    loading,
    activeTab,
    setActiveTab,
    lessonSearch,
    setLessonSearch,
    noteContent,
    setNoteContent,
    savingNote,
    questions,
    newQuestion,
    setNewQuestion,
    postingQuestion,
    isTheaterMode,
    setIsTheaterMode,
    autoPlayNext,
    setAutoPlayNext,
    aiMessages,
    aiInput,
    setAiInput,
    aiLoading,
    allLessons,
    activeLesson,
    lessonIndex,
    previousLesson,
    nextLesson,
    progress,
    totalDurationMinutes,
    totalAttachments,
    filteredChapters,
    bookmarks,
    playerApiRef,
    navigateToLesson,
    navigateRelative,
    handleLessonComplete,
    saveNote,
    addTimestampToNotes,
    postQuestion,
    sendAiMessage,
  };
}

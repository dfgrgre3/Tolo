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
import type { Course, Chapter, LessonQuestion, TabKey } from "../types";
import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { updateLessonProgress } from "@/lib/course-progress";
import type {
  LearningHubResponse,
  LessonNotesResponse,
  LessonQuestionsResponse,
} from "@/types/domain/mappers";
import { useAuth } from "@/hooks/use-auth";
import { normalizeLessonProgressResponse } from "@thanawy/shared/types/enums";

const VALID_TABS: readonly TabKey[] = ["content", "resources", "qna", "notes", "ai"];
type StoredLearningHubState = {
  activeLessonId?: unknown;
  activeTab?: unknown;
  sidebarOpen?: unknown;
  isTheaterMode?: unknown;
  autoPlayNext?: unknown;
};

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
  let storedState: StoredLearningHubState | null = null;

  if (storedStateRaw) {
    try {
      const parsed: unknown = JSON.parse(storedStateRaw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        storedState = parsed as StoredLearningHubState;
      }
    } catch {
      // Corrupt local state must not prevent the hub from initializing.
      localStorage.removeItem(`learning-hub-state:${courseId}`);
    }
  }
  const allAvailableLessons = chapters.flatMap((chapter) => chapter.subTopics);

  if (typeof storedState?.activeLessonId === "string" && allAvailableLessons.some((l) => l.id === storedState.activeLessonId)) {
    if (typeof storedState.activeTab === "string" && VALID_TABS.includes(storedState.activeTab as TabKey)) {
      callbacks.setActiveTab(storedState.activeTab as TabKey);
    }
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

  const { isLoading: authLoading } = useAuth();

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
  const [aiConversationId, setAiConversationId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const deferredLessonSearch = useDeferredValue(lessonSearch);

  useEffect(() => {
    if (authLoading) return;

    const loadLearningHub = async () => {
      try {
        setLoading(true);

        // Session-scoped: the backend resolves the caller from the JWT, so
        // no ?userId= is appended (IDOR/BOLA hardening).
        const curriculumPayload = await apiClient.get<LearningHubResponse>(apiRoutes.courses.curriculum(courseId));

        if (!curriculumPayload?.enrollment || !curriculumPayload.subject) {
          toast.error("يجب التسجيل في الدورة للوصول إلى بيئة التعلم.");
          router.replace(`/courses/${courseId}`);
          return;
        }

        const subject = curriculumPayload.subject;
        setCourse({
          id: subject.id,
          title: subject.nameAr || subject.name,
          instructor: subject.instructorName || "فريق ثانوي",
          rating: subject.rating || 0,
          thumbnailUrl: subject.thumbnailUrl || null,
          completion: curriculumPayload.completion || (curriculumPayload.enrollment
            ? {
                isComplete: false,
                certificateEligible: false,
                requiredExams: 0,
                completedRequiredExams: 0,
                requiredCourseQuizzes: curriculumPayload.enrollment.requiredCourseQuizzes ?? 0,
                completedCourseQuizzes: curriculumPayload.enrollment.completedCourseQuizzes ?? 0,
                progress: curriculumPayload.enrollment.progress,
              }
            : undefined),
        });

        const nextChapters: Chapter[] = curriculumPayload.curriculum || [];
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
  }, [courseId, authLoading, router]);

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
    if (!activeLessonId || (activeTab !== "notes" && activeTab !== "qna")) return;

    const loadLessonExtras = async () => {
      try {
        if (activeTab === "notes") {
          const notePayload = await apiClient.get<LessonNotesResponse>(apiRoutes.courses.lessonNotes(activeLessonId));
          setNoteContent(notePayload?.content || "");
        } else {
          const questionsPayload = await apiClient.get<LessonQuestionsResponse>(apiRoutes.courses.lessonQuestions(activeLessonId));
          setQuestions(questionsPayload?.questions || []);
        }
      } catch (extrasError) {
        logger.error("Error loading lesson extras", extrasError);
      }
    };

    loadLessonExtras();
  }, [activeLessonId, activeTab]);

  const progress = useMemo(() => {
    // Course completion is server-owned. Lesson count is only a curriculum
    // view and cannot account for required quizzes or assignments.
    return course?.completion?.progress ?? 0;
  }, [course?.completion]);

  const totalDurationMinutes = useMemo(
    () => allLessons.reduce((sum, lesson) => sum + (lesson.durationMinutes || 0), 0),
    [allLessons]
  );

  const totalAttachments = useMemo(
    () => allLessons.reduce((sum, lesson) => sum + (lesson.attachments || []).length, 0),
    [allLessons]
  );

  const filteredChapters = useMemo(() => {
    const normalizedSearch = deferredLessonSearch.trim().toLowerCase();
    if (!normalizedSearch) return chapters;

    return chapters
      .map((chapter) => ({
        ...chapter,
        subTopics: chapter.subTopics.filter((lesson) =>
          (lesson.name || "").toLowerCase().includes(normalizedSearch) ||
          (lesson.description || "").toLowerCase().includes(normalizedSearch)
        ),
      }))
      .filter((chapter) => chapter.subTopics.length > 0);
  }, [chapters, deferredLessonSearch]);

  const activeLessonContent = activeLesson?.content;
  const bookmarks = useMemo(() => {
    if (!activeLessonContent) return [];
    const regex = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]\s*([^\n<]+)/g;
    const nextBookmarks: { time: number; label: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(activeLessonContent)) !== null) {
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
  }, [activeLessonContent]);

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
        const data = await updateLessonProgress(lessonId, { completed: true });

        setChapters((current) => markLessonCompletedInChapters(current, lessonId));
        if (typeof data.courseProgress === "number") {
          setCourse((current) => {
            if (!current) return current;

            const previous = current.completion;
            const snapshot = normalizeLessonProgressResponse({
              lessonProgress: data.lessonProgress,
              courseProgress: data.courseProgress,
              isCourseComplete: data.isCourseComplete ?? previous?.isComplete,
              certificateEligible: data.certificateEligible ?? previous?.certificateEligible,
              requiredExams: data.requiredExams ?? previous?.requiredExams,
              completedRequiredExams: data.completedRequiredExams ?? previous?.completedRequiredExams,
              requiredCourseQuizzes: data.requiredCourseQuizzes ?? previous?.requiredCourseQuizzes,
              completedCourseQuizzes: data.completedCourseQuizzes ?? previous?.completedCourseQuizzes,
            }, lessonId);

            return {
              ...current,
              completion: {
                ...snapshot.eligibility,
                progress: snapshot.courseProgress,
              },
            };
          });
        }

        if (data?.xpAwarded) toast.success(`أحسنت! حصلت على ${data.xpAwarded} نقطة XP.`);
        else toast.success("تم تسجيل الدرس كمكتمل.");

        if (data?.isCourseComplete) toast.success("رائع، لقد أنهيت الدورة بالكامل.");
      } catch (completeError) {
        logger.error("Error completing lesson", completeError);
        toast.error("تعذر تسجيل إكمال الدرس.");
      }
    },
    []
  );

  const completedLessonsCount = useMemo(
    () => allLessons.reduce((count, lesson) => count + (lesson.completed ? 1 : 0), 0),
    [allLessons]
  );

  const saveNote = useCallback(async () => {
    if (!activeLessonId) return;

    try {
      setSavingNote(true);
      await apiClient.post(apiRoutes.courses.createNote(activeLessonId), { content: noteContent });
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
      const data = await apiClient.post<LessonQuestion>(apiRoutes.courses.lessonQuestions(activeLessonId), {
        content: newQuestion.trim(),
      });

      setQuestions((current) => [data, ...current]);
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

      try {
        const lessonContext = (activeLesson?.content || "").slice(0, 600);
        const boundedPrompt = prompt.slice(0, 1200);
        const response = await apiClient.post<{
          reply?: string;
          conversationId?: string;
        }>(apiRoutes.ai.chat, {
          message: `أنت مدرس مساعد داخل درس بعنوان "${activeLesson?.name || "هذا الدرس"}". محتوى مختصر:\n${lessonContext}\nسؤال الطالب: ${boundedPrompt}`,
          conversationId: aiConversationId || undefined,
          subjectId: courseId,
          stream: false,
        });

        if (response.conversationId) setAiConversationId(response.conversationId);
        setAiMessages((current) => [
          ...current,
          { role: "assistant", content: response.reply || "تعذر الحصول على رد من المساعد." },
        ]);
      } catch (aiError) {
        logger.error("Error sending Learning Hub AI message", aiError);
        setAiMessages((current) => [
          ...current,
          { role: "assistant", content: "تعذر الاتصال بالمساعد الذكي. حاول مرة أخرى لاحقًا." },
        ]);
      } finally {
        setAiLoading(false);
      }
    },
    [activeLesson?.content, activeLesson?.name, aiConversationId, aiInput, aiLoading, courseId]
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
    completedLessonsCount,
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

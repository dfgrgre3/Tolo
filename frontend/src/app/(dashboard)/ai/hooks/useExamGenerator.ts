"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "@/lib/logger";
import { apiRoutes } from "@/lib/api/routes";
import { useAIWorkspace } from "../context/AIWorkspaceContext";

export interface Question {
  question: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

interface ExamEnqueueResponse {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
}

interface ExamStatusResponse {
  status: "processing" | "completed" | "failed" | "not_found";
  jobId?: string;
  questions?: Question[];
  examId?: string;
  error?: string;
}

// SavedExamResponse is what POST /api/v1/ai/exam/save returns: the id of the
// Exam that was persisted from the server-side job result.
interface SavedExamResponse {
  examId: string;
  title: string;
  subjectId: string;
  questionCount: number;
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 120000;
// The backend registers the job asynchronously — the first status poll(s)
// can legitimately 404 ("Job not found or expired") before the job is
// visible. Tolerate not-found responses during this window and only treat
// them as an expired job afterwards.
const NOT_FOUND_GRACE_MS = 15000;

function isJobNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const candidate = err as { name?: string; statusCode?: number; status?: number; message?: string };
  if (candidate.name === "NotFoundError") return true;
  if (candidate.statusCode === 404 || candidate.status === 404) return true;
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  return message.includes("job not found") || message.includes("not_found") || message.includes("expired");
}

interface UseExamGeneratorProps {
  subjects: string[];
  years: number[];
}

export function useExamGenerator(_props: UseExamGeneratorProps) {
  const { generateExam, saveExam, setContext, poll } = useAIWorkspace();
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [lesson, setLesson] = useState("");
  const [difficulty, setDifficulty] = useState("none");
  const [questionCount, setQuestionCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [examData, setExamData] = useState<{ examId?: string; questions?: Question[] } | null>(null);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedExamId, setSavedExamId] = useState("");
  const [jobId, setJobId] = useState("");
  const [, setRetryCount] = useState(0);
  const [pollSeconds, setPollSeconds] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const validateForm = () => {
    if (!selectedSubject || !selectedYear || !lesson) {
      setError("الرجاء ملء جميع الحقول المطلوبة");
      return false;
    }

    if (lesson.trim().length < 3) {
      setError("اسم الدرس يجب أن يكون على الأقل 3 أحرف");
      return false;
    }

    if (questionCount < 1 || questionCount > 50) {
      setError("عدد الأسئلة يجب أن يكون بين 1 و 50");
      return false;
    }

    if (!difficulty) {
      setError("الرجاء اختيار مستوى الصعوبة");
      return false;
    }

    return true;
  };

  const pollExamStatus = useCallback(
    async (jobId: string, signal: AbortSignal): Promise<Question[] | null> => {
      const start = Date.now();
      while (Date.now() - start < POLL_TIMEOUT_MS) {
        if (signal.aborted) return null;

        const tick = window.setTimeout(() => {
          if (!signal.aborted) {
            setPollSeconds(Math.floor((Date.now() - start) / 1000));
          }
        }, 1000);

        try {
          const data = await poll<ExamStatusResponse>(apiRoutes.ai.examStatusBase, jobId, { signal });

          window.clearTimeout(tick);

          if (!data) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            continue;
          }

          switch (data.status) {
            case "completed":
              return data.questions ?? [];
            case "failed":
              throw new Error(data.error || "فشل توليد الامتحان");
            case "not_found":
              if (Date.now() - start < NOT_FOUND_GRACE_MS) break;
              throw new Error("انتهت صلاحية عملية التوليد. يرجى المحاولة مرة أخرى.");
            case "processing":
            default:
              break;
          }
        } catch (err) {
          window.clearTimeout(tick);
          if ((err as Error).name === "AbortError" || signal.aborted) return null;
          // `poll()` throws on non-2xx, so a backend 404 never arrives as
          // `{ status: "not_found" }` — it arrives here as a NotFoundError
          // ("Job not found or expired"). Treat it as transient while the
          // job may still be registering, matching the `not_found` case above.
          if (isJobNotFoundError(err) && Date.now() - start < NOT_FOUND_GRACE_MS) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            continue;
          }
          if (isJobNotFoundError(err)) {
            throw new Error("انتهت صلاحية عملية التوليد. يرجى المحاولة مرة أخرى.");
          }
          throw err;
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      throw new Error("استغرق توليد الامتحان وقتاً طويلاً. يرجى المحاولة مرة أخرى.");
    },
    [poll]
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSaveError("");
    setSaveSuccess(false);
    setPollSeconds(0);

    if (!validateForm()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setExamData(null);
    setSavedExamId("");
    setJobId("");

    try {
      setContext({ subject: selectedSubject, year: selectedYear });
      const enq = await generateExam<ExamEnqueueResponse>({
        subject: selectedSubject,
        year: selectedYear,
        lesson: lesson.trim(),
        difficulty: difficulty && difficulty !== "none" ? difficulty : undefined,
        questionCount: Math.min(Math.max(1, questionCount), 50),
      }, { signal: controller.signal });

      if (!enq) {
        setError("لم يتم إنشاء الامتحان. يرجى المحاولة مرة أخرى.");
        return;
      }

      setJobId(enq.jobId ?? "");

      const legacyQuestions = (enq as unknown as { questions?: Question[] }).questions;
      if (enq.jobId) {
        const questions = await pollExamStatus(enq.jobId, controller.signal);
        if (controller.signal.aborted) return;
        if (!questions || questions.length === 0) {
          setError("لم يتم إنشاء أي أسئلة. يرجى المحاولة مرة أخرى.");
          return;
        }
        setExamData({ questions });
        setRetryCount(0);
      } else if (legacyQuestions && legacyQuestions.length > 0) {
        setExamData({ questions: legacyQuestions });
      } else {
        setError("لم يتم إنشاء الامتحان. يرجى المحاولة مرة أخرى.");
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("Error generating exam:", err instanceof Error ? err : new Error(errorMessage));
      setError(errorMessage);
    } finally {
      if (!controller.signal.aborted) {
        setIsGenerating(false);
        setPollSeconds(0);
      }
    }
  };

  const handleRetryEnqueue = () => {
    setRetryCount(0);
    handleSubmit();
  };

  const handleSaveExam = useCallback(async () => {
    if (!examData?.questions || examData.questions.length === 0) {
      setSaveError("لا توجد أسئلة لحفظها");
      return;
    }

    if (!jobId) {
      setSaveError("انتهت صلاحية الجلسة. يرجى إنشاء الامتحان مرة أخرى.");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      // The server owns the answer key: we hand back only the jobId it gave
      // us, and it persists the Exam + Question rows from its own job result.
      const data = await saveExam<SavedExamResponse>({ jobId });
      if (!data?.examId) {
        setSaveError("لم يتم حفظ الامتحان. حاول مرة أخرى.");
        return;
      }
      setSavedExamId(data.examId);
      setSaveSuccess(true);
      setSaveError("");
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      logger.error("Error saving exam:", err instanceof Error ? err.message : String(err));
      setSaveError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الامتحان");
    } finally {
      setIsSaving(false);
    }
  }, [examData, jobId, saveExam]);

  const resetGenerator = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setExamData(null);
    setError("");
    setSaveError("");
    setSaveSuccess(false);
    setSavedExamId("");
    setJobId("");
  }, []);

  return {
    selectedSubject,
    setSelectedSubject,
    selectedYear,
    setSelectedYear,
    lesson,
    setLesson,
    difficulty,
    setDifficulty,
    questionCount,
    setQuestionCount,
    isGenerating,
    isSaving,
    examData,
    error,
    saveError,
    saveSuccess,
    savedExamId,
    pollSeconds,
    handleSubmit,
    handleRetryEnqueue,
    handleSaveExam,
    resetGenerator,
  };
}

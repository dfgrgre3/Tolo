"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "@/lib/logger";
import { safeFetch } from "@/lib/safe-client-utils";

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

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 120000;
const POLL_BACKOFF_MAX_MS = 5000;

interface UseExamGeneratorProps {
  subjects: string[];
  years: number[];
}

export function useExamGenerator({ subjects, years }: UseExamGeneratorProps) {
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
  const [retryCount, setRetryCount] = useState(0);
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
      let consecutiveErrors = 0;

      while (Date.now() - start < POLL_TIMEOUT_MS) {
        if (signal.aborted) return null;

        const tick = window.setTimeout(() => {
          if (!signal.aborted) {
            setPollSeconds(Math.floor((Date.now() - start) / 1000));
          }
        }, 1000);

        try {
          const { data, error: responseError, response } = await safeFetch<ExamStatusResponse>(
            `/api/ai/exam/status/${encodeURIComponent(jobId)}`,
            { method: "GET", signal },
            null
          );

          window.clearTimeout(tick);

          if (responseError) {
            if (response?.status === 404) {
              throw new Error("انتهت صلاحية عملية التوليد. يرجى المحاولة مرة أخرى.");
            }
            consecutiveErrors++;
            if (consecutiveErrors > 6) {
              throw new Error("فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.");
            }
            const delay = Math.min(1000 * consecutiveErrors, POLL_BACKOFF_MAX_MS);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          consecutiveErrors = 0;

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
              throw new Error("انتهت صلاحية عملية التوليد. يرجى المحاولة مرة أخرى.");
            case "processing":
            default:
              break;
          }
        } catch (err) {
          window.clearTimeout(tick);
          if ((err as Error).name === "AbortError" || signal.aborted) return null;
          throw err;
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      throw new Error("استغرق توليد الامتحان وقتاً طويلاً. يرجى المحاولة مرة أخرى.");
    },
    []
  );

  const handleExamApiError = (responseError: any) => {
    const errorMessage = responseError.message || "فشلت عملية إنشاء الامتحان";
    setError(errorMessage);
    logger.error("Error generating exam:", responseError);
  };

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

    try {
      const { data: enq, error: enqError } = await safeFetch<ExamEnqueueResponse>(
        "/api/ai/exam",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: selectedSubject,
            year: selectedYear,
            lesson: lesson.trim(),
            difficulty: difficulty && difficulty !== "none" ? difficulty : undefined,
            questionCount: Math.min(Math.max(1, questionCount), 50),
            provider: "gemini",
          }),
          signal: controller.signal,
        },
        null
      );

      if (enqError) {
        handleExamApiError(enqError);
        return;
      }

      if (!enq) {
        setError("لم يتم إنشاء الامتحان. يرجى المحاولة مرة أخرى.");
        return;
      }

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
      logger.error("Error generating exam:", errorMessage);
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

    if (!selectedSubject || !selectedYear || !lesson) {
      setSaveError("الرجاء التأكد من ملء جميع الحقول المطلوبة");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const examTitle = `امتحان ${selectedSubject} - ${lesson} (${selectedYear})`;

      const { data: examResult, error: examError } = await safeFetch<{ success: boolean; exam: { id: string } }>(
        "/api/exams",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: selectedSubject,
            title: examTitle,
            year: parseInt(selectedYear),
            url: "",
            type: "QUIZ",
          }),
        },
        null
      );

      if (examError || !examResult?.success) {
        throw new Error(examError?.message || "فشل إنشاء سجل الامتحان");
      }

      setSaveSuccess(true);
      setSaveError("");

      setTimeout(() => {
        setExamData(null);
        setSelectedSubject("");
        setSelectedYear("");
        setLesson("");
        setDifficulty("none");
        setQuestionCount(10);
        setSaveSuccess(false);
      }, 2000);
    } catch (err: unknown) {
      logger.error("Error saving exam:", err instanceof Error ? err.message : String(err));
      setSaveError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الامتحان");
    } finally {
      setIsSaving(false);
    }
  }, [examData, selectedSubject, selectedYear, lesson]);

  const resetGenerator = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setExamData(null);
    setError("");
    setSaveError("");
    setSaveSuccess(false);
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
    pollSeconds,
    handleSubmit,
    handleRetryEnqueue,
    handleSaveExam,
    resetGenerator,
  };
}

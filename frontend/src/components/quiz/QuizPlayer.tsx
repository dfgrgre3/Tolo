"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  Send,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  CourseQuiz,
  QuizSubmissionAnswer,
  QuizQuestion,
  QuizResult,
  QuizResultItem,
  StartQuizResponse,
} from "@/types/course-quiz";
import {
  prepareQuestionForAttempt,
  shuffleArray,
  canAutoGrade,
} from "@/lib/quiz/grading";
import { QuizQuestionRenderer } from "./QuizQuestionRenderer";

interface QuizPlayerProps {
  quiz: CourseQuiz;
  onStart?: () => Promise<StartQuizResponse | null>;
  canRetake?: boolean;
  /**
   * Backend submit handler. This is REQUIRED — the player never grades
   * locally. If the handler fails or returns null, the player enters an
   * error state with a retry instead of declaring an official result.
   */
  onSubmit: (
    answers: QuizSubmissionAnswer[],
    timeSpentSeconds: number
  ) => Promise<QuizResult | null>;
}

type Phase = "intro" | "taking" | "result" | "error";
type AttemptStatus = "IDLE" | "ACTIVE" | "SUBMITTING" | "SUBMITTED" | "GRADED";

export function QuizPlayer({ quiz, onStart, onSubmit, canRetake = true }: QuizPlayerProps) {
  const draftKey = `quiz-draft:${quiz.id}`;
  const [phase, setPhase] = useState<Phase>("intro");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [serverDeadline, setServerDeadline] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersByQ, setAnswersByQ] = useState<Record<string, QuizSubmissionAnswer>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<AttemptStatus>("IDLE");
  const attemptStatusRef = useRef<AttemptStatus>("IDLE");
  const expiredRef = useRef(false);
  const submissionStartedRef = useRef(false);
  const answersRef = useRef<Record<string, QuizSubmissionAnswer>>({});
  const handleSubmitRef = useRef<(auto?: boolean) => Promise<void>>(async () => {});

  // Keep the latest answers in a ref so the timer's auto-submit never uses stale data.
  const setAnswer = (qid: string, answer: QuizSubmissionAnswer) => {
    setAnswersByQ((prev) => {
      const next = { ...prev, [qid]: answer };
      answersRef.current = next;
      return next;
    });
  };

  // Shuffle questions if configured (only once per attempt)
  const questions = useMemo<QuizQuestion[]>(() => {
    let list = quiz.questions.slice().sort((a, b) => a.order - b.order);
    if (quiz.shuffleQuestions) list = shuffleArray(list);
    // Prepare options for each question (re-keyed)
    return list.map((q) => prepareQuestionForAttempt(q, quiz.shuffleOptions));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.id]);

  // Timer
  useEffect(() => {
    if (phase !== "taking" || !startTime) return;
    const interval = setInterval(() => {
      const now = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(now);
      if (
        ((serverDeadline && Date.now() >= serverDeadline) ||
          (!serverDeadline && quiz.timeLimitMinutes && now >= quiz.timeLimitMinutes * 60)) &&
        attemptStatusRef.current === "ACTIVE" &&
        !expiredRef.current &&
        !submissionStartedRef.current
      ) {
        expiredRef.current = true;
        void handleSubmitRef.current(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, startTime, serverDeadline, quiz.timeLimitMinutes]);

  // Keep handleSubmitRef pointing at the latest handleSubmit closure.
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  // Keep an unsent attempt recoverable across refreshes. This is only a draft;
  // it is never presented as a result and is removed after server submission.
  useEffect(() => {
    if ((phase !== "taking" && phase !== "error") || Object.keys(answersByQ).length === 0) {
      return;
    }
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(answersByQ));
    } catch {
      // Storage can be disabled or full; the in-memory retry path still works.
    }
  }, [answersByQ, draftKey, phase]);

  const startQuiz = async () => {
    const started = onStart ? await onStart() : null;
    if (onStart && !started) return;
    const startedAt = started?.startedAt ? Date.parse(started.startedAt) : Date.now();
    const deadline = started?.deadline ? Date.parse(started.deadline) : NaN;
    setStartTime(Number.isFinite(startedAt) ? startedAt : Date.now());
    setServerDeadline(Number.isFinite(deadline) ? deadline : null);
    setElapsed(0);
    setPhase("taking");
    expiredRef.current = false;
    submissionStartedRef.current = false;
    attemptStatusRef.current = "ACTIVE";
    setAttemptStatus("ACTIVE");
    setCurrentIndex(0);
    let draft: Record<string, QuizSubmissionAnswer> = {};
    try {
      const stored = window.localStorage.getItem(draftKey);
      if (stored) draft = JSON.parse(stored) as Record<string, QuizSubmissionAnswer>;
    } catch {
      // A corrupt or unavailable local draft must not prevent starting the quiz.
    }
    setAnswersByQ(draft);
    answersRef.current = draft;
    setResult(null);
  };

  const timeLeft = quiz.timeLimitMinutes
    ? Math.max(0, quiz.timeLimitMinutes * 60 - elapsed)
    : null;

  const answeredCount = Object.values(answersByQ).filter((a) =>
    isAnswered(a, questions.find((q) => q.id === a.questionId))
  ).length;

  async function handleSubmit(auto = false) {
    if (attemptStatusRef.current !== "ACTIVE" || submissionStartedRef.current) return;
    submissionStartedRef.current = true;
    attemptStatusRef.current = "SUBMITTING";
    setAttemptStatus("SUBMITTING");
    const timeSpentSeconds = Math.floor((Date.now() - (startTime ?? Date.now())) / 1000);
    const currentAnswers = answersRef.current;
    const finalAnswers = questions
      .map((q) => currentAnswers[q.id])
      .filter(Boolean) as QuizSubmissionAnswer[];

    try {
      const res = await onSubmit(finalAnswers, timeSpentSeconds);
      if (res) {
        attemptStatusRef.current = "SUBMITTED";
        setAttemptStatus("SUBMITTED");
        attemptStatusRef.current = "GRADED";
        setAttemptStatus("GRADED");
        window.localStorage.removeItem(draftKey);
        setResult(res);
        setPhase("result");
      } else {
        // Submission failed — never declare a locally-graded official result.
        // Answers are kept intact so the student can retry the submission.
        setPhase("error");
        attemptStatusRef.current = "ACTIVE";
        setAttemptStatus("ACTIVE");
        submissionStartedRef.current = false;
      }
    } catch {
      setPhase("error");
      attemptStatusRef.current = "ACTIVE";
      setAttemptStatus("ACTIVE");
      submissionStartedRef.current = false;
    } finally {
      if (auto) {
        setStartTime(null);
        setServerDeadline(null);
      }
    }
  }

  if (phase === "intro") {
    return <QuizIntro quiz={quiz} onStart={startQuiz} />;
  }

  if (phase === "result" && result) {
    return (
      <QuizResultView
        quiz={quiz}
        result={result}
        onRetry={canRetake ? startQuiz : undefined}
        onReviewFirstIncorrect={() => {
          const firstWrong = result.items.findIndex((i) => !i.isCorrect);
          setPhase("taking");
          setCurrentIndex(firstWrong === -1 ? 0 : firstWrong);
        }}
      />
    );
  }

  if (phase === "error") {
    return (
      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center space-y-4"
      >
        <div className="mx-auto h-14 w-14 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          تعذّر تسليم إجاباتك
        </h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          لم يتم حفظ نتيجتك على الخادم، لذلك لا يمكن عرض نتيجة رسمية الآن.
          إجاباتك محفوظة في هذه الجلسة — أعد المحاولة لإرسالها مرة أخرى.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button onClick={() => void handleSubmit()} className="rounded-xl">
            {attemptStatus === "SUBMITTING" ? "جاري التسليم..." : "إعادة المحاولة"}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setPhase("taking")}
          >
            العودة إلى الأسئلة
          </Button>
        </div>
        {attemptStatus === "SUBMITTING" && (
          <div className="flex items-center justify-center gap-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التصحيح...
          </div>
        )}
      </m.div>
    );
  }

  const currentQ = questions[currentIndex];

  // Defensive: out-of-range index (e.g. questions shrank mid-session).
  if (!currentQ) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ListChecks className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {currentIndex + 1} من {questions.length}
          </span>
          <span className="text-xs text-gray-400">{answeredCount} تمت الإجابة</span>
        </div>
        {timeLeft !== null && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
              timeLeft < 60
                ? "bg-red-500/10 text-red-500"
                : timeLeft < 300
                ? "bg-amber-500/10 text-amber-500"
                : "bg-gray-100 dark:bg-white/5 text-gray-500"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {/* Question palette */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => {
          const hasAnswer = answersByQ[q.id];
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "h-8 w-8 rounded-lg text-xs font-bold transition-all",
                i === currentIndex
                  ? "bg-primary text-white ring-2 ring-primary/30"
                  : hasAnswer
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-gray-100 dark:bg-white/5 text-gray-500"
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Question renderer */}
      <QuizQuestionRenderer
        question={currentQ}
        value={answersByQ[currentQ.id]}
        onChange={(answer) => setAnswer(currentQ.id, answer)}
      />

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          className="gap-1.5 rounded-xl text-sm font-bold"
        >
          <ChevronRight className="h-4 w-4" />
          السابق
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300"
            onClick={async () => {
              const confirmed = window.confirm("هل تريد تسليم إجاباتك؟");
              if (confirmed) await handleSubmit();
            }}
          >
            <Send className="h-4 w-4" />
            تسليم
          </Button>

          {currentIndex < questions.length - 1 && (
            <Button
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              className="gap-1.5 rounded-xl text-sm font-bold"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {attemptStatus === "SUBMITTING" && (
        <div className="flex items-center justify-center gap-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري التصحيح...
        </div>
      )}
    </m.div>
  );
}

function isAnswered(answer: QuizSubmissionAnswer | undefined, q?: QuizQuestion): boolean {
  if (!answer || !q) return false;
  switch (q.type) {
    case "MCQ_SINGLE":
    case "TRUE_FALSE":
    case "MCQ_MULTIPLE":
      return (answer.selectedOptionIds?.length ?? 0) > 0;
    case "SHORT_ANSWER":
    case "ESSAY":
      return (answer.textAnswer ?? "").trim().length > 0;
    case "MATCHING":
      return Object.keys(answer.matches ?? {}).length > 0;
    case "ORDERING":
      return (answer.orderedItemIds?.length ?? 0) > 0;
    case "FILL_BLANK":
      return Object.keys(answer.blankAnswers ?? {}).length > 0;
    default:
      return false;
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function QuizIntro({ quiz, onStart }: { quiz: CourseQuiz; onStart: () => void | Promise<void> }) {
  const autoGradable = quiz.questions.filter(canAutoGrade).length;
  const manual = quiz.questions.length - autoGradable;
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-900/70 p-6 sm:p-8 space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <HelpCircle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{quiz.title}</h3>
          {quiz.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{quiz.description}</p>
          )}
        </div>
      </div>

      {quiz.instructions && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
          {quiz.instructions}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <Stat label="عدد الأسئلة" value={String(quiz.questionCount)} />
        <Stat label="الدرجة الكلية" value={String(quiz.totalPoints)} />
        <Stat label="نجاح من" value={`${quiz.passingScore}%`} />
        <Stat
          label="المدة"
          value={quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} د` : "مفتوح"}
        />
      </div>

      {manual > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-blue-500/5 border border-blue-500/20 p-3 text-xs text-gray-500 dark:text-gray-400">
          <AlertCircle className="h-4 w-4 shrink-0 text-blue-500" />
          <p>
            يحتوي هذا الاختبار على {manual} سؤال/سؤال يحتاج إلى تصحيح يدوي من المدرّس
            وستُحسب درجته النهائية بعد راجعته.
          </p>
        </div>
      )}

      <Button onClick={onStart} className="w-full sm:w-auto rounded-xl px-8 h-11 font-bold">
        بدء الاختبار
      </Button>
    </m.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-3">
      <p className="text-lg font-black text-gray-900 dark:text-white">{value}</p>
      <p className="text-[10px] font-bold text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

export function QuizResultView({
  quiz,
  result,
  onRetry,
  onReviewFirstIncorrect,
}: {
  quiz: CourseQuiz;
  result: QuizResult;
  onRetry?: () => void;
  onReviewFirstIncorrect?: () => void;
}) {
  const { attempt, items } = result;
  const correct = items.filter((i) => i.isCorrect).length;
  const percent = attempt.percentage ?? 0;
  const passed = attempt.passed ?? false;
  const needsManual = items.some(
    (i) => i.question.gradingMethod === "manual" || i.question.type === "ESSAY"
  );

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Result hero */}
      <div
        className={cn(
          "rounded-2xl border p-6 sm:p-8 text-center space-y-4",
          passed
            ? "bg-emerald-500/5 border-emerald-500/20"
            : "bg-rose-500/5 border-rose-500/20"
        )}
      >
        <div
          className={cn(
            "mx-auto h-16 w-16 rounded-full flex items-center justify-center",
            passed
              ? "bg-emerald-500/15 text-emerald-500"
              : "bg-rose-500/15 text-rose-500"
          )}
        >
          {passed ? (
            <CheckCircle2 className="h-9 w-9" />
          ) : (
            <XCircle className="h-9 w-9" />
          )}
        </div>
        <div>
          <p className="text-4xl font-black text-gray-900 dark:text-white">
            {percent}%
          </p>
          <p className="text-sm font-bold text-gray-500 mt-1">
            {attempt.score} من {attempt.maxScore} نقطة
          </p>
        </div>
        <p
          className={cn(
            "inline-block rounded-full px-4 py-1.5 text-sm font-bold",
            passed
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          )}
        >
          {passed ? "نجحت في الاختبار 🎉" : "لم تجتز الاختبار، حاول مرة أخرى 💪"}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onRetry && (
            <Button onClick={onRetry} className="rounded-xl">
              إعادة المحاولة
            </Button>
          )}
          {onReviewFirstIncorrect && correct < items.length && (
            <Button variant="outline" onClick={onReviewFirstIncorrect} className="rounded-xl">
              مراجعة النقاط الخاطئة
            </Button>
          )}
        </div>
      </div>

      {needsManual && (
        <div className="flex items-start gap-2 rounded-xl bg-blue-500/5 border border-blue-500/20 p-4 text-sm text-gray-600 dark:text-gray-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-blue-500" />
          <p>
            بعض الأسئلة (أسئلة مقالية / واجبات) تحتاج إلى تصحيح يدوي من المدرّس.
            ستظهر درجتك النهائية بعد اكتمال عملية التصحيح.
          </p>
        </div>
      )}

      {/* Detailed review */}
      {quiz.showCorrectAnswers ? (
        <div className="space-y-3">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white">مراجعة الإجابات</h4>
          {items.map((item, idx) => (
            <ReviewItem key={item.question.id} item={item} index={idx} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          تم إخفاء الإجابات الصحيحة حسب إعدادات الاختبار.
        </div>
      )}
    </m.div>
  );
}

function ReviewItem({ item, index }: { item: QuizResultItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        item.isCorrect
          ? "bg-emerald-500/[0.03] border-emerald-500/20"
          : "bg-rose-500/[0.03] border-rose-500/20"
      )}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start justify-between gap-3 text-start"
      >
        <div className="flex items-start gap-3">
          {item.isCorrect ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {index + 1}. {item.question.text}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {item.pointsEarned} / {item.pointsPossible} نقطة
            </p>
          </div>
        </div>
        {item.question.explanation && (
          <span className="text-xs font-bold text-primary shrink-0">
            {expanded ? "إخفاء" : "التفسير"}
          </span>
        )}
      </button>

      {expanded && item.question.explanation && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {item.question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

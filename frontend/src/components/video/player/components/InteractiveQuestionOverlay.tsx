"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  InteractiveQuestion,
  QuestionAttemptVerdict,
} from "../types";
import { resolveQuestionValidation } from "../types";
import { submitInteractiveAnswer, newQuestionAttemptId } from "@/lib/lesson-questions";

interface InteractiveQuestionOverlayProps {
  question: InteractiveQuestion;
  lessonId: string;
  /** Created once per question presentation; doubles as the idempotency key. */
  attemptId: string;
  onAnswer: (isCorrect: boolean) => void;
  onClose: () => void;
}

type Phase =
  | { kind: "answering" }
  | { kind: "submitting" }
  | { kind: "verdict"; verdict: QuestionAttemptVerdict }
  | { kind: "error"; message: string };

export function InteractiveQuestionOverlay({
  question,
  lessonId,
  attemptId,
  onAnswer,
  onClose,
}: InteractiveQuestionOverlayProps) {
  const mode = resolveQuestionValidation(question);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "answering" });
  // Follow-up attempts (after a wrong verdict) get a FRESH attemptId: the
  // server dedupes on attemptId, so reusing it with a different option would
  // replay the original (wrong) verdict instead of grading the new answer.
  const [followUpAttemptId, setFollowUpAttemptId] = useState<string | null>(null);

  const revealedCorrectIndex =
    phase.kind === "verdict"
      ? (phase.verdict.correctOptionIndex ?? (mode === "formative" ? question.correctOptionIndex : undefined))
      : undefined;
  const isCorrect = phase.kind === "verdict" ? phase.verdict.correct : false;
  const explanation =
    phase.kind === "verdict" ? (phase.verdict.explanation ?? question.explanation) : undefined;
  const busy = phase.kind === "submitting";
  const submitted = phase.kind === "verdict";

  const pickOption = (index: number) => {
    if (busy || submitted) return;
    // Re-picking after a failed server attempt resets to answering.
    if (phase.kind === "error") setPhase({ kind: "answering" });
    setSelectedOption(index);
  };

  const handleSubmit = async () => {
    if (selectedOption === null || busy || submitted) return;

    if (mode === "formative" && question.correctOptionIndex !== undefined) {
      // Local informational check ONLY. Must never gate grades/completion —
      // correctOptionIndex is visible in DevTools by design here.
      const correct = selectedOption === question.correctOptionIndex;
      setPhase({ kind: "verdict", verdict: { correct } });
      onAnswer(correct);
      return;
    }

    // Server mode: the backend verdict is authoritative. The client never
    // decides correctness (there is no local answer to leak).
    setPhase({ kind: "submitting" });
    try {
      const verdict = await submitInteractiveAnswer({
        lessonId,
        questionId: question.id,
        selectedOptionIndex: selectedOption,
        attemptId: followUpAttemptId ?? attemptId,
        answeredAt: Date.now(),
      });
      setPhase({ kind: "verdict", verdict });
      onAnswer(verdict.correct);
    } catch {
      setPhase({
        kind: "error",
        message: "تعذر إرسال الإجابة. تحقق من الاتصال ثم أعد المحاولة — لن تُحتسب محاولة مكررة.",
      });
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-xl"
      >
        <div className="bg-orange-500/10 p-6 flex items-center gap-4 border-b border-white/5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-110">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider">سؤال تفاعلي</h3>
            <p className="text-lg font-black text-white">تحقق من فهمك</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <p className="text-xl font-bold leading-relaxed text-slate-100">
            {question.question}
          </p>

          <div className="grid gap-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                disabled={busy || submitted}
                onClick={() => pickOption(index)}
                className={cn(
                  "group relative flex items-center justify-between rounded-2xl border p-4 text-right transition-all duration-300",
                  selectedOption === index
                    ? "border-orange-500 bg-orange-500/10 text-white scale-[1.02]"
                    : "border-white/5 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:scale-[1.02]",
                  submitted && index === revealedCorrectIndex && "border-emerald-500 bg-emerald-500/10 text-emerald-400",
                  submitted && selectedOption === index && index !== revealedCorrectIndex && "border-rose-500 bg-rose-500/10 text-rose-400"
                )}
              >
                <span className="font-bold">{option}</span>
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 transition-all duration-300",
                  selectedOption === index ? "border-orange-500 bg-orange-500" : "border-white/10",
                  submitted && index === revealedCorrectIndex && "border-emerald-500 bg-emerald-500",
                  submitted && selectedOption === index && index !== revealedCorrectIndex && "border-rose-500 bg-rose-500"
                )}>
                    {(selectedOption === index || (submitted && index === revealedCorrectIndex)) && (
                        <div className="h-full w-full flex items-center justify-center">
                            {submitted && index === revealedCorrectIndex ? (
                                <CheckCircle2 className="h-3 w-3 text-white" />
                            ) : submitted && index === selectedOption ? (
                                <XCircle className="h-3 w-3 text-white" />
                            ) : (
                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                        </div>
                    )}
                </div>
              </button>
            ))}
          </div>

          <>
            {submitted && (
              <div
                className={cn(
                  "rounded-2xl p-4 text-sm font-medium leading-relaxed flex items-start gap-3",
                  isCorrect ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
                )}
              >
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="font-black mb-1">{isCorrect ? "أحسنت! إجابة صحيحة." : "إجابة غير دقيقة. يرجى المراجعة."}</p>
                  {explanation && <p>{explanation}</p>}
                </div>
              </div>
            )}
            {phase.kind === "error" && (
              <div className="rounded-2xl p-4 text-sm font-medium leading-relaxed flex items-start gap-3 bg-amber-500/10 text-amber-300">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <p>{phase.message}</p>
              </div>
            )}
          </>

          {!submitted && phase.kind !== "error" && (
            <p className="text-xs text-slate-400 text-center animate-pulse">
              لا يمكنك إغلاق الفيديو إلا بعد اختيار الإجابة الصحيحة
            </p>
          )}
        </div>

        <div className="bg-white/5 p-6 flex justify-end gap-3">
          {phase.kind === "error" && (
            <Button
              onClick={onClose}
              variant="outline"
              className="rounded-2xl h-12 font-bold border-white/20 text-slate-200 hover:bg-white/10"
            >
              تخطي السؤال مؤقتًا
            </Button>
          )}
          {!submitted ? (
            <Button
              onClick={() => void handleSubmit()}
              disabled={selectedOption === null || busy}
              className="rounded-2xl bg-orange-500 px-8 text-white hover:bg-orange-600 h-12 font-bold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {busy && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {phase.kind === "error" ? "إعادة إرسال الإجابة" : "تأكيد الإجابة"}
            </Button>
          ) : isCorrect ? (
            <Button
              onClick={onClose}
              className="rounded-2xl bg-emerald-500 px-8 text-white hover:bg-emerald-600 h-12 font-bold transition-all duration-300 hover:scale-105"
            >
              استكمال الفيديو
              <ArrowRight className="mr-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => {
                setPhase({ kind: "answering" });
                setSelectedOption(null);
                if (mode === "server") setFollowUpAttemptId(newQuestionAttemptId());
              }}
              className="rounded-2xl bg-slate-600 px-8 text-slate-100 h-12 font-bold hover:bg-slate-500"
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              إجابة خاطئة — حاول مرة أخرى
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

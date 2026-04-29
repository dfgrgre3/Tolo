"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, HelpCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InteractiveQuestion } from "../types";

interface InteractiveQuestionOverlayProps {
  question: InteractiveQuestion;
  onAnswer: (isCorrect: boolean) => void;
  onClose: () => void;
}

export function InteractiveQuestionOverlay({
  question,
  onAnswer,
  onClose,
}: InteractiveQuestionOverlayProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);
    onAnswer(selectedOption === question.correctOptionIndex);
  };

  const isCorrect = selectedOption === question.correctOptionIndex;

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-xl"
      >
        <div className="bg-orange-500/10 p-6 flex items-center gap-4 border-b border-white/5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
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
                disabled={isSubmitted}
                onClick={() => setSelectedOption(index)}
                className={cn(
                  "group relative flex items-center justify-between rounded-2xl border p-4 text-right transition-all",
                  selectedOption === index
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-white/5 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10",
                  isSubmitted && index === question.correctOptionIndex && "border-emerald-500 bg-emerald-500/10 text-emerald-400",
                  isSubmitted && selectedOption === index && index !== question.correctOptionIndex && "border-rose-500 bg-rose-500/10 text-rose-400"
                )}
              >
                <span className="font-bold">{option}</span>
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 transition-all",
                  selectedOption === index ? "border-orange-500 bg-orange-500" : "border-white/10",
                  isSubmitted && index === question.correctOptionIndex && "border-emerald-500 bg-emerald-500",
                  isSubmitted && selectedOption === index && index !== question.correctOptionIndex && "border-rose-500 bg-rose-500"
                )}>
                    {(selectedOption === index || (isSubmitted && index === question.correctOptionIndex)) && (
                        <div className="h-full w-full flex items-center justify-center">
                            {isSubmitted && index === question.correctOptionIndex ? (
                                <CheckCircle2 className="h-3 w-3 text-white" />
                            ) : isSubmitted && index === selectedOption ? (
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

          <AnimatePresence>
            {isSubmitted && question.explanation && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={cn(
                  "rounded-2xl p-4 text-sm font-medium leading-relaxed",
                  isCorrect ? "bg-emerald-500/10 text-emerald-300" : "bg-orange-500/10 text-orange-300"
                )}
              >
                <p className="font-black mb-1">{isCorrect ? "أحسنت! إجابة صحيحة." : "إجابة غير دقيقة."}</p>
                {question.explanation}
              </m.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-white/5 p-6 flex justify-end gap-3">
          {!isSubmitted ? (
            <Button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              className="rounded-2xl bg-orange-500 px-8 text-white hover:bg-orange-600 h-12 font-bold"
            >
              تأكيد الإجابة
            </Button>
          ) : (
            <Button
              onClick={onClose}
              className="rounded-2xl bg-emerald-500 px-8 text-white hover:bg-emerald-600 h-12 font-bold"
            >
              استكمال الفيديو
              <ArrowRight className="mr-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </m.div>
    </div>
  );
}

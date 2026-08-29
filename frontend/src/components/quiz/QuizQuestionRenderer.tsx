"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { QuizAnswer, QuizQuestion } from "@/types/course-quiz";
import { GripVertical } from "lucide-react";

interface Props {
  question: QuizQuestion;
  value?: QuizAnswer;
  onChange: (answer: QuizAnswer) => void;
}

export function QuizQuestionRenderer({ question, value, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-900/70 p-6 space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-[10px] font-bold">
            {typeLabel(question.type)}
          </span>
          <span className="text-xs font-bold text-gray-400">{question.points} نقطة</span>
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-relaxed">
          {question.text}
        </h3>
      </div>

      {question.mediaUrl && (
        question.mediaType === "image" ? (
          <img
            src={question.mediaUrl}
            alt=""
            className="rounded-xl border border-gray-100 dark:border-white/10 max-h-72 object-contain w-full"
          />
        ) : question.mediaType === "video" ? (
          <video
            src={question.mediaUrl}
            controls
            className="rounded-xl border border-gray-100 dark:border-white/10 w-full max-h-72"
          />
        ) : (
          <audio src={question.mediaUrl} controls className="w-full" />
        )
      )}

      <QuestionBody question={question} value={value} onChange={onChange} />
    </div>
  );
}

function QuestionBody({ question, value, onChange }: Props) {
  switch (question.type) {
    case "MCQ_SINGLE":
    case "TRUE_FALSE":
      return (
        <OptionsSingle
          question={question}
          selected={value?.selectedOptionIds?.[0]}
          onSelect={(id) =>
            onChange({
              questionId: question.id,
              selectedOptionIds: [id],
              pointsPossible: question.points,
            })
          }
        />
      );
    case "MCQ_MULTIPLE":
      return (
        <OptionsMultiple
          question={question}
          selected={value?.selectedOptionIds ?? []}
          onToggle={(id) => {
            const current = value?.selectedOptionIds ?? [];
            const next = current.includes(id)
              ? current.filter((x) => x !== id)
              : [...current, id];
            onChange({
              questionId: question.id,
              selectedOptionIds: next,
              pointsPossible: question.points,
            });
          }}
        />
      );
    case "SHORT_ANSWER":
      return (
        <Input
          value={value?.textAnswer ?? ""}
          onChange={(e) =>
            onChange({
              questionId: question.id,
              textAnswer: e.target.value,
              pointsPossible: question.points,
            })
          }
          placeholder="اكتب إجابتك هنا..."
          className="rounded-xl"
        />
      );
    case "ESSAY":
      return (
        <textarea
          value={value?.textAnswer ?? ""}
          onChange={(e) =>
            onChange({
              questionId: question.id,
              textAnswer: e.target.value,
              pointsPossible: question.points,
            })
          }
          placeholder="اكتب إجابتك بالتفصيل هنا..."
          rows={6}
          className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/60 p-4 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
        />
      );
    case "MATCHING":
      return (
        <MatchingQuestion
          question={question}
          matches={value?.matches ?? {}}
          onChange={(matches) =>
            onChange({ questionId: question.id, matches, pointsPossible: question.points })
          }
        />
      );
    case "ORDERING":
      return (
        <OrderingQuestion
          question={question}
          items={value?.orderedItemIds ?? []}
          onChange={(ordered) =>
            onChange({
              questionId: question.id,
              orderedItemIds: ordered,
              pointsPossible: question.points,
            })
          }
        />
      );
    case "FILL_BLANK":
      return (
        <FillBlankQuestion
          question={question}
          answers={value?.blankAnswers ?? {}}
          onChange={(blankAnswers) =>
            onChange({
              questionId: question.id,
              blankAnswers,
              pointsPossible: question.points,
            })
          }
        />
      );
    default:
      return <p className="text-sm text-gray-400">نوع سؤال غير مدعوم</p>;
  }
}

function OptionsSingle({
  question,
  selected,
  onSelect,
}: {
  question: QuizQuestion;
  selected?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {question.options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl border p-3.5 text-start transition-all",
            selected === opt.id
              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
              : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
          )}
        >
          <span
            className={cn(
              "h-5 w-5 min-w-5 rounded-full border-2 transition-all flex items-center justify-center",
              selected === opt.id ? "border-primary" : "border-gray-300 dark:border-gray-500"
            )}
          >
            {selected === opt.id && (
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            )}
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{opt.text}</span>
        </button>
      ))}
    </div>
  );
}

function OptionsMultiple({
  question,
  selected,
  onToggle,
}: {
  question: QuizQuestion;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 font-bold">اختر كل الإجابات الصحيحة</p>
      {question.options.map((opt) => {
        const isSelected = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            onClick={() => onToggle(opt.id)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl border p-3.5 text-start transition-all",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
            )}
          >
            <span
              className={cn(
                "h-5 w-5 min-w-5 rounded-md border-2 transition-all flex items-center justify-center",
                isSelected ? "border-primary bg-primary" : "border-gray-300 dark:border-gray-500"
              )}
            >
              {isSelected && (
                <span className="text-white text-xs font-bold">✓</span>
              )}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{opt.text}</span>
          </button>
        );
      })}
    </div>
  );
}

function MatchingQuestion({
  question,
  matches,
  onChange,
}: {
  question: QuizQuestion;
  matches: Record<string, string>;
  onChange: (m: Record<string, string>) => void;
}) {
  const pairs = question.matchPairs ?? [];
  const lefts = pairs.map((p, i) => ({ id: `${question.id}-left-${i}`, text: p.left }));
  const rights = pairs.map((p, i) => ({ id: `${question.id}-right-${i}`, text: p.right }));
  // Shuffle right column deterministically for the UI
  const available = [...rights];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-bold">العناصر</p>
        {lefts.map((left) => (
          <div
            key={left.id}
            className="rounded-xl border border-gray-200 dark:border-white/10 p-3 text-sm bg-gray-50 dark:bg-white/[0.03]"
          >
            {left.text}
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-bold">الاختيارات</p>
        {available.map((right) => (
          <select
            key={right.id}
            value={Object.entries(matches).find(([, v]) => v === right.id)?.[0] ?? ""}
            onChange={(e) => {
              const next = { ...matches };
              // Remove previous mapping of this right
              for (const [k, v] of Object.entries(next)) {
                if (v === right.id) delete next[k];
              }
              if (e.target.value) next[e.target.value] = right.id;
              onChange(next);
            }}
            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/60 px-3 h-11 text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            <option value="">— اختر المطابقة —</option>
            {lefts.map((l) => (
              <option key={l.id} value={l.id}>{l.text}</option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}

function OrderingQuestion({
  question,
  items,
  onChange,
}: {
  question: QuizQuestion;
  items: string[];
  onChange: (ordered: string[]) => void;
}) {
  const source = question.orderItems ?? [];
  // Track the actual source values. Default to the correct order on first render.
  const ordered = items.length === source.length ? items : [...source];

  const move = (index: number, dir: -1 | 1) => {
    const next = [...ordered];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 font-bold">رتب بالترتيب الصحيح (اضغط على الأسهم)</p>
      {ordered.map((text, i) => (
        <div
          key={`${text}-${i}`}
          className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/10 p-3 bg-gray-50 dark:bg-white/[0.03]"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
          <span className="h-6 w-6 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{text}</span>
          <div className="flex gap-1">
            <button
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="h-6 w-6 rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 text-sm font-bold"
            >
              ↑
            </button>
            <button
              disabled={i === ordered.length - 1}
              onClick={() => move(i, 1)}
              className="h-6 w-6 rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 text-sm font-bold"
            >
              ↓
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function FillBlankQuestion({
  question,
  answers,
  onChange,
}: {
  question: QuizQuestion;
  answers: Record<number, string>;
  onChange: (a: Record<number, string>) => void;
}) {
  const blankCount = question.blanks?.length ?? 0;
  if (blankCount === 0) {
    return <p className="text-sm text-gray-400">لم يتم إعداد الفراغات بشكل صحيح.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 font-bold">املأ الفراغات التالية</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: blankCount }).map((_, i) => (
          <Input
            key={i}
            value={answers[i] ?? ""}
            onChange={(e) =>
              onChange({ ...answers, [i]: e.target.value })
            }
            placeholder={`الفراغ ${i + 1}`}
            className="rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}

function typeLabel(type: QuizQuestion["type"]): string {
  const map: Record<QuizQuestion["type"], string> = {
    MCQ_SINGLE: "اختيار من متعدد",
    MCQ_MULTIPLE: "اختيار متعدد (اختيارات متعددة)",
    TRUE_FALSE: "صح / خطأ",
    SHORT_ANSWER: "إجابة قصيرة",
    ESSAY: "سؤال مقالي",
    MATCHING: "مطابقة",
    ORDERING: "ترتيب",
    FILL_BLANK: "املأ الفراغ",
  };
  return map[type];
}

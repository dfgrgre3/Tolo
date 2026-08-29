"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { X, Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Save, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { QuizQuestion, QuizQuestionType } from "@/types/course-quiz";

const QUESTION_TYPES: { value: QuizQuestionType; label: string }[] = [
  { value: "MCQ_SINGLE", label: "اختيار من متعدد (إجابة واحدة)" },
  { value: "MCQ_MULTIPLE", label: "اختيار من متعدد (عدة إجابات)" },
  { value: "TRUE_FALSE", label: "صح / خطأ" },
  { value: "SHORT_ANSWER", label: "إجابة قصيرة" },
  { value: "ESSAY", label: "سؤال مقالي" },
  { value: "MATCHING", label: "مطابقة" },
  { value: "ORDERING", label: "ترتيب" },
  { value: "FILL_BLANK", label: "املأ الفراغ" },
];

export function QuizBuilder({
  questions,
  onChange,
}: {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const addQuestion = (type: QuizQuestionType) => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      quizId: "local",
      type,
      text: "",
      points: 10,
      order: questions.length + 1,
      options:
        type === "MCQ_SINGLE" || type === "MCQ_MULTIPLE"
          ? [{ id: `opt-${Date.now()}-a`, text: "" }, { id: `opt-${Date.now()}-b`, text: "" }]
          : [],
      blanks:
        type === "FILL_BLANK" ? ["", ""] : [],
      matchPairs:
        type === "MATCHING" ? [{ left: "", right: "" }, { left: "", right: "" }] : [],
      orderItems:
        type === "ORDERING" ? ["", "", ""] : [],
    };
    onChange([...questions, newQ]);
    setExpanded(newQ.id);
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, patch: Partial<QuizQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    const next = [...questions];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next.map((q, i) => ({ ...q, order: i + 1 })));
  };

  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0);

  if (collapsed) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            أسئلة الاختبار ({questions.length})
          </h4>
          <button onClick={() => setCollapsed(false)} className="text-xs font-bold text-primary">
            توسيع
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="أسئلة" value={String(questions.length)} />
          <Metric label="مجموع الدرجات" value={String(totalPoints)} />
          <Metric label="متوسط الدرجة" value={questions.length ? String(Math.round(totalPoints / questions.length)) : "0"} />
        </div>
        <TypePicker onAdd={addQuestion} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          بنّاء الأسئلة — {questions.length} سؤالاً · {totalPoints} نقطة
        </h4>
        <button onClick={() => setCollapsed(true)} className="text-xs font-bold text-gray-400">
          طيّ القائمة
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="text-center p-8 bg-slate-50 dark:bg-slate-900/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
          لا توجد أسئلة بعد. أضف أول سؤال أدناه.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={idx}
              expanded={expanded === q.id}
              onToggle={() => setExpanded(expanded === q.id ? null : q.id)}
              onUpdate={(patch) => updateQuestion(q.id, patch)}
              onRemove={() => removeQuestion(q.id)}
              onMove={(dir) => moveQuestion(idx, dir)}
              isFirst={idx === 0}
              isLast={idx === questions.length - 1}
            />
          ))}
        </div>
      )}

      <TypePicker onAdd={addQuestion} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3">
      <p className="text-base font-black text-slate-800 dark:text-white">{value}</p>
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
    </div>
  );
}

function TypePicker({ onAdd }: { onAdd: (t: QuizQuestionType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        onClick={() => setOpen((o) => !o)}
        size="sm"
        className="gap-1.5 bg-primary text-white rounded-xl"
      >
        <Plus className="h-4 w-4" />
        إضافة سؤال
      </Button>
      {open && (
        <div className="absolute z-20 mt-2 w-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
          {QUESTION_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                onAdd(t.value);
                setOpen(false);
              }}
              className="w-full text-right px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  expanded,
  onToggle,
  onUpdate,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: {
  question: QuizQuestion;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<QuizQuestion>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const typeLabel = QUESTION_TYPES.find((t) => t.value === question.type)?.label || question.type;
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="p-3.5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-start">
          <span className="h-6 w-6 min-w-6 rounded-lg bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {question.text || "سؤال بدون نص"}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {typeLabel} · {question.points || 0} نقطة
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button disabled={isFirst} onClick={() => onMove(-1)} className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button disabled={isLast} onClick={() => onMove(1)} className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button onClick={onRemove} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1">
              <label className="text-slate-500">نص السؤال *</label>
              <Input
                value={question.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="اكتب نص السؤال هنا..."
                className="rounded-xl text-right text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-500">الدرجة</label>
              <Input
                type="number"
                min={1}
                value={String(question.points)}
                onChange={(e) => onUpdate({ points: Number(e.target.value) || 0 })}
                className="rounded-xl w-24 text-center text-xs"
              />
            </div>
          </div>

          {/* Type-specific editors */}
          {handleTypeEditor(question, onUpdate)}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">درجات جزئية (Credit جزئي)</span>
            <Switch
              checked={question.partialCredit || false}
              onCheckedChange={(v) => onUpdate({ partialCredit: v })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-500">تفسير / شرح الإجابة (اختياري)</label>
            <Textarea
              value={question.explanation || ""}
              onChange={(e) => onUpdate({ explanation: e.target.value })}
              placeholder="يظهر للطلاب بعد الإجابة لمساعدتهم على الفهم..."
              rows={2}
              className="rounded-xl text-right text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function handleTypeEditor(
  question: QuizQuestion,
  onUpdate: (patch: Partial<QuizQuestion>) => void
) {
  switch (question.type) {
    case "MCQ_SINGLE":
    case "MCQ_MULTIPLE":
      return <McqEditor question={question} onUpdate={onUpdate} multiple={question.type === "MCQ_MULTIPLE"} />;
    case "TRUE_FALSE":
      return <TrueFalseEditor question={question} onUpdate={onUpdate} />;
    case "SHORT_ANSWER":
      return (
        <div className="space-y-1">
          <label className="text-slate-500">الإجابة المرجعية (للتصحيح التلقائي، اختياري)</label>
          <Input
            value={question.referenceAnswer || ""}
            onChange={(e) => onUpdate({ referenceAnswer: e.target.value })}
            placeholder="اتركه فارغاً للتصحيح اليدوي"
            className="rounded-xl text-right text-xs"
          />
          <p className="text-[10px] text-slate-400">إذا تركته فارغاً، سيُصحح السؤال يدوياً من المدرّس.</p>
        </div>
      );
    case "ESSAY":
      return (
        <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] p-3 text-[10px] text-slate-400 font-medium">
          سؤال مقالي يُصحح يدوياً من المدرّس. يمكنك إضافة مصفوفة تقدير لاحقاً.
        </div>
      );
    case "MATCHING":
      return <MatchingEditor question={question} onUpdate={onUpdate} />;
    case "ORDERING":
      return <OrderingEditor question={question} onUpdate={onUpdate} />;
    case "FILL_BLANK":
      return <FillBlankEditor question={question} onUpdate={onUpdate} />;
    default:
      return null;
  }
}

function McqEditor({
  question,
  onUpdate,
  multiple,
}: {
  question: QuizQuestion;
  onUpdate: (patch: Partial<QuizQuestion>) => void;
  multiple: boolean;
}) {
  const options = question.options || [];
  const changeOpt = (id: string, patch: Partial<(typeof options)[number]>) => {
    onUpdate({ options: options.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  };
  const addOpt = () => onUpdate({ options: [...options, { id: `opt-${Date.now()}`, text: "" }] });
  const removeOpt = (id: string) => onUpdate({ options: options.filter((o) => o.id !== id) });

  return (
    <div className="space-y-2">
      <p className="text-slate-500">{multiple ? "الخيارات الصحيحة (حدد واحدة أو أكثر)" : "الخيارات — حدد الخيار الصحيح"}</p>
      {options.map((opt, i) => (
        <div key={opt.id} className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2">
            <span className="h-5 w-5 min-w-5 rounded-md border flex items-center justify-center text-[10px] font-bold text-slate-400">
              {String.fromCharCode(65 + i)}
            </span>
            <Input
              value={opt.text}
              onChange={(e) => changeOpt(opt.id, { text: e.target.value })}
              placeholder={`الخيار ${String.fromCharCode(65 + i)}`}
              className="rounded-xl text-right text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">{multiple ? "صح" : "الصحيح"}</span>
            <input
              type={multiple ? "checkbox" : "radio"}
              name={`correct-${question.id}`}
              checked={opt.isCorrect || false}
              onChange={(e) =>
                onUpdate({
                  options: options.map((o) =>
                    multiple
                      ? { ...o, isCorrect: o.id === opt.id ? e.target.checked : o.isCorrect }
                      : { ...o, isCorrect: o.id === opt.id ? e.target.checked : false }
                  ),
                })
              }
              className="accent-primary"
            />
            <button onClick={() => removeOpt(opt.id)} className="p-1 text-slate-400 hover:text-red-500">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
      <button onClick={addOpt} className="text-[11px] font-bold text-primary flex items-center gap-1">
        <Plus className="h-3 w-3" /> إضافة خيار
      </button>
    </div>
  );
}

function TrueFalseEditor({
  question,
  onUpdate,
}: {
  question: QuizQuestion;
  onUpdate: (patch: Partial<QuizQuestion>) => void;
}) {
  const correct = question.options?.find((o) => o.isCorrect)?.id ?? "opt-0";
  const setCorrect = (id: string) =>
    onUpdate({
      options: [
        { id: "opt-0", text: "صح", isCorrect: id === "opt-0" },
        { id: "opt-1", text: "خطأ", isCorrect: id === "opt-1" },
      ],
    });
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-500">الإجابة الصحيحة:</span>
      {[{ id: "opt-0", label: "صح" }, { id: "opt-1", label: "خطأ" }].map((opt) => (
        <button
          key={opt.id}
          onClick={() => setCorrect(opt.id)}
          className={cn(
            "px-4 py-2 rounded-xl border text-xs font-bold transition-all",
            correct === opt.id
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
              : "border-slate-200 dark:border-slate-700 text-slate-500"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MatchingEditor({
  question,
  onUpdate,
}: {
  question: QuizQuestion;
  onUpdate: (patch: Partial<QuizQuestion>) => void;
}) {
  const pairs = question.matchPairs || [];
  const change = (i: number, patch: Partial<(typeof pairs)[number]>) =>
    onUpdate({ matchPairs: pairs.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  const add = () => onUpdate({ matchPairs: [...pairs, { left: "", right: "" }] });
  const remove = (i: number) => onUpdate({ matchPairs: pairs.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-2">
      <p className="text-slate-500">أزواج المطابقة (اليسار ← اليمين)</p>
      {pairs.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={p.left}
            onChange={(e) => change(i, { left: e.target.value })}
            placeholder="اليسار"
            className="rounded-xl text-right text-xs"
          />
          <span className="text-slate-400">←</span>
          <Input
            value={p.right}
            onChange={(e) => change(i, { right: e.target.value })}
            placeholder="اليمين"
            className="rounded-xl text-right text-xs"
          />
          <button onClick={() => remove(i)} className="p-1 text-slate-400 hover:text-red-500">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button onClick={add} className="text-[11px] font-bold text-primary flex items-center gap-1">
        <Plus className="h-3 w-3" /> إضافة زوج
      </button>
    </div>
  );
}

function OrderingEditor({
  question,
  onUpdate,
}: {
  question: QuizQuestion;
  onUpdate: (patch: Partial<QuizQuestion>) => void;
}) {
  const items = question.orderItems || [];
  const change = (i: number, v: string) => onUpdate({ orderItems: items.map((it, idx) => (idx === i ? v : it)) });
  const add = () => onUpdate({ orderItems: [...items, ""] });
  const remove = (i: number) => onUpdate({ orderItems: items.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-2">
      <p className="text-slate-500">العناصر بالترتيب الصحيح (الأول ← الأخير)</p>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-slate-300" />
          <span className="h-5 w-5 text-[10px] font-bold text-slate-400 flex items-center justify-center">{i + 1}</span>
          <Input
            value={it}
            onChange={(e) => change(i, e.target.value)}
            placeholder={`العنصر ${i + 1}`}
            className="rounded-xl text-right text-xs flex-1"
          />
          <button onClick={() => remove(i)} className="p-1 text-slate-400 hover:text-red-500">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button onClick={add} className="text-[11px] font-bold text-primary flex items-center gap-1">
        <Plus className="h-3 w-3" /> إضافة عنصر
      </button>
    </div>
  );
}

function FillBlankEditor({
  question,
  onUpdate,
}: {
  question: QuizQuestion;
  onUpdate: (patch: Partial<QuizQuestion>) => void;
}) {
  const blanks = question.blanks || [];
  const change = (i: number, v: string) => onUpdate({ blanks: blanks.map((b, idx) => (idx === i ? v : b)) });
  const add = () => onUpdate({ blanks: [...blanks, ""] });
  const remove = (i: number) => onUpdate({ blanks: blanks.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-2">
      <p className="text-slate-500">إجابات الفراغات (بالترتيب)</p>
      <p className="text-[10px] text-slate-400">
        استخدم ___ (ثلاثة شرطات سفلية) داخل نص السؤال للإشارة إلى موضع الفراغ.
      </p>
      {blanks.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400">الفراغ {i + 1}</span>
          <Input
            value={b}
            onChange={(e) => change(i, e.target.value)}
            placeholder="الإجابة الصحيحة"
            className="rounded-xl text-right text-xs flex-1"
          />
          <button onClick={() => remove(i)} className="p-1 text-slate-400 hover:text-red-500">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button onClick={add} className="text-[11px] font-bold text-primary flex items-center gap-1">
        <Plus className="h-3 w-3" /> إضافة فراغ
      </button>
    </div>
  );
}

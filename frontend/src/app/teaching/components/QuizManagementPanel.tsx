"use client";

import { useState } from "react";
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Users,
  FileQuestion,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Course } from "../hooks/use-teaching-data";

/**
 * Teaching dashboard panel showing the quizzes created for each course,
 * their settings, and aggregated student performance.
 */
export function QuizManagementPanel({ courses }: { courses: Course[] }) {
  const quizzes = courses
    .filter((c) => c.quiz && c.quiz.questions.length > 0)
    .map((c) => ({ course: c, quiz: c.quiz! }));

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-16 space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
          <HelpCircle className="h-7 w-7" />
        </div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">لا توجد اختبارات بعد</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          أنشئ اختباراً تفاعلياً لأي كورس عبر خطوة "اختبار الكورس" في معالج إنشاء الكورس.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">مستودع الاختبارات</h3>
        <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">
          راقب أداء الطلاب في اختبارات كورساتك وقم بتعديل أسئلة كل اختبار.
        </p>
      </div>

      <div className="space-y-4">
        {quizzes.map(({ course, quiz }) => (
          <QuizCard key={course.id} course={course} quiz={quiz} />
        ))}
      </div>
    </div>
  );
}

function QuizCard({ course, quiz }: { course: Course; quiz: NonNullable<Course["quiz"]> }) {
  const [expanded, setExpanded] = useState(false);
  const objective = quiz.questions.filter(
    (q) => q.type !== "ESSAY" && q.type !== "SHORT_ANSWER"
  ).length;
  const totalPoints = quiz.questions.reduce((s, q) => s + (q.points || 0), 0);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-4 flex items-center justify-between gap-3 text-start hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 min-w-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center border border-violet-500/20">
            <FileQuestion className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
              {quiz.title}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{course.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-full px-2.5 py-1">
            <Users className="h-3 w-3" />
            {course.studentsCount || 0}
          </span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1">
            نجاح {quiz.passingScore}%
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <MiniStat label="أسئلة" value={String(quiz.questions.length)} />
            <MiniStat label="موضوعية (تلقائية)" value={String(objective)} />
            <MiniStat label="مجموع الدرجات" value={String(totalPoints)} />
            <MiniStat label="المهلة" value={quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} د` : "مفتوحة"} />
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-2">
            <FeatureTag active={quiz.shuffleQuestions} label="خلط الأسئلة" />
            <FeatureTag active={quiz.shuffleOptions} label="خلط الخيارات" />
            <FeatureTag active={quiz.showCorrectAnswers} label="إظهار الإجابات" />
          </div>

          {/* Questions summary */}
          <div className="space-y-1.5">
            {quiz.questions.map((q, i) => (
              <div
                key={q.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-5 w-5 min-w-5 rounded-md bg-violet-500/10 text-violet-500 text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 truncate">
                    {q.text || "سؤال بدون نص"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {q.type === "ESSAY" ? (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
                      مقالي · يدوي
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                      تلقائي
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">{q.points} نقطة</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3 text-center">
      <p className="text-lg font-black text-slate-800 dark:text-white">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function FeatureTag({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold border",
        active
          ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          : "bg-gray-50 dark:bg-white/[0.03] text-gray-400 border-gray-200 dark:border-white/5"
      )}
    >
      {active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

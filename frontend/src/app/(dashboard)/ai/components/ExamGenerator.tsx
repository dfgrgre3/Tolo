"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Brain,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  BookOpen,
  Calendar,
  ExternalLink,
  Eye,
  EyeOff,
  Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useExamGenerator } from "../hooks/useExamGenerator";
import {
  AISectionShell,
  AIError,
  AIResultHeader,
  AIEmptyState,
  HistoryBar,
  FieldLabel,
  useCopyText,
  downloadTextFile,
  loadLocal,
  saveLocal,
} from "./ai-shared";

interface ExamGeneratorProps {
  subjects: string[];
  years: number[];
  className?: string;
}

const HISTORY_KEY = "thanawy:ai:exam-history";
interface ExamHistoryEntry {
  subject: string;
  year: string;
  lesson: string;
  count: number;
  at: string;
}

function examToText(subject: string, lesson: string, questions: { question: string; correctAnswer: string; explanation: string; options?: string[] }[]): string {
  // Builds a plain-text export of the generated exam (copy/download/print).
  const lines = [`امتحان ${subject} — درس: ${lesson}`, `عدد الأسئلة: ${questions.length}`, ""];
  questions.forEach((q, i) => {
    lines.push((i + 1) + ") " + q.question);
    if (q.options) q.options.forEach((o, j) => lines.push("   " + (["أ", "ب", "ج", "د"][j] ?? "-") + ": " + o));
    lines.push("   الإجابة: " + q.correctAnswer);
    if (q.explanation) lines.push("   الشرح: " + q.explanation);
    lines.push("");
  });
  return lines.join("\n");
}

export default function ExamGenerator({ subjects, years, className = "" }: ExamGeneratorProps) {
  const {
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
  } = useExamGenerator({ subjects, years });

  const [history, setHistory] = useState<ExamHistoryEntry[]>(() => (typeof window === "undefined" ? [] : loadLocal<ExamHistoryEntry[]>(HISTORY_KEY, [])));
  const [showAnswers, setShowAnswers] = useState(true);
  const [practiceMode, setPracticeMode] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const { copied, copy } = useCopyText();

  useEffect(() => {
    if (examData?.questions?.length) {
      const entry: ExamHistoryEntry = {
        subject: selectedSubject,
        year: selectedYear,
        lesson,
        count: examData.questions.length,
        at: new Date().toISOString(),
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- appending fetched exam result to history; sync from async generation is intentional
      setHistory((prev) => {
        if (prev[0]?.lesson === entry.lesson && prev[0]?.subject === entry.subject) return prev;
        const next = [entry, ...prev].slice(0, 8);
        saveLocal(HISTORY_KEY, next);
        return next;
      });
      setAnswers({});
      setScore(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examData]);

  const questions = examData?.questions ?? [];
  const fullText = questions.length ? examToText(selectedSubject, lesson, questions) : "";

  const gradePractice = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if ((answers[i] ?? "").trim() === q.correctAnswer.trim()) correct += 1;
    });
    setScore(correct);
  };

  return (
    <AISectionShell
      badge="Smart Exam Builder"
      title="منشئ الامتحانات الذكي"
      description="أنشئ امتحاناً مخصصاً حسب المادة والدرس ومستوى الصعوبة — مع وضع تدريب تفاعلي وحفظ في اختباراتك."
      icon={<FileText className="h-6 w-6" />}
      actions={
        questions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowAnswers((s) => !s)}>
              {showAnswers ? <EyeOff className="h-3.5 w-3.5 me-1.5" /> : <Eye className="h-3.5 w-3.5 me-1.5" />}
              {showAnswers ? "إخفاء الإجابات" : "إظهار الإجابات"}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 me-1.5" />
              طباعة
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className={className}>
        <HistoryBar
          items={history}
          onClear={() => {
            setHistory([]);
            saveLocal(HISTORY_KEY, []);
          }}
          onSelect={(h) => {
            setSelectedSubject(h.subject);
            setSelectedYear(h.year);
            setLesson(h.lesson);
            setQuestionCount(h.count);
          }}
          renderLabel={(h) => `${h.subject} • ${h.lesson.slice(0, 30)}`}
        />

        {!examData ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required>المادة</FieldLabel>
                <div className="relative">
                  <BookOpen className="absolute start-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Select value={selectedSubject} onValueChange={setSelectedSubject} required>
                    <SelectTrigger id="selectedSubject" className="h-12 rounded-xl ps-10">
                      <SelectValue placeholder="اختر المادة" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel required>السنة الدراسية</FieldLabel>
                <div className="relative">
                  <Calendar className="absolute start-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Select value={selectedYear} onValueChange={setSelectedYear} required>
                    <SelectTrigger id="selectedYear" className="h-12 rounded-xl ps-10">
                      <SelectValue placeholder="اختر السنة الدراسية" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          الصف {year === 1 ? "الأول" : year === 2 ? "الثاني" : "الثالث"} الثانوي
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel required>الدرس ({lesson.trim().length}/3 أحرف على الأقل)</FieldLabel>
                <Input
                  id="lesson"
                  type="text"
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value.slice(0, 200))}
                  placeholder="مثال: قانون أوم — الدائرة الكهربية"
                  required
                  minLength={3}
                  maxLength={200}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="mb-1.5 block text-xs font-bold text-muted-foreground">مستوى الصعوبة</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: "سهل", label: "سهل 🟢" },
                    { v: "متوسط", label: "متوسط 🟡" },
                    { v: "صعب", label: "صعب 🔴" },
                  ].map((d) => (
                    <button
                      key={d.v}
                      type="button"
                      onClick={() => setDifficulty(d.v)}
                      className={`h-12 rounded-xl border text-sm font-bold transition ${
                        difficulty === d.v
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel>عدد الأسئلة: {questionCount}</FieldLabel>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-primary"
                  aria-label="عدد الأسئلة"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>1</span>
                  <span>تدريب سريع: 5–10</span>
                  <span>شامل: 20+</span>
                  <span>50</span>
                </div>
              </div>
            </div>

            <AIError message={error || null} onRetry={handleRetryEnqueue} />

            {isGenerating && (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm font-bold text-primary" aria-live="polite">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري إنشاء الامتحان في الخلفية{pollSeconds > 0 ? ` (${pollSeconds} ث)` : "..."} — يمكنك متابعة التصفح.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isGenerating} className="h-12 rounded-xl px-10 font-bold">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 me-2 animate-spin" />
                    جاري إنشاء الامتحان...
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5 me-2" />
                    إنشاء الامتحان
                  </>
                )}
              </Button>
              {isGenerating && (
                <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => resetGenerator()}>
                  إلغاء
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                تم إنشاء الامتحان بنجاح ({questions.length} سؤال)
              </div>
              <div className="ms-auto flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full">{selectedSubject}</Badge>
                <Badge variant="secondary" className="rounded-full">{lesson.slice(0, 40)}</Badge>
                {difficulty !== "none" && <Badge className="rounded-full bg-primary/10 text-primary">{difficulty}</Badge>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/40 p-3">
              <span className="px-2 text-xs font-bold text-muted-foreground">وضع العرض:</span>
              <button
                onClick={() => setPracticeMode(false)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${!practiceMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                مراجعة + إجابات
              </button>
              <button
                onClick={() => setPracticeMode(true)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${practiceMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                تدريب تفاعلي (اختبر نفسك)
              </button>
            </div>

            <AIResultHeader
              title={practiceMode ? "اختبر نفسك ثم اعرض النتيجة" : "الأسئلة"}
              copied={copied}
              onCopy={() => copy(fullText)}
              onDownload={() => downloadTextFile(`exam-${lesson.slice(0, 20) || "exam"}.txt`, fullText)}
              onReset={resetGenerator}
            />

            <div className="max-h-[480px] space-y-4 overflow-y-auto pe-1">
              {questions.map((question, index) => (
                <Card key={index} className="rounded-2xl border-border p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-black text-primary ring-1 ring-primary/20">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold leading-relaxed text-foreground">{question.question}</p>

                      {practiceMode && (question.type === "multiple_choice" || question.type === "true_false") ? (
                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                          {(question.type === "multiple_choice" ? question.options ?? [] : ["صح", "خطأ"]).map((opt) => {
                            const selected = answers[index] === opt;
                            const revealed = score !== null;
                            const isCorrect = opt === question.correctAnswer;
                            return (
                              <button
                                key={opt}
                                disabled={revealed}
                                onClick={() => setAnswers((a) => ({ ...a, [index]: opt }))}
                                className={`rounded-xl border p-3 text-start text-sm transition ${
                                  revealed && isCorrect
                                    ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400"
                                    : revealed && selected
                                      ? "border-destructive/50 bg-destructive/10 text-destructive"
                                      : selected
                                        ? "border-primary bg-primary/10 font-bold text-primary"
                                        : "border-border bg-muted/40 hover:border-primary/40"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <>
                          {question.type === "multiple_choice" && question.options && (
                            <div className="mb-3 mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                              {question.options.map((option, i) => (
                                <div
                                  key={i}
                                  className={`rounded-xl border p-3 text-sm transition ${
                                    showAnswers && option === question.correctAnswer
                                      ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400"
                                      : "border-border bg-muted/40 text-foreground"
                                  }`}
                                >
                                  {option}
                                </div>
                              ))}
                            </div>
                          )}
                          {question.type === "true_false" && showAnswers && (
                            <div className="mb-3 mt-3 flex gap-2">
                              {["صح", "خطأ"].map((v) => (
                                <div
                                  key={v}
                                  className={`flex-1 rounded-xl border p-3 text-center text-sm ${
                                    v === question.correctAnswer
                                      ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400"
                                      : "border-border bg-muted/40"
                                  }`}
                                >
                                  {v}
                                </div>
                              ))}
                            </div>
                          )}
                          {showAnswers && (
                            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                              <p className="text-sm font-bold text-primary">الإجابة: {question.correctAnswer}</p>
                              {question.explanation && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{question.explanation}</p>}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {practiceMode && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/40 p-4">
                <Button onClick={gradePractice} className="h-11 rounded-xl px-8 font-bold">
                  احسب نتيجتي ({Object.keys(answers).length}/{questions.length})
                </Button>
                {score !== null && (
                  <div className="text-sm font-black">
                    نتيجتك: {score}/{questions.length} — {Math.round((score / Math.max(1, questions.length)) * 100)}%
                    {score === questions.length ? " 🎉 ممتاز!" : score >= questions.length / 2 ? " 💪 جيد، راجع الأخطاء" : " 📚 تحتاج مراجعة الدرس"}
                  </div>
                )}
              </div>
            )}

            {saveSuccess ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                تم حفظ الامتحان في قائمة اختباراتك.
                <a href="/exams?mine=1" className="ms-auto flex items-center gap-1 underline underline-offset-4">
                  عرض امتحاناتي <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              saveError && (
                <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" /> {saveError}
                </div>
              )
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={resetGenerator} variant="outline" className="h-12 flex-1 rounded-2xl" disabled={isSaving}>
                <RefreshCw className="h-4 w-4 me-2" />
                إنشاء امتحان جديد
              </Button>
              {!saveSuccess && (
                <Button onClick={handleSaveExam} className="h-12 flex-1 rounded-2xl font-black" disabled={isSaving || questions.length === 0}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 me-2 animate-spin" /> جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 me-2" /> حفظ الامتحان
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {!examData && history.length === 0 && !isGenerating && (
          <div className="mt-6">
            <AIEmptyState
              icon={<FileText className="h-6 w-6" />}
              title="لم تنشئ أي امتحان بعد"
              description="اختر المادة والدرس وعدد الأسئلة، وسنولّد لك امتحاناً كاملاً بالإجابات والشرح — مع إمكانية التدرب عليه تفاعلياً."
            />
          </div>
        )}
      </div>
    </AISectionShell>
  );
}

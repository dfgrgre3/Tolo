"use client";

import { useEffect, useState } from "react";
import { m } from "framer-motion";
import { Loader2, HelpCircle, ChevronDown, ChevronUp, Send, GraduationCap, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Question } from "./types";

export function QuestionsTab({
  courseId,
  enrolled
}: {
  courseId: string;
  enrolled: boolean;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});
  const [submittingAnswers, setSubmittingAnswers] = useState<Record<string, boolean>>({});

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/questions`);
      if (res.ok) {
        const data = await res.json();
        const payload = data.data || data;
        setQuestions(payload.questions || []);
      }
    } catch {
      // silently handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleSubmitQuestion = async () => {
    if (!newTitle.trim()) {
      toast.error("يرجى كتابة عنوان للسؤال");
      return;
    }
    setSubmittingQuestion(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, body: newBody || undefined })
      });
      if (res.ok) {
        toast.success("تم إرسال سؤالك");
        setNewTitle("");
        setNewBody("");
        fetchQuestions();
      } else {
        const err = await res.json();
        toast.error(err.error || "فشل إرسال السؤال");
      }
    } catch {
      toast.error("حدث خطأ أثناء إرسال السؤال");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleSubmitAnswer = async (questionId: string) => {
    const body = answerInputs[questionId]?.trim();
    if (!body) {
      toast.error("يرجى كتابة رد");
      return;
    }
    setSubmittingAnswers((prev) => ({ ...prev, [questionId]: true }));
    try {
      const res = await fetch(`/api/questions/${questionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
      if (res.ok) {
        toast.success("تم إرسال ردك");
        setAnswerInputs((prev) => ({ ...prev, [questionId]: "" }));
        fetchQuestions();
      } else {
        const err = await res.json();
        toast.error(err.error || "فشل إرسال الرد");
      }
    } catch {
      toast.error("حدث خطأ أثناء إرسال الرد");
    } finally {
      setSubmittingAnswers((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl space-y-6">

      {/* Ask a question */}
      {enrolled &&
        <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/80 p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">اطرح سؤالاً</h3>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="عنوان السؤال..."
            className="w-full h-11 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-4 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="تفاصيل إضافية (اختياري)..."
            className="w-full h-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          <div className="flex items-center justify-end">
            <Button
              onClick={handleSubmitQuestion}
              disabled={submittingQuestion || !newTitle.trim()}
              className="gap-2 bg-primary text-white rounded-xl h-10 px-6 font-bold text-sm shadow-lg shadow-primary/20">
              {submittingQuestion && <Loader2 className="h-4 w-4 animate-spin" />}
              إرسال السؤال
            </Button>
          </div>
        </div>
      }

      {/* Questions list */}
      {loading ?
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-gray-500">جاري تحميل الأسئلة...</p>
        </div> :
        questions.length > 0 ?
          <div className="space-y-3">
            {questions.map((q) =>
              <div
                key={q.id}
                className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/60 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                    {q.user?.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{q.user?.name || "مستخدم"}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(q.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{q.title}</p>
                  {q.body && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1">{q.body}</p>}
                </div>

                {/* Answers */}
                <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                  <button
                    onClick={() => toggleExpand(q.id)}
                    className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    <HelpCircle className="h-3 w-3" />
                    {q.answers?.length || 0} رد
                    {expanded.has(q.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {expanded.has(q.id) &&
                    <div className="mt-3 space-y-2">
                      {(q.answers || []).map((a) =>
                        <div
                          key={a.id}
                          className={cn(
                            "rounded-lg p-3 space-y-2",
                            a.isInstructorAnswer ?
                              "bg-primary/5 border border-primary/20" :
                              "bg-gray-50 dark:bg-gray-800/50"
                          )}>
                          <div className="flex items-center gap-2">
                            {a.isInstructorAnswer ?
                              <GraduationCap className="h-3 w-3 text-primary" /> :
                              <User className="h-3 w-3 text-gray-400" />}
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                              {a.user?.name || "مستخدم"}
                            </span>
                            {a.isInstructorAnswer &&
                              <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                                المدرّس
                              </span>}
                            <span className="text-[10px] text-gray-400">
                              {new Date(a.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{a.body}</p>
                        </div>
                      )}
                    </div>
                  }
                </div>

                {/* Answer input */}
                {enrolled &&
                  <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={answerInputs[q.id] || ""}
                        onChange={(e) => setAnswerInputs((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="اكتب ردك..."
                        className="flex-1 h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <Button
                        onClick={() => handleSubmitAnswer(q.id)}
                        disabled={submittingAnswers[q.id] || !answerInputs[q.id]?.trim()}
                        size="sm"
                        className="h-9 px-3 gap-1 bg-primary text-white rounded-lg text-xs font-bold">
                        {submittingAnswers[q.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        إرسال
                      </Button>
                    </div>
                  </div>
                }
              </div>
            )}
          </div> :
          <div className="text-center py-12 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10">
            <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">لا توجد أسئلة بعد</p>
            <p className="text-xs text-gray-400 mt-1">
              {enrolled ? "كن أول من يطرح سؤالاً!" : "سجل في الدورة لتتمكن من السؤال"}
            </p>
          </div>
      }
    </m.div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Lightbulb, Target, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Copy, Check } from "lucide-react";

import { logger } from "@/lib/logger";
import { useAIWorkspace } from "../context/AIWorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface Tip {
  category: string;
  title: string;
  content: string;
  priority: "high" | "medium" | "low";
}

interface TipsGeneratorProps {
  subjects?: string[];
  userId?: string;
  className?: string;
}

const HISTORY_KEY = "thanawy:ai:tips-history";
interface TipsHistoryEntry { subject: string; goal: string; at: string; count: number }

const CATEGORY_STYLE: Record<string, string> = {
  "استراتيجيات الدراسة": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  "التغلب على التحديات": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "المصادر التعليمية": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  "الخطة الدراسية": "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
  "تحسين الأداء": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  "استراتيجيات الدراسة": <BookOpen className="h-5 w-5" />,
  "التغلب على التحديات": <AlertTriangle className="h-5 w-5" />,
  "الخطة الدراسية": <Target className="h-5 w-5" />,
  "تحسين الأداء": <CheckCircle2 className="h-5 w-5" />,
};

export default function TipsGenerator({ subjects = [], userId, className = "" }: TipsGeneratorProps) {
  const { tips, context, setContext } = useAIWorkspace();
  const [selectedSubject, setSelectedSubject] = useState(context.subject ?? "");
  const [studyGoal, setStudyGoal] = useState("");
  const [challenges, setChallenges] = useState("");
  const [currentGrade, setCurrentGrade] = useState(context.year ?? "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tipsData, setTipsData] = useState<{ tips?: Tip[]; summary?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TipsHistoryEntry[]>([]);
  const [doneIdx, setDoneIdx] = useState<number[]>([]);
  const { copied, copy } = useCopyText();

  useEffect(() => {
    setHistory(loadLocal<TipsHistoryEntry[]>(HISTORY_KEY, []));
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsGenerating(true);
    setError(null);
    setTipsData(null);
    setDoneIdx([]);
    try {
      if (selectedSubject) setContext({ subject: selectedSubject });
      const data = await tips<{ tips?: Tip[]; summary?: string }>({
        userId,
        subject: selectedSubject || undefined,
        studyGoal: studyGoal || undefined,
        challenges: challenges || undefined,
        currentGrade: currentGrade || undefined,
      });
      const list = Array.isArray(data?.tips) ? data!.tips! : [];
      setTipsData({ tips: list, summary: data?.summary });
      if (list.length === 0 && !data?.summary) {
        setError("وصل رد فارغ. جرّب وصف هدفك بمزيد من التفاصيل.");
        return;
      }
      setHistory((prev) => {
        const next = [{ subject: selectedSubject || "عام", goal: studyGoal.slice(0, 40) || "تحسين عام", at: new Date().toISOString(), count: list.length }, ...prev].slice(0, 8);
        saveLocal(HISTORY_KEY, next);
        return next;
      });
    } catch (err) {
      logger.error("Error generating tips:", err);
      setError(err instanceof Error ? err.message : "حدث خطأ غير معروف");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleDone = (i: number) => setDoneIdx((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  const progress = tipsData?.tips?.length ? Math.round((doneIdx.length / tipsData.tips.length) * 100) : 0;

  const allText = tipsData ? `${tipsData.summary ?? ""}\n\n${(tipsData.tips ?? []).map((t, i) => `${i + 1}. ${t.title} [${t.category}]: ${t.content}`).join("\n")}` : "";

  return (
    <AISectionShell
      badge="Study Coach"
      title="النصائح التعليمية"
      description="نصائح مخصصة حسب مادتك وهدفك وتحدياتك — علّم على ما أنجزته وتابع تقدمك."
      icon={<Lightbulb className="h-6 w-6" />}
    >
      <div className={className}>
        <HistoryBar
          items={history}
          onClear={() => {
            setHistory([]);
            saveLocal(HISTORY_KEY, []);
          }}
          onSelect={(h) => {
            setSelectedSubject(h.subject === "عام" ? "" : h.subject);
            setStudyGoal(h.goal === "تحسين عام" ? "" : h.goal);
          }}
          renderLabel={(h) => `${h.subject} • ${h.goal}`}
        />

        {!tipsData ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {subjects.length > 0 && (
                <div>
                  <FieldLabel>المادة</FieldLabel>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="اختر المادة (اختياري)" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <FieldLabel>السنة / المستوى</FieldLabel>
                <Input value={currentGrade} onChange={(e) => setCurrentGrade(e.target.value.slice(0, 60))} placeholder="مثال: الثالث الثانوي" className="h-12 rounded-xl" />
              </div>
              <div>
                <FieldLabel>الهدف الدراسي</FieldLabel>
                <Input value={studyGoal} onChange={(e) => setStudyGoal(e.target.value.slice(0, 200))} placeholder="مثال: رفع الفيزياء من 70% إلى 95%" className="h-12 rounded-xl" />
              </div>
              <div>
                <FieldLabel>أكبر تحدٍ يواجهك</FieldLabel>
                <Select value={challenges} onValueChange={setChallenges}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="اختر أو اكتب تحديك" />
                  </SelectTrigger>
                  <SelectContent>
                    {["صعوبة الحفظ", "قلة التركيز", "إدارة الوقت", "القلق من الامتحان", "فهم المسائل", "المماطلة"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <FieldLabel>تفاصيل إضافية (اختياري)</FieldLabel>
                <Textarea value={challenges.startsWith("تفاصيل:") ? challenges : ""} onChange={(e) => setChallenges(e.target.value.slice(0, 500))} placeholder="اشرح روتينك الحالي وساعات مذاكرتك..." className="min-h-[90px] rounded-2xl" />
                <p className="mt-1 text-[11px] text-muted-foreground">كلما وصفت وضعك بدقة، كانت النصائح أنفع.</p>
              </div>
            </div>

            <AIError message={error} onRetry={() => handleSubmit()} />

            <Button type="submit" disabled={isGenerating} className="h-12 rounded-xl px-10 font-bold">
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 me-2 animate-spin" /> جاري إنشاء النصائح...
                </>
              ) : (
                <>
                  <Lightbulb className="h-5 w-5 me-2" /> احصل على نصائح مخصصة
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-5">
            <AIResultHeader
              title={`نصائحك المخصصة (${tipsData.tips?.length ?? 0})`}
              copied={copied}
              onCopy={() => copy(allText)}
              onDownload={() => downloadTextFile("study-tips.txt", allText)}
              onReset={() => {
                setTipsData(null);
                setError(null);
              }}
            />

            {tipsData.summary && (
              <Card className="rounded-2xl border-primary/20 bg-primary/5 p-5">
                <h4 className="font-bold text-primary">الخلاصة</h4>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{tipsData.summary}</p>
              </Card>
            )}

            {tipsData.tips && tipsData.tips.length > 0 && (
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <div className="mb-2 flex items-center justify-between text-xs font-bold">
                  <span>تقدم التنفيذ: {doneIdx.length}/{tipsData.tips.length}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {(tipsData.tips ?? []).map((tip, index) => {
                const done = doneIdx.includes(index);
                return (
                  <Card key={index} className={`rounded-2xl p-5 transition ${done ? "border-emerald-500/40 bg-emerald-500/5" : "hover:border-primary/30"}`}>
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-xl border p-2.5 ${CATEGORY_STYLE[tip.category] ?? "border-border bg-muted text-muted-foreground"}`}>
                          {CATEGORY_ICON[tip.category] ?? <Lightbulb className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className={`font-bold ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>{tip.title}</h4>
                          <div className="mt-1 flex gap-1.5">
                            <Badge variant="secondary" className="rounded-full text-[10px]">{tip.category}</Badge>
                            <Badge className={`rounded-full text-[10px] ${tip.priority === "high" ? "bg-red-500/10 text-red-500" : tip.priority === "medium" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                              {tip.priority === "high" ? "أولوية عالية" : tip.priority === "medium" ? "متوسطة" : "منخفضة"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => copy(`${tip.title}: ${tip.content}`)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="نسخ النصيحة">
                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{tip.content}</p>
                    <Button variant={done ? "secondary" : "outline"} size="sm" className="mt-3 rounded-xl" onClick={() => toggleDone(index)}>
                      {done ? "✓ تم التنفيذ — تراجع" : "علّم كمنفّذة"}
                    </Button>
                  </Card>
                );
              })}
            </div>

            {(!tipsData.tips || tipsData.tips.length === 0) && (
              <AIEmptyState title="لا توجد نصائح مفصلة" description="حاول وصف هدفك وتحديك بتفاصيل أكثر." />
            )}

            <Button
              onClick={() => {
                setTipsData(null);
                setError(null);
              }}
              variant="outline"
              className="h-11 rounded-xl"
            >
              <RefreshCw className="h-4 w-4 me-2" /> نصائح جديدة
            </Button>
          </div>
        )}

        {!tipsData && !isGenerating && history.length === 0 && (
          <div className="mt-6">
            <AIEmptyState icon={<Lightbulb className="h-6 w-6" />} title="كيف تعمل؟" description="أخبرنا بمادتك وهدفك وتحديك، وسنولّد خطة نصائح مرتبة بالأولوية مع تتبع التنفيذ." />
          </div>
        )}
      </div>
    </AISectionShell>
  );
}

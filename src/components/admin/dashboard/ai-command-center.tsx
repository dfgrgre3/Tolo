"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";

type RiskStudent = {
  id: string;
  name: string;
  email: string;
  gradeLevel: string | null;
  riskScore: number;
  reasons: string[];
  latestAverage: number | null;
  studyMinutesLast7Days: number;
  daysSinceLastLogin: number | null;
};

type ReviewItem = {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  status: "approved" | "pending_review" | "rejected";
  author: string;
  subject: string;
  preview: string;
  publishedEntityType: string | null;
  publishedEntityId: string | null;
};

type SubjectItem = {
  id: string;
  name: string;
};

type AdminAiPayload = {
  riskStudents: RiskStudent[];
  reviewQueue: ReviewItem[];
  subjects: SubjectItem[];
  summary: {
    highRiskCount: number;
    reviewPendingCount: number;
  };
};

const starterPrompts = [
  "استخرج لي تقريراً بأسماء الطلاب الذين انخفض أداؤهم هذا الأسبوع.",
  "أنشئ اختباراً مفاجئاً من 10 أسئلة لطلاب الصف الأول في الفيزياء.",
  "لخص لي أولويات التدخل الإداري خلال هذا الأسبوع.",
];

export function AiCommandCenter() {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = React.useState(starterPrompts[0]);
  const [copilotReply, setCopilotReply] = React.useState("");
  const [generatorForm, setGeneratorForm] = React.useState({
    title: "",
    prompt: "",
    contentType: "exam_blueprint",
    subjectId: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-ai"],
    queryFn: async () => {
      const response = await fetch("/api/admin/ai");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load admin AI data");
      }
      return payload as AdminAiPayload;
    },
  });

  const copilotMutation = useMutation({
    mutationFn: async (value: string) => {
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copilot", prompt: value }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to get copilot response");
      }
      return payload as { message: string };
    },
    onSuccess: (payload) => setCopilotReply(payload.message),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_content",
          ...generatorForm,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate content request");
      }
      return payload;
    },
    onSuccess: () => {
      setGeneratorForm({ title: "", prompt: "", contentType: "exam_blueprint", subjectId: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-ai"] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approve" | "reject" }) => {
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review_content", id, decision }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to review content");
      }
      return payload;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-ai"] }),
  });

  const getPublishedLink = (item: ReviewItem) => {
    if (!item.publishedEntityType || !item.publishedEntityId) {
      return null;
    }
    return `/admin/ai?item=${encodeURIComponent(item.id)}&entityType=${encodeURIComponent(item.publishedEntityType)}&entityId=${encodeURIComponent(item.publishedEntityId)}`;
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]" dir="rtl">
      <div className="rounded-[2rem] border border-border bg-card/90 p-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Brain className="h-4 w-4" />
              Admin Copilot
            </div>
            <h2 className="text-2xl font-bold">مركز القيادة الذكي</h2>
            <p className="text-sm text-muted-foreground">
              أوامر نصية، توقعات مخاطر، وتدفق مراجعة للمحتوى قبل النشر.
            </p>
          </div>
          <div className="grid gap-2 text-left">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
              طلاب خطر مرتفع: {data?.summary.highRiskCount ?? 0}
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm dark:border-sky-900/40 dark:bg-sky-950/20">
              مراجعات معلقة: {data?.summary.reviewPendingCount ?? 0}
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {starterPrompts.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPrompt(item)}
              className="rounded-full border border-border px-3 py-2 text-xs transition hover:border-primary hover:text-primary"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            className="min-h-[120px] rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none ring-0"
            placeholder="اكتب أمراً للإدارة..."
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              الأوامر تُحوَّل إلى ملخص تنفيذي وتوصيات تشغيلية.
            </span>
            <button
              type="button"
              onClick={() => copilotMutation.mutate(prompt)}
              disabled={copilotMutation.isPending || !prompt.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {copilotMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              تشغيل Copilot
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-border bg-background/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            الرد التنفيذي
          </div>
          <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {copilotReply || "سيظهر هنا ملخص إداري قابل للتنفيذ عند إرسال أول أمر."}
          </p>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-border bg-background/60 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-primary" />
            توليد المحتوى مع مراجعة بشرية
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={generatorForm.title}
              onChange={(event) => setGeneratorForm((current) => ({ ...current, title: event.target.value }))}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm"
              placeholder="عنوان الطلب"
            />
            <select
              value={generatorForm.contentType}
              onChange={(event) => setGeneratorForm((current) => ({ ...current, contentType: event.target.value }))}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm"
            >
              <option value="exam_blueprint">مخطط اختبار</option>
              <option value="curriculum_outline">مخطط منهج</option>
              <option value="article_draft">مسودة مقال</option>
            </select>
            <select
              value={generatorForm.subjectId}
              onChange={(event) => setGeneratorForm((current) => ({ ...current, subjectId: event.target.value }))}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm"
            >
              <option value="">مادة عامة</option>
              {(data?.subjects || []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <div className="rounded-xl border border-dashed border-border px-4 py-2 text-xs text-muted-foreground">
              كل عنصر جديد يدخل قائمة مراجعة قبل اعتماده.
            </div>
          </div>
          <textarea
            value={generatorForm.prompt}
            onChange={(event) => setGeneratorForm((current) => ({ ...current, prompt: event.target.value }))}
            rows={3}
            className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
            placeholder="مثال: أنشئ اختباراً مفاجئاً من 10 أسئلة في قوانين نيوتن لطلاب الصف الأول الثانوي."
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !generatorForm.prompt.trim()}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary disabled:opacity-60"
            >
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              إرسال إلى سير المراجعة
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="rounded-[2rem] border border-border bg-card/90 p-6">
          <div className="mb-4 flex items-center gap-2 text-lg font-bold">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            التحليلات التنبؤية
          </div>
          <div className="space-y-3">
            {isLoading && <div className="text-sm text-muted-foreground">جارٍ تحميل التوقعات...</div>}
            {(data?.riskStudents || []).map((student) => (
              <div key={student.id} className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{student.name}</div>
                    <div className="text-xs text-muted-foreground">{student.gradeLevel || student.email}</div>
                  </div>
                  <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                    {student.riskScore}% خطر
                  </div>
                </div>
                <div className="mb-2 text-xs text-muted-foreground">
                  متوسط الدرجات: {student.latestAverage ?? "غير متوفر"} | دراسة آخر 7 أيام: {student.studyMinutesLast7Days} دقيقة
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {student.reasons.map((reason) => (
                    <li key={reason}>• {reason}</li>
                  ))}
                </ul>
              </div>
            ))}
            {!isLoading && (data?.riskStudents || []).length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                لا توجد حالات عالية الخطورة وفق المؤشرات الحالية.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card/90 p-6">
          <div className="mb-4 flex items-center gap-2 text-lg font-bold">
            <ClipboardList className="h-5 w-5 text-sky-500" />
            قائمة مراجعة المحتوى
          </div>
          <div className="space-y-3">
            {(data?.reviewQueue || []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.subject} | {item.author}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {item.status === "approved" ? "معتمد" : item.status === "rejected" ? "مرفوض" : "بانتظار المراجعة"}
                  </div>
                </div>
                <p className="mb-3 line-clamp-3 text-xs leading-6 text-muted-foreground">{item.preview}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => reviewMutation.mutate({ id: item.id, decision: "approve" })}
                    disabled={reviewMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 disabled:opacity-60 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    اعتماد
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewMutation.mutate({ id: item.id, decision: "reject" })}
                    disabled={reviewMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
                  >
                    <XCircle className="h-4 w-4" />
                    رفض
                  </button>
                  {item.status === "approved" && getPublishedLink(item) && (
                    <a
                      href={getPublishedLink(item) || "#"}
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300"
                    >
                      فتح المنشور
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

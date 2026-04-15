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
  ShieldCheck,
  Zap,
  Crown,
  Scroll
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  return (
    <section className="grid gap-8 xl:grid-cols-[1.4fr_0.6fr]" dir="rtl">
      {/* --- Main Intelligence Hub --- */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="rpg-glass p-8 border-primary/20 space-y-8"
      >
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]">
              <Brain className="h-4 w-4" />
              <span>ذكاء المملكة الروحاني - Copilot</span>
            </div>
            <h2 className="text-3xl font-black">غرفة التخطيط الإستراتيجي</h2>
            <p className="text-gray-400 font-medium max-w-xl">
              تحدث مع مستشار المملكة الذكي، أصدر المخططات، وراقب نبض الجمهور.
            </p>
          </div>
          
          <div className="flex gap-4">
             <div className="rpg-card p-4 flex flex-col items-center gap-1 min-w-[120px] bg-red-500/5 border-red-500/20">
                <span className="text-3xl font-black text-red-500">{data?.summary.highRiskCount ?? 0}</span>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">محارب في خطر</span>
             </div>
             <div className="rpg-card p-4 flex flex-col items-center gap-1 min-w-[120px] bg-sky-500/5 border-sky-500/20">
                <span className="text-3xl font-black text-sky-500">{data?.summary.reviewPendingCount ?? 0}</span>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">تحرك معلق</span>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {starterPrompts.map((item, index) => (
              <motion.button
                key={`prompt-${index}-${item.substring(0, 20).replace(/\s+/g, '-')}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setPrompt(item)}
                className="rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-xs font-bold text-gray-300 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary backdrop-blur-md"
              >
                {item}
              </motion.button>
            ))}
          </div>

          <div className="relative group">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              className="w-full min-h-[140px] rounded-2xl border border-white/5 bg-black/20 px-5 py-4 text-sm font-medium text-white outline-none ring-0 placeholder:text-gray-600 focus:border-primary/50 transition-all backdrop-blur-xl"
              placeholder="اكتب أمراً للإدارة..."
            />
            <div className="absolute bottom-4 left-4 flex items-center justify-between right-4">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                تم استدعاء المستشار بنجاح
              </span>
              <motion.button
                whileHover={{ scale: 1.05, x: -5 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => copilotMutation.mutate(prompt)}
                disabled={copilotMutation.isPending || !prompt.trim()}
                className="inline-flex items-center gap-3 rounded-xl bg-primary px-6 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
              >
                {copilotMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                أرسل الهدهد
              </motion.button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {copilotReply && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-8 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Scroll className="w-24 h-24 text-amber-500" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3 text-amber-400 text-sm font-black uppercase tracking-widest">
                  <Sparkles className="h-5 w-5" />
                  الرد الملكي المختوم
                </div>
                <p className="whitespace-pre-wrap text-sm leading-8 text-gray-300 font-medium border-r-2 border-amber-500/30 pr-6">
                  {copilotReply}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rpg-divider" />

        <div className="space-y-6">
          <div className="flex items-center gap-3 text-xl font-black">
            <ClipboardList className="h-6 w-6 text-primary" />
            <span>صناعة المخطوطات والوثائق</span>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">عنوان المخطوطة</label>
              <input
                value={generatorForm.title}
                onChange={(event) => setGeneratorForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm font-bold text-white placeholder:text-gray-700 outline-none focus:border-primary/50 transition-all"
                placeholder="ادخل المسمى..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">نوع الوثيقة</label>
              <select
                value={generatorForm.contentType}
                onChange={(event) => setGeneratorForm((current) => ({ ...current, contentType: event.target.value }))}
                className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary/50 transition-all appearance-none"
              >
                <option value="exam_blueprint">📜 مخطط اختبار</option>
                <option value="curriculum_outline">📖 مخطط منهج</option>
                <option value="article_draft">🖋️ مسودة مقال</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">المادة المستهدفة</label>
              <select
                value={generatorForm.subjectId}
                onChange={(event) => setGeneratorForm((current) => ({ ...current, subjectId: event.target.value }))}
                className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary/50 transition-all appearance-none"
              >
                <option value="">🔮 مادة عامة</option>
                {(data?.subjects || []).map((subject, index) => (
                  <option key={`subject-option-${subject.id || index}`} value={subject.id}>
                    ✨ {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">مواصفات الاستدعاء</label>
             <textarea
               value={generatorForm.prompt}
               onChange={(event) => setGeneratorForm((current) => ({ ...current, prompt: event.target.value }))}
               rows={3}
               className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-4 text-sm font-medium text-white placeholder:text-gray-700 outline-none focus:border-primary/50 transition-all"
               placeholder="مثال: أنشئ اختباراً مفاجئاً من 10 أسئلة في قوانين نيوتن..."
             />
          </div>

          <div className="flex justify-between items-center bg-primary/5 border border-primary/10 rounded-2xl p-4">
             <span className="text-xs text-primary/70 font-bold max-w-sm">
                * جميع العناصر المصنوعة بواسطة السحر تدخل قائمة المراجعة تلقائياً قبل نشرها للعامة.
             </span>
             <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               type="button"
               onClick={() => generateMutation.mutate()}
               disabled={generateMutation.isPending || !generatorForm.prompt.trim()}
               className="inline-flex items-center gap-3 rounded-xl bg-orange-500/10 border border-orange-500/30 px-6 py-3 text-sm font-black text-orange-500 transition-all hover:bg-orange-500/20"
             >
               {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
               صناعة الآن
             </motion.button>
          </div>
        </div>
      </motion.div>

      {/* --- Intelligence Feeds (Sidebar) --- */}
      <div className="space-y-8">
        {/* Risk Assessment */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rpg-glass p-6 border-red-500/10"
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-black flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
              <span>رصد المخاطر</span>
            </h3>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Real-time</span>
          </div>
          
          <div className="space-y-4">
            {isLoading && <div className="text-xs text-gray-500 font-bold animate-pulse text-center p-8">جارٍ استطلاع الجبهة...</div>}
            {(data?.riskStudents || []).map((student, index) => (
              <motion.div 
                key={`risk-student-${student.id || index}`} 
                whileHover={{ x: -4 }}
                className="rpg-card p-4 border-white/5 bg-white/5 hover:border-red-500/30 transition-all group"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm tracking-tight">{student.name}</div>
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mt-0.5">
                      {student.gradeLevel || "محارب ناشئ"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-red-500">{student.riskScore}%</span>
                    <div className="w-12 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                       <div className="h-full bg-red-500" style={{ width: `${student.riskScore}%` }} />
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/5 space-y-2">
                   {(Array.isArray(student.reasons) ? student.reasons : []).slice(0, 2).map((reason, idx) => (
                     <div key={`reason-${student.id}-${idx}`} className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                        <div className="w-1 h-1 bg-red-500/50 rounded-full" />
                        {reason}
                     </div>
                   ))}
                </div>
              </motion.div>
            ))}
            {!isLoading && (data?.riskStudents || []).length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center bg-white/5">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-3 opacity-20" />
                <p className="text-xs text-gray-500 font-bold leading-relaxed">المملكة آمنة حالياً. لا توجد تهديدات مرصودة.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Content Review Queue */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="rpg-glass p-6 border-sky-500/10"
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-black flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-sky-500" />
              <span>مراجعة المخطوطات</span>
            </h3>
            <div className="p-1 px-2 rounded-md bg-sky-500/10 border border-sky-500/30 text-[10px] font-black text-sky-500">
               {data?.reviewQueue.length ?? 0}
            </div>
          </div>

          <div className="space-y-4">
            {(data?.reviewQueue || []).map((item, index) => (
              <div key={`review-item-${item.id || index}`} className="rpg-card p-4 border-white/5 bg-white/5 hover:border-sky-500/30 transition-all">
                <div className="mb-3">
                  <div className="font-bold text-sm leading-tight mb-1">{item.title}</div>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black uppercase tracking-widest text-primary">{item.subject}</span>
                     <span className="text-[10px] text-gray-600 font-bold">•</span>
                     <span className="text-[10px] font-bold text-gray-500">{item.author}</span>
                  </div>
                </div>
                
                <p className="mb-4 line-clamp-2 text-[11px] leading-relaxed text-gray-400 italic">
                  &ldquo;{item.preview}&rdquo;
                </p>
                
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => reviewMutation.mutate({ id: item.id, decision: "approve" })}
                    disabled={reviewMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 py-2 text-[10px] font-black text-emerald-500 hover:bg-emerald-500/20 transition-all"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    اختم بالقبول
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => reviewMutation.mutate({ id: item.id, decision: "reject" })}
                    disabled={reviewMutation.isPending}
                    className="inline-flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 p-2 text-rose-500 hover:bg-rose-500/20 transition-all"
                  >
                    <XCircle className="h-3 w-3" />
                  </motion.button>
                </div>
              </div>
            ))}
            {!isLoading && (data?.reviewQueue || []).length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center bg-white/5">
                <Crown className="w-8 h-8 text-sky-500 mx-auto mb-3 opacity-20" />
                <p className="text-xs text-gray-500 font-bold leading-relaxed">جميع المخططات موافق عليها من قبل الملك.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

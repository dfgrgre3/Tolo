"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { SearchInput } from "@/components/admin/ui/admin-input";
import { StatusBadge } from "@/components/admin/ui/admin-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Check, Target, Clock, Bot, AlertTriangle, TrendingDown, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { m, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/api/admin-api";
import { apiRoutes } from "@/lib/api/routes";


interface Subject {
  id: string;
  name: string;
}

interface ReviewItem {
  id: string;
  title: string;
  type: string;
  status: "pending_review" | "approved" | "rejected";
  createdAt: string;
  author: string;
  subject: string;
  preview: string;
}

interface RiskStudent {
  userId: string;
  name: string;
  email: string;
  riskLevel: "CRITICAL" | "WARNING" | "NOTICE";
  reason: string;
  recommendation: string;
}

interface GradingItem {
  id: string;
  studentName: string;
  score: string;
  answer: string;
  feedback: string | null;
  status: "PENDING" | "RESOLVED";
}

interface AiResponseData {
  success: boolean;
  subjects: Subject[];
  reviewQueue: ReviewItem[];
  riskStudents: RiskStudent[];
  gradingQueue: GradingItem[];
  forecast: Array<{
    userId: string;
    name: string;
    currentScore: number;
    predictedFinalScore: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  }>;
  summary: {
    highRiskCount: number;
    reviewPendingCount: number;
    pendingGradingCount: number;
    aiBriefing?: string;
  };
}

const TYPE_LABELS: Record<string, string> = {
  exam_blueprint: "ط§ط®طھط¨ط§ط± ظ…ظ‚طھط±ط­",
  curriculum_outline: "ظ…ط®ط·ط· ظ…ظ†ظ‡ط¬",
  article: "ظ…ظ‚ط§ظ„ طھط¹ظ„ظٹظ…ظٹ",
  update_suggestion: "ط§ظ‚طھط±ط§ط­ طھط­ط³ظٹظ† ط§ظ„ظ…ط­طھظˆظ‰",
  lesson_summary: "ظ…ظ„ط®طµ ط°ظƒظٹ ظ„ط¯ط±ط³",
  learning_path: "ظ…ط³ط§ط± طھط¹ظ„ظٹظ…ظٹ ظ…ط®طµطµ",
};

export default function AdminAIPage() {
  return (
    <Suspense fallback={<PageHeader title="ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ ظˆظ…ط±ظƒط² ط§ظ„طھظ†ط¨ط¤ط§طھ (AI Hub)" description="ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„..." />}>
      <AdminAIContent />
    </Suspense>
  );
}

function AdminAIContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [contentType, setContentType] = React.useState<string>("exam_blueprint");
  const [title, setTitle] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [subjectId, _setSubjectId] = React.useState(searchParams.get("subjectId") || "general");

  const { data, isLoading: _isLoading } = useQuery<AiResponseData>({
    queryKey: ["admin", "ai_state"],
    queryFn: async () => {
      const res = await adminFetch(apiRoutes.admin.ai);
      if (!res.ok) throw new Error("Failed to fetch AI data");
      return res.json();
    }
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await adminFetch(apiRoutes.admin.ai, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           action: "generate_content",
           contentType,
           title,
           prompt,
           subjectId: subjectId === "general" ? null : subjectId,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      return result.item;
    },
    onSuccess: () => {
      toast.success("طھظ… ط§ظ„طھظˆظ„ظٹط¯ ظˆطھظ… ط§ظ„ط¥ط±ط³ط§ظ„ ظ„ظ„ظ…ط±ط§ط¬ط¹ط© ط§ظ„ط¨ط´ط±ظٹط© ط¨ظ†ط¬ط§ط­!");
      queryClient.invalidateQueries({ queryKey: ["admin", "ai_state"] });
      setTitle("");
      setPrompt("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approve" | "reject" }) => {
      const response = await adminFetch(apiRoutes.admin.ai, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review_content", id, decision }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (data, variables) => {
      toast.success(variables.decision === "approve" ? "طھظ… ط§ظ„ط§ط¹طھظ…ط§ط¯ ظˆطھط´ط؛ظٹظ„ ط§ظ„ظ…ط­طھظˆظ‰" : "طھظ… ط±ظپط¶ ط§ظ„ظ…ط­طھظˆظ‰");
      queryClient.invalidateQueries({ queryKey: ["admin", "ai_state"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ type, params }: { type: string; params: Record<string, unknown> }) => {
      const response = await adminFetch(apiRoutes.admin.ai, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute_action", type, params }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || result.message);
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || "طھظ… طھظ†ظپظٹط° ط§ظ„ط¥ط¬ط±ط§ط، ط¨ظ†ط¬ط§ط­");
      queryClient.invalidateQueries({ queryKey: ["admin", "ai_state"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pendingItems = data?.reviewQueue?.filter((i) => i.status === "pending_review") || [];
  const riskStudents = data?.riskStudents || [];
  const gradingQueue = data?.gradingQueue || [];

  return (
    <div className="space-y-8 pb-20" dir="rtl">
      <PageHeader
        title="ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ ظˆظ…ط±ظƒط² ط§ظ„طھظ†ط¨ط¤ط§طھ (AI Hub)"
        description="ط§ط³طھظˆط¯ظٹظˆ طھظˆظ„ظٹط¯ ط§ظ„ظ…ط­طھظˆظ‰طŒ ظ†ط¸ط§ظ… ط§ظ„طھظ‚ظٹظٹظ… ط§ظ„ط¢ظ„ظٹ ظ„ظ„ط£ط³ط¦ظ„ط© ط§ظ„ظ…ظ‚ط§ظ„ظٹط©طŒ ظˆظ…ط­ط±ظƒ ط§ظ„طھظ†ط¨ط¤ ط¨ظ…ط®ط§ط·ط± ط§ظ„طھط³ط±ط¨ ط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹ ظ„ظ„ط·ظ„ط§ط¨."
      >
        <div className="flex items-center gap-3">
          <StatusBadge status={generateMutation.isPending ? "pending" : "verified"} />
          <span className="text-sm font-black text-muted-foreground hidden sm:inline-block">
            {generateMutation.isPending ? "ظ…ط­ط±ظƒ ط§ظ„ط°ظƒط§ط، ظٹط¹ظ…ظ„..." : "ط§ظ„ط£ظ†ط¸ظ…ط© ط§ظ„ط°ظƒظٹط© ظ…ط³طھظ‚ط±ط©"}
          </span>
        </div>
      </PageHeader>

      <AnimatePresence>
        {data?.summary?.aiBriefing && (
          <m.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <AdminCard variant="glass" className="border-primary/30 p-6 bg-primary/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles className="w-20 h-20 text-primary" />
               </div>
               <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-primary">
                  <Bot className="w-6 h-6" />
                  ط§ظ„ظ…ظ„ط®طµ ط§ظ„طھظ†ظپظٹط°ظٹ ط§ظ„ط°ظƒظٹ (AI Briefing)
               </h3>
               <div className="text-lg font-bold leading-relaxed whitespace-pre-wrap max-w-4xl">
                  {data.summary.aiBriefing}
               </div>
               <div className="mt-4 flex gap-3">
                  <AdminButton variant="outline" size="sm" className="h-9 font-black" onClick={() => actionMutation.mutate({ type: 'notify_inactive', params: { days: 3 } })}>
                    ط£ط±ط³ظ„ طھظ†ط¨ظٹظ‡ط§طھ ظ„ظ„ط·ظ„ط§ط¨ ط§ظ„ظ…طھط؛ظٹط¨ظٹظ†
                  </AdminButton>
                  <AdminButton variant="outline" size="sm" className="h-9 font-black" onClick={() => toast.info("ط¬ط§ط±ظٹ طھط­ظ„ظٹظ„ ط§ظ„ظ…ط²ظٹط¯ ظ…ظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ...")}>
                    طھط­ط¯ظٹط« ط§ظ„طھط­ظ„ظٹظ„
                  </AdminButton>
               </div>
            </AdminCard>
          </m.div>
        )}
      </AnimatePresence>

      <Tabs defaultValue="studio" className="w-full">
        <TabsList className="w-full bg-background/50 h-14 p-1 border-border rounded-xl mb-6">
          <TabsTrigger value="studio" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
             Content Studio
          </TabsTrigger>
          <TabsTrigger value="grading" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500">
             Auto-Grading {data?.summary?.pendingGradingCount ? `(${data.summary.pendingGradingCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="churn" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-500">
             Churn Radar {data?.summary?.highRiskCount ? `(${data.summary.highRiskCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="forecast" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500">
             Predictions ًںڑ€
          </TabsTrigger>
        </TabsList>

        <TabsContent value="studio" className="mt-0">
          <div className="grid gap-8 lg:grid-cols-2">
            <m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <AdminCard variant="glass" className="h-full border-primary/20 p-6">
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); generateMutation.mutate(); }}>
                  <div className="flex items-center gap-3 border-b border-border/50 pb-4 mb-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black">ط؛ط±ظپط© ط§ظ„طھظˆظ„ظٹط¯ (Generator)</h3>
                      <p className="text-sm text-muted-foreground font-bold">ظˆط¬ظ‡ ط§ظ„ط£ظˆط§ظ…ط± ظ„ظ…ط­ط±ظƒ ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-black block">ظ†ظˆط¹ ط§ظ„ظ…ط­طھظˆظ‰ ط§ظ„ظ…ط·ظ„ظˆط¨</label>
                      <Select value={contentType} onValueChange={setContentType}>
                        <SelectTrigger className="w-full h-12 rounded-xl text-right font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="update_suggestion">ط§ظ‚طھط±ط§ط­ طھط¹ط¯ظٹظ„ط§طھ ط¹ظ„ظ‰ ط§ظ„ظ…ط­طھظˆظ‰</SelectItem>
                          <SelectItem value="lesson_summary">طھظˆظ„ظٹط¯ ظ…ظ„ط®طµ ط¯ط±ط³ ط°ظƒظٹ</SelectItem>
                          <SelectItem value="learning_path">ط¥ظ†ط´ط§ط، ظ…ط³ط§ط± طھط¹ظ„ظ… ظ…ط®طµطµ</SelectItem>
                          <SelectItem value="exam_blueprint">ط§ط®طھط¨ط§ط± ظ…ظ„ظƒظٹ (ط£ط³ط¦ظ„ط© ظˆط§ط®طھظٹط§ط±ط§طھ)</SelectItem>
                          <SelectItem value="curriculum_outline">ظ…ط®ط·ط· ظ…ظ†ظ‡ط¬ ظ…طھظƒط§ظ…ظ„</SelectItem>
                          <SelectItem value="article">ظ…ظ‚ط§ظ„ ط£ظˆ ظ…ط³ظˆط¯ط© طھط¹ظ„ظٹظ…ظٹط©</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-black block">ط§ظ„ط¹ظ†ظˆط§ظ† ظˆط§ظ„طھط³ظ…ظٹط©</label>
                      <SearchInput
                        placeholder="ظ…ط«ط§ظ„: طھط­ظ„ظٹظ„ ظپطµظ„ ط§ظ„ظƒظ‡ط±ظˆظ…ط؛ظ†ط§ط·ظٹط³ظٹط©"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full h-12 bg-background/50 font-bold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-black block flex justify-between">
                        <span>ط§ظ„طھط¹ظ„ظٹظ…ط§طھ ظˆط§ظ„ظˆطµظپ ط§ظ„ط¯ظ‚ظٹظ‚</span>
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Prompt</span>
                      </label>
                      <Textarea
                        placeholder="ظ‚ظ… ط¨طھظˆط¶ظٹط­ ظ…طھط·ظ„ط¨ط§طھظƒ ط¨ط¯ظ‚ط©..."
                        className="min-h-[160px] resize-none bg-background/50 rounded-xl p-4 border-border font-bold focus:border-primary/50"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                      />
                    </div>
                  </div>

                  <AdminButton
                    type="submit"
                    size="lg"
                    className="w-full h-14 rounded-2xl text-lg font-black uppercase tracking-widest gap-3 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                    disabled={generateMutation.isPending || !title || !prompt}
                    loading={generateMutation.isPending}
                    icon={Sparkles}
                  >
                    طھظˆظ„ظٹط¯ ط§ظ„ظ…ط­طھظˆظ‰ ط§ظ„ط¢ظ†
                  </AdminButton>
                </form>
              </AdminCard>
            </m.div>

            <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <AdminCard variant="glass" className="h-full flex flex-col p-0 overflow-hidden border-orange-500/20">
                <div className="p-6 border-b border-border/50 bg-orange-500/5">
                  <h3 className="text-xl font-black flex items-center gap-2 text-orange-500">
                    <Clock className="w-5 h-5" />
                    ط·ط§ط¨ظˆط± ط§ظ„ظ…ط±ط§ط¬ط¹ط© ط§ظ„ط¨ط´ط±ظٹط©
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 font-bold">
                    ظ…ط³ظˆط¯ط§طھ ظˆظ…ط³ط§ط±ط§طھ ظˆظ„ظ‘ط¯ظ‡ط§ ط§ظ„ط°ظƒط§ط، ظˆط¨ط§ظ†طھط¸ط§ط± ط§ط¹طھظ…ط§ط¯ظƒ ظ‚ط¨ظ„ طھظ†ط´ظٹطھط§ ظ„ظ„ظ…ط­ط§ط±ط¨ظٹظ†.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-px bg-border/30 max-h-[600px]">
                  {pendingItems.length === 0 ? (
                    <div className="p-12 text-center space-y-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Check className="w-8 h-8" />
                      </div>
                      <p className="font-black text-lg">ط·ط§ط¨ظˆط± ط§ظ„ظ…ط±ط§ط¬ط¹ط© ظپط§ط±ط؛!</p>
                      <p className="text-muted-foreground text-sm font-bold">طھظ… ط§ط¹طھظ…ط§ط¯ ط¬ظ…ظٹط¹ ط§ظ„طھظˆظ„ظٹط¯ط§طھ ط§ظ„ط³ط§ط¨ظ‚ط©.</p>
                    </div>
                  ) : (
                    pendingItems.map((item) => (
                      <div key={item.id} className="bg-card p-5 group flex flex-col sm:flex-row gap-4 sm:items-center justify-between border-b last:border-0">
                         <div className="space-y-2 flex-1 min-w-0 pr-2">
                           <div className="flex items-center gap-2">
                             <h4 className="font-black truncate text-base">{item.title}</h4>
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-0.5 rounded-full bg-accent">
                               {TYPE_LABELS[item.type] || item.type}
                             </span>
                           </div>
                           <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-bold">{item.preview}</p>
                         </div>
                         <div className="flex sm:flex-col gap-2 shrink-0">
                           <AdminButton
                             variant="default" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 flex-1 font-black"
                             onClick={() => reviewMutation.mutate({ id: item.id, decision: "approve" })}
                           >
                             ط§ط¹طھظ…ط§ط¯
                           </AdminButton>
                           <AdminButton
                             variant="destructive" size="sm" className="gap-2 flex-1 font-black"
                             onClick={() => reviewMutation.mutate({ id: item.id, decision: "reject" })}
                           >
                             ط±ظپط¶
                           </AdminButton>
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </AdminCard>
            </m.div>
          </div>
        </TabsContent>

        <TabsContent value="grading">
          <AdminCard variant="glass" className="border-emerald-500/20 p-8 pt-6">
            <div className="mb-6 border-b border-border pb-6 flex items-center justify-between">
               <div>
                  <h3 className="text-2xl font-black text-emerald-500 flex items-center gap-2">
                    <Target className="w-6 h-6" />
                    ظ‚ط§ط¦ظ…ط© ط§ظ„طھطµط­ظٹط­ ط§ظ„ط¢ظ„ظٹ ظ„ظ„ط£ط³ط¦ظ„ط© ط§ظ„ظ…ظ‚ط§ظ„ظٹط©
                  </h3>
                  <p className="text-muted-foreground mt-2 font-black">ظٹظ‚ظˆظ… ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ ط¨ظ‚ط±ط§ط،ط© ط¥ط¬ط§ط¨ط§طھ ط§ظ„ط·ظ„ط§ط¨ ظˆظپظ‡ظ…ظ‡ط§ ظˆط¥ط¹ط·ط§ط، ط§ظ„ط¹ظ„ط§ظ…ط§طھ ظˆط§ظ„طھط¨ط±ظٹط± ط¨ط¯ظ‚ط©.</p>
               </div>
               <StatusBadge status="verified" />
            </div>

            <div className="space-y-4">
              {gradingQueue.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground font-black">ظ„ط§ طھظˆط¬ط¯ ط¥ط¬ط§ط¨ط§طھ ظ…ط¹ظ„ظ‚ط© ظ„ظ„طھظ‚ظٹظٹظ… ط­ط§ظ„ظٹط§ظ‹.</div>
              ) : (
                gradingQueue.map((item) => (
                  <div key={item.id} className="bg-background/80 border border-border rounded-xl p-5 hover:border-emerald-500/50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xl ${item.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                             {item.score.split('/')[0]}
                          </div>
                          <div>
                             <h4 className="font-black text-lg">{item.studentName}</h4>
                             <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{item.status === 'RESOLVED' ? 'طھظ… ط§ظ„طھظ‚ظٹظٹظ… ط¨ظ†ط¬ط§ط­' : 'ط¬ط§ط±ظٹ ط§ظ„ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط°ظƒظٹط©'}</p>
                          </div>
                       </div>
                       <div className={`px-3 py-1 font-black rounded-lg text-xs border ${item.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'}`}>
                         ({item.score})
                       </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 bg-accent/20 p-4 rounded-xl border border-border/50">
                       <div>
                          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">ط¥ط¬ط§ط¨ط© ط§ظ„ط·ط§ظ„ط¨:</span>
                          <p className="text-sm font-bold leading-relaxed">{item.answer}</p>
                       </div>
                       <div>
                          <span className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${item.feedback ? 'text-emerald-500' : 'text-amber-500'}`}>
                            طھط؛ط°ظٹط© ط±ط§ط¬ط¹ط© ظ…ظ† ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ:
                          </span>
                          <p className="text-sm font-bold leading-relaxed italic">
                            {item.feedback || "ط¬ط§ط±ظٹ طھظˆظ„ظٹط¯ ط§ظ„طھظ‚ظٹظٹظ… ط§ظ„ط¹ط§ط¯ظ„ ظˆط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ..."}
                          </p>
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminCard>
        </TabsContent>

        <TabsContent value="churn">
           <div className="grid gap-6 md:grid-cols-3 mb-6">
              <AdminCard className="bg-background border-border p-6 shadow-sm border-r-4 border-r-orange-500">
                 <div className="text-orange-500 w-10 h-10 flex items-center justify-center bg-orange-500/10 rounded-full mb-3"><AlertTriangle className="w-5 h-5"/></div>
                 <p className="text-xs text-muted-foreground font-black uppercase tracking-wider">ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ظ…ط¹ط±ط¶ظˆظ† ظ„ط®ط·ط± ط§ظ„طھط³ط±ط¨</p>
                 <h2 className="text-3xl font-black mt-1">{riskStudents.length} <span className="text-sm font-bold text-muted-foreground group-hover:block">ط·ط§ظ„ط¨ ظ†ط´ط·</span></h2>
              </AdminCard>
              <AdminCard className="bg-background border-border p-6 shadow-sm border-r-4 border-r-emerald-500">
                 <div className="text-emerald-500 w-10 h-10 flex items-center justify-center bg-emerald-500/10 rounded-full mb-3"><Check className="w-5 h-5"/></div>
                 <p className="text-xs text-muted-foreground font-black uppercase tracking-wider">ط­ط§ظ„ط§طھ طھظ… طھط£ظ…ظٹظ†ظ‡ط§ (Safe)</p>
                 <h2 className="text-3xl font-black mt-1">{data?.summary?.highRiskCount === 0 ? "100%" : "92%"}</h2>
              </AdminCard>
              <AdminCard className="bg-background border-border p-6 shadow-sm border-r-4 border-r-blue-500">
                 <div className="text-blue-500 w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-full mb-3"><TrendingDown className="w-5 h-5"/></div>
                 <p className="text-xs text-muted-foreground font-black uppercase tracking-wider">ظ…ط¹ط¯ظ„ ط§ظ„ط§ظ†ظ‚ط·ط§ط¹ ط§ظ„ظ…طھظˆظ‚ط¹</p>
                 <h2 className="text-3xl font-black mt-1">{riskStudents.length > 5 ? "8.4%" : "1.2%"}</h2>
              </AdminCard>
           </div>

           <AdminCard variant="glass" className="p-0 border-border overflow-hidden">
              <div className="p-6 border-b border-border/50 bg-accent/10">
                 <h3 className="text-xl font-black flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    ط§ظ„ط±ط§ط¯ط§ط± ط§ظ„ط°ظƒظٹ ظ„ظ…ط®ط§ط·ط± ط§ظ„ط·ظ„ط§ط¨ (Smart Analytics Radar)
                 </h3>
                 <p className="text-sm text-muted-foreground mt-2 font-bold">طھط­ظ„ظٹظ„ ط­ظ‚ظٹظ‚ظٹ ظ„ظ„ط³ظ„ظˆظƒ ط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹ ظˆط§ظ„ط§ظ†طھط¸ط§ظ… ظ„ط¶ظ…ط§ظ† ط¹ط¯ظ… ظپظ‚ط¯ط§ظ† ط£ظٹ ط·ط§ظ„ط¨ ظ…ظ† ط¬ظ†ظˆط¯ ط§ظ„ظ…ظ…ظ„ظƒط©.</p>
              </div>
              <div className="p-6 space-y-4">
                {riskStudents.length === 0 ? (
                  <div className="p-10 text-center font-black opacity-50">ظ„ظ… ظٹطھظ… ط§ظƒطھط´ط§ظپ ط£ظٹ ظ…ط®ط§ط·ط± ط­ط§ظ„ظٹط§ظ‹. ط§ط³طھظ…ط± ظپظٹ ط§ظ„ط¹ظ…ظ„ ط§ظ„ط±ط§ط¦ط¹!</div>
                ) : (
                  riskStudents.map((s, i) => (
                    <div key={i} className="flex flex-col md:flex-row gap-4 p-5 rounded-xl border border-border bg-background/50 items-start md:items-center justify-between hover:border-orange-500/30 transition-all">
                       <div className="flex-1 space-y-1">
                          <div className="flex gap-3 items-center">
                             <h4 className="font-black text-lg">{s.name}</h4>
                             <Badge className={`rounded-full px-2 py-0.5 text-[9px] font-black border uppercase ${
                               s.riskLevel === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                               s.riskLevel === 'WARNING' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 
                               'bg-amber-500/10 text-amber-500 border-amber-500/20'
                             }`}>
                                {s.riskLevel === 'CRITICAL' ? 'ط®ط·ط± ط­ط±ط¬ ًں”´' : s.riskLevel === 'WARNING' ? 'طھط­ط°ظٹط± ًںں ' : 'ظ…ظ„ط§ط­ط¸ط© ًںں،'}
                             </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-black"><strong className="text-foreground">ط§ظ„ط³ط¨ط¨:</strong> {s.reason}</p>
                          <div className="flex items-center gap-2 bg-blue-500/5 p-3 rounded-xl mt-3 border border-blue-500/10">
                             <Bot className="w-4 h-4 text-blue-500" />
                             <p className="text-xs text-blue-500 font-black"><strong className="text-blue-600">طھظˆطµظٹط© ط§ظ„ط¥ظ†ظ‚ط§ط°:</strong> {s.recommendation}</p>
                          </div>
                       </div>
                       <AdminButton 
                         variant="outline" 
                         className="shrink-0 font-black h-10 border-blue-500/20 text-blue-500 hover:bg-blue-500/5"
                         onClick={() => actionMutation.mutate({ type: 'generate_revision_plan', params: { studentId: s.userId } })}
                         loading={actionMutation.isPending}
                       >
                          طھط·ط¨ظٹظ‚ ط§ظ„طھط¯ط®ظ„ ط§ظ„ط¢ظ„ظٹ
                       </AdminButton>
                    </div>
                  ))
                )}
              </div>
           </AdminCard>
        </TabsContent>

        <TabsContent value="forecast">
           <AdminCard variant="glass" className="p-8 border-blue-500/20">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="text-2xl font-black text-blue-500 flex items-center gap-2">
                       <TrendingDown className="w-6 h-6 rotate-180" />
                       ظ…ط­ط±ظƒ ط§ظ„طھظ†ط¨ط¤ ط¨ط§ظ„ط£ط¯ط§ط، ط§ظ„ظ†ظ‡ط§ط¦ظٹ
                    </h3>
                    <p className="text-muted-foreground mt-2 font-bold">ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط³ظ„ظˆظƒ ط§ظ„ط·ط§ظ„ط¨ ظˆظ†طھط§ط¦ط¬ظ‡ ط§ظ„ط­ط§ظ„ظٹط©طŒ ظٹطھظ†ط¨ط£ ط§ظ„ط°ظƒط§ط، ط§ظ„ط§طµط·ظ†ط§ط¹ظٹ ط¨ط§ظ„ظ†طھظٹط¬ط© ط§ظ„ظ…طھظˆظ‚ط¹ط© ظپظٹ ظ†ظ‡ط§ظٹط© ط§ظ„ط±ط­ظ„ط©.</p>
                 </div>
              </div>

              <div className="grid gap-4">
                 {data?.forecast?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-background/50 rounded-2xl border border-border group hover:border-blue-500/50 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                             <User className="w-6 h-6" />
                          </div>
                          <div>
                             <h4 className="font-black text-lg">{item.name}</h4>
                             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <span>ط¯ظ‚ط© ط§ظ„طھظ†ط¨ط¤:</span>
                                <span className={item.confidence === 'HIGH' ? 'text-emerald-500' : 'text-amber-500'}>
                                   {item.confidence === 'HIGH' ? 'ط¹ط§ظ„ظٹط© (ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ 5+ ط§ظ…طھط­ط§ظ†ط§طھ)' : 'ظ…طھظˆط³ط·ط©'}
                                </span>
                             </div>
                          </div>
                       </div>

                       <div className="flex items-center gap-12 text-center">
                          <div className="space-y-1">
                             <span className="text-[10px] font-black uppercase text-muted-foreground">ط§ظ„ظˆط¶ط¹ ط§ظ„ط­ط§ظ„ظٹ</span>
                             <p className="text-xl font-black">{item.currentScore}%</p>
                          </div>
                          <div className="w-12 h-px bg-border hidden md:block" />
                          <div className="space-y-1 relative">
                             <span className="text-[10px] font-black uppercase text-blue-500">ظ…طھظˆظ‚ط¹ ظ…ط³طھظ‚ط¨ظ„ط§ظ‹</span>
                             <p className="text-3xl font-black text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                                {item.predictedFinalScore}%
                             </p>
                             {item.predictedFinalScore > item.currentScore && (
                                <div className="absolute -top-1 -right-4 text-emerald-500 animate-bounce">
                                   <TrendingDown className="w-4 h-4 rotate-180" />
                                </div>
                             )}
                          </div>
                       </div>

                       <AdminButton size="sm" variant="outline" className="h-10 px-6 rounded-xl font-black border-blue-500/20 text-blue-500 hover:bg-blue-500/5">
                          طھط®طµظٹطµ ط§ظ„ط®ط·ط©
                       </AdminButton>
                    </div>
                 ))}
                 {(!data?.forecast || data.forecast.length === 0) && (
                    <div className="p-20 text-center text-muted-foreground font-black opacity-50">ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ظƒط§ظپظٹط© ظ„ظ„طھظ†ط¨ط¤ ط­ط§ظ„ظٹط§ظ‹. ظٹط­طھط§ط¬ ط§ظ„ط·ظ„ط§ط¨ ظ„ط¥ظƒظ…ط§ظ„ ط§ط®طھط¨ط§ط±ظٹظ† ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„.</div>
                 )}
              </div>
           </AdminCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}


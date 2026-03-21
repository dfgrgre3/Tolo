"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
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
import { Sparkles, Check, X, Eye, FileText, Target, BookOpen, Clock, Bot, Cpu, AlertTriangle, TrendingDown, ArrowUpRight, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

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
  publishedEntityType?: string | null;
  publishedEntityId?: string | null;
}

interface AiResponseData {
  success: boolean;
  subjects: Subject[];
  reviewQueue: ReviewItem[];
  publishedDetail?: any;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  exam_blueprint: Target,
  curriculum_outline: BookOpen,
  article: FileText,
  update_suggestion: Sparkles,
  lesson_summary: AlignLeftIcon,
  learning_path: GraduationCap
};

const TYPE_LABELS: Record<string, string> = {
  exam_blueprint: "اختبار مقترح",
  curriculum_outline: "مخطط منهج",
  article: "مقال تعليمي",
  update_suggestion: "اقتراح تحسين المحتوى",
  lesson_summary: "ملخص ذكي لدرس",
  learning_path: "مسار تعليمي مخصص",
};

function AlignLeftIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/>
    </svg>
  );
}

export default function AdminAIPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [contentType, setContentType] = React.useState<string>("exam_blueprint");
  const [title, setTitle] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("general");
  const highlightedItemId = searchParams.get("item");

  const { data, isLoading } = useQuery<AiResponseData>({
    queryKey: ["admin", "ai_state"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ai`);
      if (!res.ok) throw new Error("Failed to fetch AI data");
      return res.json();
    },
    refetchInterval: 15 * 60 * 1000,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/ai", {
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
      toast.success("تم التوليد وتم الإرسال للمراجعة البشرية بنجاح!");
      queryClient.invalidateQueries({ queryKey: ["admin", "ai_state"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approve" | "reject" }) => {
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review_content", id, decision }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (data, variables) => {
      toast.success(variables.decision === "approve" ? "تم الاعتماد وتشغيل المحتوى" : "تم رفض المحتوى");
      queryClient.invalidateQueries({ queryKey: ["admin", "ai_state"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const generateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !prompt) return toast.error("يرجى ملء جميع الحقول.");
    generateMutation.mutate();
  };

  const pendingItems = data?.reviewQueue?.filter((i) => i.status === "pending_review") || [];

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="الذكاء الاصطناعي ومركز التنبؤات (AI Hub)"
        description="استوديو توليد المحتوى، نظام التقييم الآلي للأسئلة المقالية، ومحرك التنبؤ بمخاطر التسرب الأكاديمي للطلاب."
      >
        <div className="flex items-center gap-3">
          <StatusBadge status={generateMutation.isPending ? "pending" : "verified"} />
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
            {generateMutation.isPending ? "محرك الذكاء يعمل..." : "الأنظمة الذكية مستقرة"}
          </span>
        </div>
      </PageHeader>

      <Tabs defaultValue="studio" className="w-full">
        <TabsList className="w-full bg-background/50 h-14 p-1 border-border rounded-xl mb-6">
          <TabsTrigger value="studio" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
             استوديو المحتوى والذكاء (Content Studio)
          </TabsTrigger>
          <TabsTrigger value="grading" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500">
             التقييم الآلي المتقدم (AI Auto-Grading)
          </TabsTrigger>
          <TabsTrigger value="churn" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-500">
             التنبؤ بمخاطر التسرب (Churn Prediction)
          </TabsTrigger>
        </TabsList>

        {/* =======================
            CONTENT STUDIO TAB 
            ======================= */}
        <TabsContent value="studio" className="mt-0">
          <div className="grid gap-8 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <AdminCard variant="glass" className="h-full border-primary/20">
                <form onSubmit={generateSubmit} className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-border/50 pb-4 mb-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black">غرفة التوليد (Generator)</h3>
                      <p className="text-sm text-muted-foreground">وجه الأوامر لمحرك الذكاء الاصطناعي</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold block">نوع المحتوى المطلوب <span className="text-destructive">*</span></label>
                      <Select value={contentType} onValueChange={setContentType}>
                        <SelectTrigger className="w-full h-12 rounded-xl text-right">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="update_suggestion">اقتراح تعديلات على المحتوى (بناءً على أخطاء الطلاب)</SelectItem>
                          <SelectItem value="lesson_summary">توليد ملخص درس ذكي تلقائياً</SelectItem>
                          <SelectItem value="learning_path">إنشاء مسار تعلم مخصص (Personalized Path)</SelectItem>
                          <SelectItem value="exam_blueprint">اختبار ملكي (أسئلة واختيارات متعددة)</SelectItem>
                          <SelectItem value="curriculum_outline">مخطط منهج متكامل (وحدات وأهداف)</SelectItem>
                          <SelectItem value="article">مقال أو مسودة تعليمية (نص حر)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold block">العنوان والتسمية <span className="text-destructive">*</span></label>
                      <SearchInput
                        placeholder="مثال: تخصيص مسار علاجي لطلاب الفيزياء"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full h-12 bg-background/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold block flex justify-between">
                        <span>التعليمات والوصف الدقيق <span className="text-destructive">*</span></span>
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Prompt</span>
                      </label>
                      <Textarea
                        placeholder="قم بتوضيح متطلباتك بدقة للذكاء الاصطناعي..."
                        className="min-h-[160px] resize-none bg-background/50 rounded-xl p-4 border-border font-medium focus:border-primary/50"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <AdminButton
                      type="submit"
                      size="lg"
                      className="w-full h-14 rounded-2xl text-lg font-black uppercase tracking-widest gap-3 shadow-[0_0_20px_rgba(var(--primary),0.3)] group"
                      disabled={generateMutation.isPending}
                      icon={generateMutation.isPending ? Cpu : Sparkles}
                      loading={generateMutation.isPending}
                    >
                      {generateMutation.isPending ? "جاري المعالجة..." : "توليد المحتوى الآن"}
                    </AdminButton>
                  </div>
                </form>
              </AdminCard>
            </motion.div>

            {/* Human in the loop Panel */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <AdminCard variant="glass" className="h-full flex flex-col p-0 overflow-hidden border-orange-500/20">
                <div className="p-6 border-b border-border/50 bg-orange-500/5">
                  <h3 className="text-xl font-black flex items-center gap-2 text-orange-500">
                    <Clock className="w-5 h-5" />
                    طابور المراجعة البشرية (Human-in-the-Loop)
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    مسودات ومسارات ولّدها الذكاء وبانتظار اعتمادك قبل تنشيطها للمحاربين.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-px bg-border/30 max-h-[600px]">
                  {pendingItems.length === 0 ? (
                    <div className="p-12 text-center space-y-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Check className="w-8 h-8" />
                      </div>
                      <p className="font-bold text-lg">طابور المراجعة فارغ!</p>
                      <p className="text-muted-foreground text-sm">تم اعتماد أو رفض جميع التوليدات السابقة.</p>
                    </div>
                  ) : (
                    pendingItems.map((item) => (
                      <div key={item.id} className="bg-card p-5 group flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                         <div className="space-y-2 flex-1 min-w-0 pr-2">
                           <div className="flex items-center gap-2">
                             <h4 className="font-bold truncate text-base">{item.title}</h4>
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-0.5 rounded-full bg-accent">
                               {TYPE_LABELS[item.type] || item.type}
                             </span>
                           </div>
                           <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-medium">{item.preview}</p>
                         </div>
                         <div className="flex sm:flex-col gap-2 shrink-0">
                           <AdminButton
                             variant="default" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 flex-1"
                             onClick={() => reviewMutation.mutate({ id: item.id, decision: "approve" })}
                           >
                             <Check className="w-4 h-4" />اعتماد
                           </AdminButton>
                           <AdminButton
                             variant="destructive" size="sm" className="gap-2 flex-1"
                             onClick={() => reviewMutation.mutate({ id: item.id, decision: "reject" })}
                           >
                             <X className="w-4 h-4" />رفض
                           </AdminButton>
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </AdminCard>
            </motion.div>
          </div>
        </TabsContent>

        {/* =======================
            AUTO GRADING TAB
            ======================= */}
        <TabsContent value="grading">
          <AdminCard variant="glass" className="border-emerald-500/20 p-8 pt-6">
            <div className="mb-6 border-b border-border pb-6 flex items-center justify-between">
               <div>
                  <h3 className="text-2xl font-black text-emerald-500 flex items-center gap-2">
                    <Target className="w-6 h-6" />
                    قائمة التصحيح الآلي للأسئلة المقالية
                  </h3>
                  <p className="text-muted-foreground mt-2 font-medium">يقوم الذكاء الاصطناعي بقراءة إجابات الطلاب وفهمها وإعطاء العلامات والتبرير (Feedback) بدقة تضاهي المدرسين.</p>
               </div>
               <StatusBadge status="verified" />
            </div>

            <div className="space-y-4">
              {/* Mock Graded Item 1 */}
              <div className="bg-background/80 border border-border rounded-xl p-5 hover:border-emerald-500/50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xl">8</div>
                      <div>
                         <h4 className="font-bold text-lg">أحمد محمود - الطالب</h4>
                         <p className="text-xs text-muted-foreground">تاريخ الجواب: منذ ساعتين</p>
                      </div>
                   </div>
                   <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 font-bold rounded-lg text-sm border border-emerald-500/20">
                     تم التقييم بنجاح (8/10)
                   </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6 bg-accent/20 p-4 rounded-xl border border-border/50">
                   <div>
                      <span className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-1 block">إجابة الطالب:</span>
                      <p className="text-sm font-medium leading-relaxed">سبب تمدد المعادن بالحرارة هو زيادة سرعة الإلكترونات داخل النواة مما يؤدي لتباعدها قليلاً.</p>
                   </div>
                   <div>
                      <span className="text-xs font-black uppercase text-emerald-500 tracking-widest mb-1 block">تغذية راجعة من الذكاء الاصطناعي:</span>
                      <p className="text-sm font-medium text-emerald-500/90 leading-relaxed">إجابتك جيدة وتدل على الفهم، لكن الخطأ يكمن في قولك (في النواة). التمدد يحدث نتيجة لزيادة السعة الاهتزازية للذرات ككل وليس الإلكترونات في النواة. خصم 2 درجة بسبب عدم الدقة العلمية.</p>
                   </div>
                </div>
                <div className="mt-4 flex gap-3">
                   <AdminButton variant="outline" size="sm" className="font-bold">تعديل الدرجة يدوياً</AdminButton>
                   <AdminButton variant="outline" size="sm" className="font-bold">إعادة إرسال للتقييم</AdminButton>
                </div>
              </div>

              {/* Mock Pending Item */}
              <div className="bg-background/80 border border-border rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 bg-amber-500 h-full"></div>
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
                      <div>
                         <h4 className="font-bold text-lg">سارة إبراهيم - الطالبة</h4>
                         <p className="text-xs text-muted-foreground">جاري التقييم الآلي الآن...</p>
                      </div>
                   </div>
                   <div className="px-3 py-1 bg-amber-500/10 text-amber-500 font-bold rounded-lg text-sm border border-amber-500/20">
                     قيد التقييم (؟/10)
                   </div>
                </div>
                <div className="bg-accent/20 p-4 rounded-xl border border-border/50">
                   <span className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-1 block">إجابة الطالب:</span>
                   <p className="text-sm font-medium leading-relaxed">الخلية النباتية تحتوي على جدار خلوي يعطيها الصلابة بعكس الخلية الحيوانية.</p>
                </div>
              </div>

            </div>
          </AdminCard>
        </TabsContent>

        {/* =======================
            CHURN PREDICTION TAB
            ======================= */}
        <TabsContent value="churn">
          <div className="grid gap-6 md:grid-cols-3 mb-6">
             <AdminCard className="bg-background border-border p-6 shadow-sm border-l-4 border-l-orange-500">
                <span className="text-orange-500 w-10 h-10 flex items-center justify-center bg-orange-500/10 rounded-full mb-3"><AlertTriangle className="w-5 h-5"/></span>
                <p className="text-sm text-muted-foreground font-bold">الطلاب المعرضون لخطر التسرب</p>
                <h2 className="text-3xl font-black mt-1">42 <span className="text-sm font-medium text-muted-foreground">طالب</span></h2>
             </AdminCard>
             <AdminCard className="bg-background border-border p-6 shadow-sm border-l-4 border-l-emerald-500">
                <span className="text-emerald-500 w-10 h-10 flex items-center justify-center bg-emerald-500/10 rounded-full mb-3"><Check className="w-5 h-5"/></span>
                <p className="text-sm text-muted-foreground font-bold">تم إنقاذهم هذا الأسبوع بالتدخل الآلي</p>
                <h2 className="text-3xl font-black mt-1">15 <span className="text-sm font-medium text-muted-foreground">طالب</span></h2>
             </AdminCard>
             <AdminCard className="bg-background border-border p-6 shadow-sm">
                <span className="text-blue-500 w-10 h-10 flex items-center justify-center bg-blue-500/10 rounded-full mb-3"><TrendingDown className="w-5 h-5"/></span>
                <p className="text-sm text-muted-foreground font-bold">معدل الانقطاع المتوقع (Prediction)</p>
                <h2 className="text-3xl font-black mt-1">3.2% <span className="text-sm font-medium text-muted-foreground">الشهر القادم</span></h2>
             </AdminCard>
          </div>

          <AdminCard variant="glass" className="p-0 border-border overflow-hidden">
             <div className="p-6 border-b border-border/50 bg-accent/10">
                <h3 className="text-xl font-black flex items-center gap-2">
                   <AlertTriangle className="w-5 h-5 text-orange-500" />
                   الرادار الذكي لمخاطر الطلاب (Smart Analytics Radar)
                </h3>
                <p className="text-sm text-muted-foreground mt-2">يقوم الذكاء الاصطناعي بتحليل سرعة حل الطالب، تغيبه المستمر، وضعف درجاته ليستنتج إمكانية انقطاعه قريباً أو حاجته للمساعدة لتقترح عليك خطوات الإنقاذ.</p>
             </div>
             <div className="p-6 space-y-4">
                {[
                   { name: "محمد ياسر", risk: "أحمر (خطر جداً)", reason: "تغيب 8 أيام متتالية وانخفاض 40% في درجات الاختبارات الأخيرة.", ai_rec: "إرسال رسالة دعم تحفيزية شخصية وإعطائه كوبون خصم لدرس مراجعة مجاني." },
                   { name: "لمياء شكري", risk: "برتقالي (تحذير)", reason: "تفتح الفيديوهات وتقفلها بعد 3 دقائق، تدل على عدم الفهم.", ai_rec: "توليد مسار دراسي أخف وإرسال ملفات PDF بدلاً من الفيديوهات الطويلة." },
                   { name: "كريم مجدي", risk: "أصفر (ملاحظة)", reason: "تراجع ترتيبه في المواسم، وفشل في اجتياز 3 تحديات متتالية.", ai_rec: "تشغيل أتمتة الرسائل التحفيزية (Zapier Action) لإضافته في جروب التحديات السهلة لاستعادة ثقته." },
                ].map((s, i) => (
                   <div key={i} className="flex flex-col md:flex-row gap-4 p-5 rounded-xl border border-border bg-background/50 items-start md:items-center justify-between">
                      <div className="flex-1 space-y-1">
                         <div className="flex gap-2 items-center">
                            <h4 className="font-bold text-lg">{s.name}</h4>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${s.risk.includes('أحمر') ? 'bg-red-500/10 text-red-500' : s.risk.includes('برتقالي') ? 'bg-orange-500/10 text-orange-500' : 'bg-yellow-500/10 text-yellow-600'}`}>
                               {s.risk}
                            </span>
                         </div>
                         <p className="text-sm text-muted-foreground font-medium"><strong className="text-foreground">السبب المكتشف ذكياً:</strong> {s.reason}</p>
                         <p className="text-sm text-blue-500 font-medium bg-blue-500/10 p-2 rounded-lg mt-2 inline-block"><strong className="text-blue-600">توصية الإنقاذ (AI Plan):</strong> {s.ai_rec}</p>
                      </div>
                      <div className="shrink-0 flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                         <AdminButton variant="default" className="w-full md:w-auto px-6 whitespace-nowrap bg-blue-500 hover:bg-blue-600 font-bold shadow-md shadow-blue-500/20">
                            تطبيق خطة الإنقاذ فوراً
                         </AdminButton>
                      </div>
                   </div>
                ))}
             </div>
          </AdminCard>
        </TabsContent>

      </Tabs>
    </div>
  );
}

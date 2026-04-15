"use client";

import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageSquareText, Zap, Users, Send, Loader2, Sparkles, ChevronRight, ChevronLeft, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RoyalEditor } from "./royal-editor";
import { RoyalChannels } from "./royal-channels";
import { RoyalTemplates } from "./royal-templates";
import { RoyalPreview } from "./royal-preview";
import { RoyalAudience } from "./royal-audience";
import { UserModel, RoyalMessageFormData, MessageTemplate } from "./types";

interface RoyalCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserModel[];
}

type Step = "templates" | "editor" | "audience" | "preview";

const STEPS: { id: Step; label: string; icon: any; description: string }[] = [
  { id: "templates", label: "المخطوطات القديمة", icon: LayoutGrid, description: "اختر قالباً ملكياً قديماً كقاعدة لمرسومك" },
  { id: "editor", label: "تنسيق المرسوم", icon: MessageSquareText, description: "اضف حكمتك الملكية وحدد مسارات الإرسال" },
  { id: "audience", label: "جيش المملكة", icon: Users, description: "تحقق من المحاربين المستهدفين لهذا المرسوم" },
  { id: "preview", label: "تجلّي الحكم", icon: Zap, description: "عاين هيبة المرسوم قبل البث النهائي للإمبراطورية" },
];

export function RoyalCallModal({ open, onOpenChange, users }: RoyalCallModalProps) {
  const [activeStep, setActiveStep] = useState<Step>("templates");
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("custom");

  const [formData, setFormData] = useState<RoyalMessageFormData>({
    title: "",
    message: "",
    type: "info",
    actionUrl: "",
    channels: {
      app: true,
      email: false,
      sms: false,
    },
  });

  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleChannel = useCallback((channel: 'app' | 'email' | 'sms') => {
    setFormData(prev => ({ 
      ...prev, 
      channels: { ...prev.channels, [channel]: !prev.channels[channel] } 
    }));
  }, []);

  const toggleAllChannels = useCallback(() => {
    const allSelected = Object.values(formData.channels).every(v => v);
    setFormData(prev => ({
      ...prev,
      channels: {
        app: !allSelected,
        email: !allSelected,
        sms: !allSelected,
      }
    }));
  }, [formData.channels]);

  const handleTemplateSelect = (template: MessageTemplate) => {
    setSelectedTemplateId(template.id);
    if (template.id !== "custom") {
      setFormData(prev => ({
        ...prev,
        title: template.title,
        message: template.message,
        type: template.type,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        title: "",
        message: "",
        type: "info",
      }));
    }
    setActiveStep("editor");
  };

  const handleSend = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("يرجى ملء كافة خانات المخطوطة الملكية");
      return;
    }

    const selectedChannels = Object.entries(formData.channels)
      .filter(([_, isSelected]) => isSelected)
      .map(([channel]) => channel);

    if (selectedChannels.length === 0) {
      toast.error("يجب اختيار قناة بث واحدة على الأقل لضمان وصول المرسوم");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/admin/users/bulk-send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: users.map(u => u.id),
          title: formData.title,
          message: formData.message,
          type: formData.type,
          channels: selectedChannels,
          actionUrl: formData.actionUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`تم بث المرسوم الملكي بنجاح 👑`, {
          description: `وصل المرسوم لـ ${data.data.summary.success} محارب | السجلات الفاشلة: ${data.data.summary.failure}`,
        });
        onOpenChange(false);
        // Reset state
        setActiveStep("templates");
        setFormData({
          title: "",
          message: "",
          type: "info",
          actionUrl: "",
          channels: { app: true, email: false, sms: false },
        });
        setSelectedTemplateId("custom");
      } else {
        toast.error(data.error || "تعثر وصول المرسوم للجيش");
      }
    } catch (_error) {
      toast.error("حدث عطل في أبراج الاتصال الإمبراطورية");
    } finally {
      setIsSending(false);
    }
  };

  const smsInfo = useMemo(() => {
    const isArabic = /[\u0600-\u06FF]/.test(formData.message);
    const limit = isArabic ? 210 : 480; // 3 segments max
    const charsPerSegment = isArabic ? 70 : 160;
    return {
      length: formData.message.length,
      segments: Math.ceil(formData.message.length / charsPerSegment) || 1,
      limit,
      isArabic,
    };
  }, [formData.message]);

  const activeStepIndex = STEPS.findIndex(s => s.id === activeStep);
  const nextStep = STEPS[activeStepIndex + 1]?.id;
  const prevStep = STEPS[activeStepIndex - 1]?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] border-white/10 p-0 overflow-hidden bg-background/40 backdrop-blur-3xl rpg-glass-light dark:rpg-glass-premium shadow-[0_0_150px_rgba(0,0,0,0.8)] rounded-[3.5rem] focus:outline-none z-[100] transition-all duration-700" dir="rtl">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-primary/5 to-transparent z-0 pointer-events-none" 
        />
        
        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          {/* Header with Royal Title */}
          <div className="p-10 pb-6 shrink-0 relative">
             <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
             
             <DialogHeader className="relative z-10">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                   <motion.div 
                     initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
                     animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                     transition={{ duration: 0.8, type: "spring" }}
                     className="p-5 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 rounded-[2rem] border-4 border-white/20 shadow-[0_0_40px_rgba(245,158,11,0.4)]"
                   >
                      <CrownIcon className="w-10 h-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
                   </motion.div>
                   
                   <div className="space-y-1">
                      <DialogTitle className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-white to-amber-200 tracking-tighter drop-shadow-[0_5px_15px_rgba(245,158,11,0.2)]">
                         الاستدعاء الملكي الأكبر
                      </DialogTitle>
                      <DialogDescription className="text-amber-500/80 font-black italic text-base uppercase tracking-widest flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" />
                         بث مرسوم إمبراطوري لـ {users.length} محارب
                        <Sparkles className="w-4 h-4" />
                      </DialogDescription>
                   </div>
                </div>
             </DialogHeader>

             {/* Stepper Progress */}
             <div className="mt-10 flex items-center justify-center">
                <div className="flex bg-black/40 p-2 rounded-[2rem] border border-white/10 backdrop-blur-2xl shadow-inner-premium gap-2 overflow-x-auto custom-scrollbar-none no-scrollbar">
                   {STEPS.map((step, idx) => {
                     const isCompleted = activeStepIndex > idx;
                     const isActive = activeStep === step.id;
                     const Icon = step.icon;
                     
                     return (
                       <button
                         key={step.id}
                         onClick={() => setActiveStep(step.id)}
                         className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-xs font-black transition-all duration-500 relative group truncate min-w-fit ${isActive ? 'bg-amber-500 text-white shadow-[0_10px_25px_rgba(245,158,11,0.4)] scale-105' : isCompleted ? 'text-amber-500/60 hover:bg-white/5' : 'text-muted-foreground hover:bg-white/5 opacity-50'}`}
                       >
                         <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-white/20' : isCompleted ? 'bg-amber-500/10' : 'bg-white/5'}`}>
                            <Icon className="w-4 h-4" />
                         </div>
                         <div className="flex flex-col text-right">
                            <span>{step.label}</span>
                            <span className="text-[8px] opacity-60 font-medium">الخطوة {idx + 1}</span>
                         </div>
                         {isActive && (
                           <motion.div 
                             layoutId="active-pill"
                             className="absolute inset-0 bg-white/10 rounded-2xl pointer-events-none"
                           />
                         )}
                       </button>
                     )
                   })}
                </div>
             </div>
          </div>

          {/* Body Area */}
          <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar-premium">
             <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                  className="h-full"
                >
                   <div className="mb-10 text-center space-y-2">
                       <h3 className="text-2xl font-black tracking-tight text-white">{STEPS.find(s => s.id === activeStep)?.label}</h3>
                       <p className="text-xs text-muted-foreground font-bold italic opacity-60">{STEPS.find(s => s.id === activeStep)?.description}</p>
                   </div>

                   {activeStep === "templates" && (
                     <RoyalTemplates 
                       selectedId={selectedTemplateId} 
                       onSelect={handleTemplateSelect} 
                     />
                   )}

                   {activeStep === "editor" && (
                     <div className="space-y-12 max-w-4xl mx-auto">
                       <RoyalEditor 
                         formData={formData} 
                         updateField={updateField} 
                         isArabic={smsInfo.isArabic}
                         smsInfo={smsInfo}
                       />
                       <div className="h-px bg-white/5 w-full" />
                       <RoyalChannels 
                         channels={formData.channels} 
                         toggleChannel={toggleChannel} 
                         toggleAll={toggleAllChannels}
                         allSelected={Object.values(formData.channels).every(v => v)}
                       />
                     </div>
                   )}

                   {activeStep === "audience" && (
                     <div className="max-w-5xl mx-auto">
                       <RoyalAudience users={users} />
                     </div>
                   )}

                   {activeStep === "preview" && (
                     <div className="max-w-4xl mx-auto">
                       <RoyalPreview 
                         title={formData.title} 
                         message={formData.message} 
                         type={formData.type} 
                         actionUrl={formData.actionUrl} 
                       />
                     </div>
                   )}
                </motion.div>
             </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="p-10 border-t border-white/5 bg-black/40 backdrop-blur-3xl flex items-center justify-between gap-10 shrink-0">
             <div className="flex items-center gap-4 text-xs font-black text-muted-foreground">
                {activeStep !== "templates" ? (
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => setActiveStep(prevStep as Step)}
                    className="h-16 px-8 rounded-2xl group border border-white/5 hover:bg-white/5"
                  >
                    <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    العودة خطوة للوراء
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => onOpenChange(false)}
                    className="h-16 px-8 rounded-2xl text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/5"
                  >
                    إلغاء الاستدعاء
                  </Button>
                )}
             </div>

             <div className="flex items-center gap-4">
                {activeStep !== "preview" ? (
                  <Button
                    size="lg"
                    onClick={() => setActiveStep(nextStep as Step)}
                    className="h-16 px-12 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 hover:border-white/20 group shadow-xl"
                  >
                    المتابعة نحو الهدف
                    <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleSend}
                    disabled={isSending}
                    className={`h-16 px-16 rounded-2xl font-black text-lg transition-all shadow-[0_15px_40px_rgba(245,158,11,0.3)] group ${isSending ? 'bg-neutral-800' : 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-600 hover:scale-105 active:scale-95'}`}
                  >
                    {isSending ? (
                      <Loader2 className="w-6 h-6 animate-spin ml-2" />
                    ) : (
                      <Send className="w-6 h-6 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    )}
                    {isSending ? "جاري بث التردد الملكي..." : "بث المرسوم الإمبراطوري الآن"}
                  </Button>
                )}
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CrownIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.518l4.276 3.664a1 1 0 0 0 1.516-.294z" />
      <path d="M5 21h14" />
    </svg>
  );
}

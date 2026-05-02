"use client";

import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageSquareText, Zap, Users, Send, Loader2, LayoutGrid, Megaphone, ChevronRight, ChevronLeft } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { BroadcastEditor } from "./broadcast-editor";
import { BroadcastChannels } from "./broadcast-channels";
import { BroadcastTemplates } from "./broadcast-templates";
import { BroadcastPreview } from "./broadcast-preview";
import { BroadcastAudience } from "./broadcast-audience";
import { UserModel, BroadcastFormData, MessageTemplate } from "./types";

interface BroadcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserModel[];
}

type Step = "templates" | "editor" | "audience" | "preview";

const STEPS: { id: Step; label: string; icon: any; description: string }[] = [
  { id: "templates", label: "قوالب الرسائل", icon: LayoutGrid, description: "اختر قالباً جاهزاً كنقطة انطلاق لرسالتك" },
  { id: "editor", label: "محتوى الرسالة", icon: MessageSquareText, description: "صياغة نص الرسالة وتحديد قنوات البث" },
  { id: "audience", label: "المستهدفين", icon: Users, description: "مراجعة قائمة المستخدمين المستهدفين" },
  { id: "preview", label: "المعاينة النهائية", icon: Zap, description: "تحقق من شكل الرسالة قبل البدء في عملية البث" },
];

export function BroadcastModal({ open, onOpenChange, users }: BroadcastModalProps) {
  const [activeStep, setActiveStep] = useState<Step>("templates");
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("custom");

  const [formData, setFormData] = useState<BroadcastFormData>({
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
      toast.error("يرجى ملء كافة البيانات المطلوبة");
      return;
    }

    const selectedChannels = Object.entries(formData.channels)
      .filter(([_, isSelected]) => isSelected)
      .map(([channel]) => channel);

    if (selectedChannels.length === 0) {
      toast.error("يجب اختيار قناة بث واحدة على الأقل");
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
        toast.success(`تم بث الرسالة بنجاح`, {
          description: `وصلت الرسالة لـ ${data.data.summary.success} مستخدم | الفشل: ${data.data.summary.failure}`,
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
        toast.error(data.error || "فشل إرسال الرسالة");
      }
    } catch (_error) {
      toast.error("حدث خطأ غير متوقع في نظام البث");
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
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] border-white/10 p-0 overflow-hidden bg-background/40 backdrop-blur-3xl shadow-[0_0_150px_rgba(0,0,0,0.8)] rounded-[2.5rem] sm:rounded-[3.5rem] focus:outline-none z-[100]">
        <div className="relative z-10 flex flex-col h-full overflow-hidden" dir="rtl">
          {/* Header */}
          <div className="p-10 pb-6 shrink-0 relative">
            <DialogHeader className="relative z-10">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="p-5 bg-primary/10 rounded-[2rem] border border-primary/20 shadow-xl">
                  <Megaphone className="w-10 h-10 text-primary" />
                </div>

                <div className="space-y-1">
                  <DialogTitle className="text-4xl font-black text-white tracking-tighter">
                    مركز البث المركزي
                  </DialogTitle>
                  <DialogDescription className="text-gray-400 font-bold text-base uppercase tracking-widest flex items-center justify-center gap-2">
                    إرسال تنبيه جماعي لـ {users.length} مستهدف
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Stepper Progress */}
            <div className="mt-10 flex items-center justify-center">
              <div className="flex bg-black/20 p-2 rounded-[2rem] border border-white/5 backdrop-blur-2xl gap-2 overflow-x-auto no-scrollbar">
                {STEPS.map((step, idx) => {
                  const isCompleted = activeStepIndex > idx;
                  const isActive = activeStep === step.id;
                  const Icon = step.icon;

                  return (
                    <button
                      key={step.id}
                      onClick={() => setActiveStep(step.id)}
                      className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-xs font-black transition-all duration-300 relative group truncate min-w-fit ${isActive ? 'bg-primary text-white shadow-lg scale-105' : isCompleted ? 'text-primary/60 hover:bg-white/5' : 'text-muted-foreground hover:bg-white/5 opacity-50'}`}
                    >
                      <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-white/20' : isCompleted ? 'bg-primary/10' : 'bg-white/5'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col text-right">
                        <span>{step.label}</span>
                        <span className="text-[8px] opacity-60 font-medium">الخطوة {idx + 1}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Body Area */}
          <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar-none">
            <AnimatePresence mode="wait">
              <m.div
                key={activeStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <div className="mb-10 text-center space-y-2">
                  <h3 className="text-2xl font-black tracking-tight text-white">{STEPS.find(s => s.id === activeStep)?.label}</h3>
                  <p className="text-xs text-muted-foreground font-bold opacity-60">{STEPS.find(s => s.id === activeStep)?.description}</p>
                </div>

                {activeStep === "templates" && (
                  <BroadcastTemplates
                    selectedId={selectedTemplateId}
                    onSelect={handleTemplateSelect}
                  />
                )}

                {activeStep === "editor" && (
                  <div className="space-y-12 max-w-4xl mx-auto">
                    <BroadcastEditor
                      formData={formData}
                      updateField={updateField}
                      isArabic={smsInfo.isArabic}
                      smsInfo={smsInfo}
                    />
                    <div className="h-px bg-white/5 w-full" />
                    <BroadcastChannels
                      channels={formData.channels}
                      toggleChannel={toggleChannel}
                      toggleAll={toggleAllChannels}
                      allSelected={Object.values(formData.channels).every(v => v)}
                    />
                  </div>
                )}

                {activeStep === "audience" && (
                  <div className="max-w-5xl mx-auto">
                    <BroadcastAudience users={users} />
                  </div>
                )}

                {activeStep === "preview" && (
                  <div className="max-w-4xl mx-auto">
                    <BroadcastPreview
                      title={formData.title}
                      message={formData.message}
                      type={formData.type}
                      actionUrl={formData.actionUrl}
                    />
                  </div>
                )}
              </m.div>
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="p-10 border-t border-white/5 bg-black/20 backdrop-blur-3xl flex items-center justify-between gap-10 shrink-0">
            <div className="flex items-center gap-4 text-xs font-black text-muted-foreground">
              {activeStep !== "templates" ? (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setActiveStep(prevStep as Step)}
                  className="h-16 px-8 rounded-2xl group border border-white/5 hover:bg-white/5"
                >
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  العودة
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => onOpenChange(false)}
                  className="h-16 px-8 rounded-2xl text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/5"
                >
                  إلغاء العملية
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {activeStep !== "preview" ? (
                <Button
                  size="lg"
                  onClick={() => setActiveStep(nextStep as Step)}
                  className="h-16 px-12 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 hover:border-white/20 group"
                >
                  التالي
                  <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleSend}
                  disabled={isSending}
                  className={`h-16 px-16 rounded-2xl font-black text-lg transition-all ${isSending ? 'bg-neutral-800' : 'bg-primary hover:bg-primary/90'}`}
                >
                  {isSending ? (
                    <Loader2 className="w-6 h-6 animate-spin ml-2" />
                  ) : (
                    <Send className="w-6 h-6 ml-2" />
                  )}
                  {isSending ? "جاري الإرسال..." : "بدء البث الجماعي الآن"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

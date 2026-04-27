"use client";

import { AdminInput } from "@/components/admin/ui/admin-input";
import { Textarea } from "@/components/ui/textarea";
import { MessageType } from "./types";
import { m } from "framer-motion";

interface RoyalEditorProps {
  formData: {
    title: string;
    message: string;
    type: MessageType;
    actionUrl: string;
  };
  updateField: (field: string, value: any) => void;
  isArabic: boolean;
  smsInfo: {
    length: number;
    segments: number;
    limit: number;
  };
}

const TYPE_CONFIG = [
  { value: "info" as const, label: "معلومات", color: "blue" },
  { value: "success" as const, label: "إنجاز", color: "emerald" },
  { value: "warning" as const, label: "تحذير", color: "amber" },
  { value: "error" as const, label: "خطر", color: "rose" },
];

export function RoyalEditor({ formData, updateField, isArabic: _isArabic, smsInfo }: RoyalEditorProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-amber-500/80 uppercase tracking-[0.2em] flex items-center gap-2">
            هالة المرسوم الملكي
          </label>
          <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-xl">
             {TYPE_CONFIG.map(t => (
               <button
                 key={t.value}
                 onClick={() => updateField("type", t.value)}
                 className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all duration-300 ${formData.type === t.value ? `bg-${t.color}-500 text-white shadow-[0_0_20px_rgba(var(--${t.color}-500),0.3)]` : 'text-muted-foreground hover:bg-white/5 hover:text-white hover:scale-[1.02]'}`}
               >
                 {t.label}
               </button>
             ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">توجيه ملكي (رابط اختياري)</label>
          <AdminInput 
            placeholder="https://thanawy.com/quest/..." 
            value={formData.actionUrl}
            onChange={(e) => updateField("actionUrl", e.target.value)}
            className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 backdrop-blur-md"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase flex justify-between px-1 tracking-[0.1em]">
             عنوان المخطوطة
             <span className="text-primary/60 italic font-medium">سي٪ر بشكل عريض في الأعلى</span>
          </label>
          <AdminInput 
            placeholder="اكتب العنوان الملكي هنا..." 
            value={formData.title}
            onChange={(e) => updateField("title", e.target.value)}
            className="h-16 text-xl font-black bg-white/5 border-white/10 rounded-3xl px-6 focus:ring-primary/20 shadow-inner"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase flex justify-between px-1 tracking-[0.1em]">
            جوهر الرسالة
            <span className={`transition-all duration-300 font-black ${smsInfo.length > smsInfo.limit ? 'text-red-500 scale-110' : 'text-amber-500'}`}>
               {smsInfo.length} / {smsInfo.limit} حرف ({smsInfo.segments} SMS)
            </span>
          </label>
          <div className="relative group">
            <Textarea 
              placeholder="افرغ محتوى حكمتك الملكية هنا..." 
              className="min-h-[180px] text-lg leading-relaxed resize-none bg-white/5 border-white/10 rounded-[2.5rem] p-8 font-bold focus:ring-primary/20 transition-all custom-scrollbar-premium shadow-inner group-hover:bg-white/10"
              value={formData.message}
              onChange={(e) => updateField("message", e.target.value)}
            />
            <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-white/10 group-focus-within:ring-primary/30 pointer-events-none transition-all duration-300" />
            
            {/* Visual length indicator bar */}
            <div className="absolute bottom-4 inset-x-12 h-1 bg-white/5 rounded-full overflow-hidden">
               <m.div 
                 className={`h-full ${smsInfo.length > smsInfo.limit ? 'bg-rose-500' : 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]'}`}
                 initial={{ width: 0 }}
                 animate={{ width: `${Math.min((smsInfo.length / smsInfo.limit) * 100, 100)}%` }}
                 transition={{ duration: 0.3 }}
               />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

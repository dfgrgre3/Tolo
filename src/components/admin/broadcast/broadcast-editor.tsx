"use client";

import { AdminInput } from "@/components/admin/ui/admin-input";
import { Textarea } from "@/components/ui/textarea";
import { MessageType, BroadcastFormData } from "./types";

interface BroadcastEditorProps {
  formData: BroadcastFormData;
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
  { value: "success" as const, label: "نجاح", color: "emerald" },
  { value: "warning" as const, label: "تحذير", color: "amber" },
  { value: "error" as const, label: "خطر", color: "rose" },
];

export function BroadcastEditor({ formData, updateField, isArabic: _isArabic, smsInfo }: BroadcastEditorProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
            نوع التنبيه
          </label>
          <div className="flex gap-2 p-1 bg-black/20 rounded-2xl border border-white/5 backdrop-blur-xl">
             {TYPE_CONFIG.map(t => (
               <button
                 key={t.value}
                 onClick={() => updateField("type", t.value)}
                 className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all duration-300 ${formData.type === t.value ? `bg-primary text-white shadow-lg` : 'text-muted-foreground hover:bg-white/5 hover:text-white'}`}
               >
                 {t.label}
               </button>
             ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">رابط الإجراء (اختياري)</label>
          <AdminInput 
            placeholder="https://example.com/..." 
            value={formData.actionUrl}
            onChange={(e) => updateField("actionUrl", e.target.value)}
            className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase flex justify-between px-1 tracking-[0.1em]">
             عنوان الرسالة
             <span className="text-primary/60 italic font-medium">يظهر في أعلى التنبيه</span>
          </label>
          <AdminInput 
            placeholder="أدخل عنوان التنبيه..." 
            value={formData.title}
            onChange={(e) => updateField("title", e.target.value)}
            className="h-16 text-xl font-black bg-white/5 border-white/10 rounded-3xl px-6 focus:ring-primary/20"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase flex justify-between px-1 tracking-[0.1em]">
            نص الرسالة
            <span className={`transition-all duration-300 font-black ${smsInfo.length > smsInfo.limit ? 'text-red-500' : 'text-primary'}`}>
               {smsInfo.length} / {smsInfo.limit} حرف ({smsInfo.segments} SMS)
            </span>
          </label>
          <div className="relative group">
            <Textarea 
              placeholder="اكتب محتوى الرسالة هنا..." 
              className="min-h-[180px] text-lg leading-relaxed resize-none bg-white/5 border-white/10 rounded-[2.5rem] p-8 font-bold focus:ring-primary/20 transition-all shadow-inner"
              value={formData.message}
              onChange={(e) => updateField("message", e.target.value)}
            />
            
            <div className="absolute bottom-4 inset-x-12 h-1 bg-white/5 rounded-full overflow-hidden">
               <div 
                 className={`h-full ${smsInfo.length > smsInfo.limit ? 'bg-rose-500' : 'bg-primary'}`}
                 style={{ width: `${Math.min((smsInfo.length / smsInfo.limit) * 100, 100)}%` }}
               />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

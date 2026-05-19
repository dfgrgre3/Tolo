"use client";

import { Mail, Smartphone, Bell, CheckCircle2 } from "lucide-react";

interface BroadcastChannelsProps {
  channels: {
    app: boolean;
    email: boolean;
    sms: boolean;
  };
  toggleChannel: (channel: 'app' | 'email' | 'sms') => void;
  toggleAll: () => void;
  allSelected: boolean;
}

const CHANNELS_CONFIG = [
  { id: 'app' as const, label: 'إشعار داخل التطبيق', icon: Bell, description: 'يصل التنبيه فوراً داخل حساب المستخدم' },
  { id: 'email' as const, label: 'البريد الإلكتروني', icon: Mail, description: 'إرسال نسخة من التنبيه للبريد المسجل' },
  { id: 'sms' as const, label: 'رسالة نصية قصيرة', icon: Smartphone, description: 'إرسال رسالة نصية مباشرة لهاتف المستخدم' },
];

export function BroadcastChannels({ channels, toggleChannel, toggleAll, allSelected }: BroadcastChannelsProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
         <div className="flex flex-col">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">قنوات الإرسال</h4>
            <p className="text-[9px] font-bold text-muted-foreground italic">حدد الوسائل التي سيتم من خلالها إرسال الرسالة</p>
         </div>
         <button 
           onClick={toggleAll}
           className="text-[10px] font-black uppercase text-primary hover:text-primary/80 transition-colors bg-primary/5 px-4 py-2 rounded-full border border-primary/20"
         >
           {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CHANNELS_CONFIG.map((c) => {
          const isSelected = channels[c.id];
          return (
            <button
              key={c.id}
              onClick={() => toggleChannel(c.id)}
              className={`relative flex flex-col items-center gap-4 p-8 rounded-[2.5rem] border-2 transition-all group overflow-hidden ${isSelected ? 'border-primary bg-primary/10 shadow-lg' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] grayscale opacity-60 hover:grayscale-0 hover:opacity-100'}`}
            >
              <div className={`p-4 rounded-3xl ${isSelected ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-white'} transition-colors`}>
                <c.icon className="w-8 h-8" />
              </div>
              
              <div className="text-center">
                <p className="text-xs font-black tracking-tight mb-1">{c.label}</p>
                <p className="text-[9px] font-bold opacity-40 leading-relaxed px-4">{c.description}</p>
              </div>

              {isSelected && (
                <div className="absolute top-4 right-4">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

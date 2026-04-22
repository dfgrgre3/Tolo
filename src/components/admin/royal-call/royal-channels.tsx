"use client";

import { motion } from "framer-motion";
import { Mail, Smartphone, Bell, CheckCircle2 } from "lucide-react";

interface RoyalChannelsProps {
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
  { id: 'app' as const, label: 'إشعار داخل التطبيق', icon: Bell, description: 'يصل التنبيه فوراً للهاتف والحاسوب' },
  { id: 'email' as const, label: 'رسالة بريد إلكتروني', icon: Mail, description: 'يصحب المرسوم للمكان الرسمي الدائم' },
  { id: 'sms' as const, label: 'رسالة نصية قصيرة', icon: Smartphone, description: 'يخرق الحواجز ويصل للجوال مباشرة' },
];

export function RoyalChannels({ channels, toggleChannel, toggleAll, allSelected }: RoyalChannelsProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
         <div className="flex flex-col">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80">قنوات البث الملكي</h4>
            <p className="text-[9px] font-bold text-muted-foreground italic">حدد المسارات التي سيسلكها مرسومك الإمبراطوري</p>
         </div>
         <button 
           onClick={toggleAll}
           className="text-[10px] font-black uppercase text-amber-500 hover:text-amber-400 transition-colors bg-amber-500/5 px-4 py-2 rounded-full border border-amber-500/20"
         >
           {allSelected ? "تحرير كافة القنوات" : "استقطاب كافة المسارات"}
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CHANNELS_CONFIG.map((c) => {
          const isSelected = channels[c.id];
          return (
            <motion.button
              key={c.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleChannel(c.id)}
              className={`relative flex flex-col items-center gap-4 p-8 rounded-[2.5rem] border-2 transition-all p-1 group overflow-hidden ${isSelected ? 'border-primary bg-primary/10 shadow-[0_20px_40px_rgba(var(--primary),0.2)]' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] grayscale opacity-60 hover:grayscale-0 hover:opacity-100'}`}
            >
              <div className={`p-4 rounded-3xl ${isSelected ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-white'} transition-colors`}>
                <c.icon className="w-8 h-8" />
              </div>
              
              <div className="text-center">
                <p className="text-xs font-black tracking-tight mb-1">{c.label}</p>
                <p className="text-[9px] font-bold opacity-40 leading-relaxed px-4">{c.description}</p>
              </div>

              {isSelected && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-4 right-4"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { m } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface SocialGoalSectionProps {
  glassStyle: string;
}

export function SocialGoalSection({ glassStyle }: SocialGoalSectionProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={glassStyle + " p-10 border-white/5 group relative"}
    >
      <div className="absolute inset-0 bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
      <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
        <div className="relative h-40 w-40 flex-shrink-0">
          <svg className="w-full h-full -rotate-90">
            <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
            <m.circle
              initial={{ strokeDashoffset: 452 }}
              whileInView={{ strokeDashoffset: 452 * (1 - 0.75) }}
              viewport={{ once: true }}
              transition={{ duration: 2, ease: "easeOut" }}
              cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={452} className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <m.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-4xl font-black text-white"
            >
              75%
            </m.span>
            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-1">اكتمال الهدف</span>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="text-right md:text-right">
              <h4 className="text-3xl font-black text-white">هدف المعسكر التدريبي اليومي</h4>
              <p className="text-gray-400 text-lg font-medium mt-1">تطورك مستمر؛ أنجز 45 دقيقة إضافية لتصل للقمة اليوم.</p>
            </div>
            
            {/* Active Students Avatars */}
            <div className="flex flex-col items-center md:items-end gap-3">
              <div className="flex -space-x-4 space-x-reverse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <m.div
                    key={i}
                    whileHover={{ y: -5, scale: 1.1, zIndex: 50 }}
                    className="h-12 w-12 rounded-full border-2 border-background bg-card flex items-center justify-center overflow-hidden hover:border-primary transition-all cursor-pointer shadow-xl relative"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=User${i}`} alt="user" width={48} height={48} className="object-cover" />
                  </m.div>
                ))}
                <div className="h-12 w-12 rounded-full border-2 border-background bg-primary flex items-center justify-center text-xs font-black text-white relative z-10 shadow-xl shadow-primary/20">
                  +1.2k
                </div>
              </div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                1,452 طالباً يذاكرون معك الآن
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-xl px-5 py-2 text-xs font-black">كيمياء ✅ تم الإنجاز</Badge>
            <Badge className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-xl px-5 py-2 text-xs font-black">فيزياء ✅ تم الإنجاز</Badge>
            <Badge className="bg-primary/20 text-primary border border-primary/30 rounded-xl px-5 py-2 text-xs font-black animate-pulse">رياضيات ⏳ قيد العمل</Badge>
            <Badge className="bg-white/5 text-gray-500 border border-white/10 rounded-xl px-5 py-2 text-xs font-black">أحياء 🔒 لم يبدأ</Badge>
          </div>
        </div>
      </div>
    </m.div>
  );
}

"use client";

import React from "react";
import { m } from "framer-motion";
import { Clock, BookOpen, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function QuestCard() {
  const STYLES = {
    glass: "relative overflow-hidden rounded-[2rem] border border-border bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5",
  };

  return (
    <m.div 
      whileHover={{ y: -5 }}
      className={STYLES.glass + " p-0 overflow-hidden border-orange-500/30 group"}
    >
       <div className="bg-orange-500/10 px-8 py-4 border-b border-orange-500/20 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent animate-pulse" />
          <Badge className="bg-orange-500 text-black px-4 py-1 font-black text-xs border-2 border-black relative z-10">
            المهمة النشطة حالياً
          </Badge>
          <div className="flex items-center gap-2 text-orange-500 font-bold text-sm underline decoration-orange-500/30 underline-offset-4 relative z-10">
             <Clock className="w-4 h-4 animate-spin-slow" />
             <span>متبقي 28:45</span>
          </div>
       </div>
       <div className="p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-3xl border-4 border-orange-500/30 flex items-center justify-center bg-orange-500/5 relative shadow-inner overflow-hidden group">
                  <m.div 
                    animate={{ scale: [1, 1.1, 1] }} 
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-orange-500/10" 
                  />
                  <Play className="w-10 h-10 text-orange-500 fill-orange-500 ml-1 relative z-10 group-hover:scale-125 transition-transform" />
                  <div className="absolute inset-0 rounded-3xl border-2 border-orange-500 animate-pulse pointer-events-none" />
              </div>
              <div className="space-y-2">
                  <h3 className="text-3xl font-black text-white group-hover:text-orange-400 transition-colors">جلسة كيمياء: الروابط التساهمية</h3>
                  <div className="flex items-center gap-4">
                    <p className="text-gray-400 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      الوحدة الثالثة â€¢ الدرس الثاني
                    </p>
                    <span className="h-1 w-1 rounded-full bg-gray-600" />
                    <p className="font-black text-orange-500/90 text-sm tracking-wide">+150 XP عند الإكمال</p>
                  </div>
              </div>
            </div>
            <Button className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-black font-black px-12 h-16 rounded-2xl shadow-[0_15px_40px_rgba(249,115,22,0.35)] text-lg transition-all active:scale-95 group-hover:scale-105">
              العودة للمهمة
            </Button>
        </div>
        
        {/* Micro Progress Track */}
        <div className="mt-8 space-y-2">
           <div className="flex justify-between text-xs font-black text-gray-500 uppercase tracking-tighter">
              <span>التقدم في المهمة</span>
              <span className="text-orange-500">65%</span>
           </div>
           <div className="h-4 w-full bg-gray-900/50 rounded-full overflow-hidden border border-white/5 p-1">
              <m.div 
                initial={{ width: 0 }}
                animate={{ width: "65%" }}
                transition={{ duration: 1.5, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-orange-600 via-orange-400 to-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.5)] rounded-full" 
              />
           </div>
        </div>
       </div>
    </m.div>
  );
}

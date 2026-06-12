"use client";

import React from "react";
import { m } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BotIcon } from "./bot-icon";

interface AIAssistantPromoProps {
  glassStyle: string;
}

export function AIAssistantPromo({ glassStyle }: AIAssistantPromoProps) {
  return (
    <Card className={glassStyle + " border-primary/20 bg-gradient-to-br from-primary/10 to-indigo-950/20 p-8 text-center space-y-6 group overflow-hidden relative"}>
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(var(--primary),0.5)]" />
      
      <div className="relative">
        <m.div
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 1, type: "spring" }}
          className="mx-auto w-24 h-24 rounded-[2.5rem] bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center shadow-2xl relative z-10"
        >
          <BotIcon className="w-12 h-12 text-white drop-shadow-lg" />
          <div className="absolute inset-0 rounded-[2.5rem] bg-white/20 animate-pulse pointer-events-none" />
        </m.div>
      </div>

      <div className="space-y-3 relative z-10">
        <h3 className="text-2xl font-black tracking-tight text-white group-hover:text-primary transition-colors">مساعدك الذكي دائمـاً معك!</h3>
        <p className="text-sm text-gray-400 font-medium leading-relaxed px-2">هل تواجه تحدياً في الرياضيات؟ أو تحتاج لشرح سريع في الفيزياء؟ رفيقي هنا للإجابة.</p>
      </div>

      <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black shadow-[0_15px_30px_rgba(var(--primary),0.3)] group-hover:scale-105 transition-all text-sm h-14 rounded-2xl border-b-4 border-black/30">
        افتح بوابة الحكمة
      </Button>
      
      <div className="flex items-center justify-center gap-2 pt-2 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
        <Badge variant="outline" className="text-[9px] font-black border-white/10 uppercase tracking-tighter">AI 4.0</Badge>
        <Badge variant="outline" className="text-[9px] font-black border-white/10 uppercase tracking-tighter">Latent Space</Badge>
      </div>
    </Card>
  );
}

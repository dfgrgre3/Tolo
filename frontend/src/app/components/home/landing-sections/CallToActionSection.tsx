"use client";

import React from "react";
import { m } from "framer-motion";
import { Map, Shield, Compass, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CallToActionSectionProps {
  activeFadeUp: any;
  neonTextClass: string;
}

export function CallToActionSection({ activeFadeUp, neonTextClass }: CallToActionSectionProps) {
  return (
    <m.div
      {...activeFadeUp}
      viewport={{ once: true }}
      className="relative p-20 rounded-[4rem] bg-gradient-to-br from-primary/10 via-purple-600/5 to-transparent border border-white/10 overflow-hidden text-center group"
    >
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[130px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      </div>
      
      <div className="relative z-10 space-y-10">
        <div className="mx-auto h-20 w-20 rounded-3xl bg-black border border-white/10 flex items-center justify-center shadow-2xl">
          <Map className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-5xl md:text-8xl font-black tracking-tight leading-tight">
          هل أنت مستعد <br /> لكتابة <span className={neonTextClass}>تاريخك؟</span>
        </h2>
        <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto">
          انضم لآلاف الطلاب الذين حوّلوا عامهم الدراسي إلى مغامرة ممتعة. المملكة تفتح أبوابها لك الآن.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link href="/register">
            <Button className="h-20 px-16 bg-white text-black font-black rounded-[2rem] text-xl hover:scale-105 transition-all shadow-white/10 shadow-2xl">
               انضم للجيش الآن (تسجيل مجاني)
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs font-black text-gray-600 uppercase tracking-widest pt-10">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>حماية ملكية</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4" />
            <span>توجيه عسكري</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>سرعة البرق</span>
          </div>
        </div>
      </div>
    </m.div>
  );
}

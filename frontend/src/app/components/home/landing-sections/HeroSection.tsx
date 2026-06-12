"use client";

import React from "react";
import { m } from "framer-motion";
import { Shield, Sword, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  shouldReduceMotion: boolean;
  neonTextClass: string;
  goldTextClass: string;
}

export function HeroSection({ shouldReduceMotion, neonTextClass, goldTextClass }: HeroSectionProps) {
  return (
    <section className="relative pt-32 pb-20 px-4 flex flex-col items-center justify-center text-center">
       <m.div
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5 }}
        className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary mb-12 shadow-sm">
        
         <Shield className="h-5 w-5" />
         <span>TOLO: عصر جديد في التعلم</span>
       </m.div>

       <m.h1
        initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2, duration: 0.5 }}
        className="text-6xl md:text-9xl font-black tracking-tighter leading-[1.1] mb-8">
        
         حوّل دراستك <br /> إلى <span className={neonTextClass}>لحظات مجد</span> 🏆
       </m.h1>

       <m.p
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.3, duration: 0.5 }}
        className="text-xl md:text-2xl text-gray-400 font-medium max-w-3xl mb-16 leading-relaxed">
        
         لا تكتفي بمذاكرة الدروس. انطلق في <span className={goldTextClass}>رحلة بطل</span>، اجمع نقاط القوة، ارفع مستواك الدراسي، وسيطر على لوحة الشرف الملكية.
       </m.p>

       <m.div
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.4, duration: 0.5 }}
        className="flex flex-col sm:flex-row gap-6 items-center">
        
         <Link href="/register">
            <Button className="h-20 px-12 bg-primary text-black font-black rounded-[2rem] gap-4 shadow-2xl shadow-primary/30 hover:scale-105 transition-all text-xl group overflow-hidden relative">
               <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]" />
               <span>ابدأ مغامرتك الآن</span>
               <Sword className="h-6 w-6 transition-transform group-hover:rotate-45" />
            </Button>
         </Link>
         <Link href="/courses">
            <Button variant="outline" className="h-20 px-12 rounded-[2rem] border-white/10 bg-white/5 text-xl font-bold hover:bg-white/10 transition-all font-black">
               استكشاف المهام (المواد)
            </Button>
         </Link>
       </m.div>

       {!shouldReduceMotion && (
       <m.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="mt-20 opacity-30">
          <ChevronDown className="h-10 w-10 text-primary" />
       </m.div>
       )}
    </section>
  );
}

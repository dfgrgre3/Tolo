"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Shield, Sparkles } from "lucide-react";

export function HeaderLogo() {
  return (
    <Link 
      href="/" 
      className="flex items-center gap-3 group relative z-50" 
      prefetch={true}
      scroll={true}
    >
      <motion.div 
        className="relative flex items-center justify-center w-12 h-12 rounded-xl overflow-hidden bg-white border border-primary/20 shadow-sm transition-all duration-300 group-hover:border-primary group-hover:shadow-[0_0_20px_rgba(255,109,0,0.3)]"
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
      >
        <Image
          src="/logo-tolo.jpg"
          alt="TOLO"
          width={48}
          height={48}
          className="h-full w-full object-cover"
          sizes="48px"
          priority
        />
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
           className="absolute inset-0 rounded-xl border border-dashed border-primary/10 opacity-0 group-hover:opacity-100"
        />
      </motion.div>
      
      <div className="flex flex-col">
        <h1 className="text-3xl font-black tracking-tighter leading-none text-[#1A237E] dark:text-white uppercase transition-colors group-hover:text-primary">
          TOLO
        </h1>
        <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
           <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#FF6D00] group-hover:translate-x-1 transition-transform whitespace-nowrap">
             المستقبل يبدأ هنا
           </span>
        </div>
      </div>
    </Link>
  );
}

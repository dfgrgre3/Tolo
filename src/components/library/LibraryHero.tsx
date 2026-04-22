"use client";

import { motion } from "framer-motion";
import { Plus, Library, Sparkles, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LibraryHeroProps {
  onUploadClick: () => void;
  stats: {
    totalBooks: number;
    totalDownloads: number;
    activeUsers: number;
  };
}

export function LibraryHero({ onUploadClick, stats }: LibraryHeroProps) {
  return (
    <section className="relative w-full h-[600px] md:h-[700px] rounded-[3rem] overflow-hidden group">
      {/* Background Image with Parallax-ish Effect */}
      <motion.div 
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0"
      >
        <img 
          src="/images/library/hero.png" 
          alt="Royal Library"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-10 md:px-20 space-y-8" dir="rtl">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 backdrop-blur-md">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-black uppercase tracking-widest text-amber-500">
              أرشيف العلم المقدس
            </span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none text-white">
            مكتبة <span className="rpg-gold-text">الخالدين</span>
          </h1>
          
          <p className="text-xl text-gray-300 max-w-2xl font-medium leading-relaxed">
            استكشف آلاف المجلدات، المذكرات، والكنوز التعليمية المنسقة بعناية. 
            مكان حيث تلتقي الحكمة القديمة بتقنيات المستقبل.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap gap-6 items-center"
        >
          <Button
            onClick={onUploadClick}
            className="h-20 px-12 bg-amber-500 text-black font-black rounded-3xl gap-4 shadow-2xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all text-xl group/btn"
          >
            <span>إضافة مخطوطة</span>
            <div className="p-2 bg-black/10 rounded-xl group-hover/btn:rotate-90 transition-transform">
              <Plus className="h-6 w-6" />
            </div>
          </Button>

          <div className="flex items-center gap-8 px-10 h-20 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-white">{stats.totalBooks}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">مجلد</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-white">{stats.totalDownloads}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">تحميل</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-white">{stats.activeUsers}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">باحث</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decorative Particles (Static simulation) */}
      <div className="absolute bottom-0 right-0 w-1/3 h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-amber-500 rounded-full blur-sm animate-pulse" />
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-blue-500 rounded-full blur-sm animate-bounce" />
        <div className="absolute bottom-1/4 right-1/2 w-3 h-3 bg-amber-400/20 rounded-full blur-xl animate-pulse" />
      </div>
    </section>
  );
}

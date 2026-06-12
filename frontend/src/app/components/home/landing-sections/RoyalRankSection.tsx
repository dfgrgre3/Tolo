"use client";

import React from "react";
import { m } from "framer-motion";
import { Crown, Star, Zap, Target, Shield, Users } from "lucide-react";

interface RoyalRankSectionProps {
  mounted: boolean;
  shouldReduceMotion: boolean;
  goldTextClass: string;
}

export function RoyalRankSection({ mounted, shouldReduceMotion, goldTextClass }: RoyalRankSectionProps) {
  const icons = [Zap, Target, Shield, Users];

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5 p-12 md:p-24 relative group overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
        <div className="space-y-8 flex-1">
          <div className="inline-flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
            <Star className="h-3.5 w-3.5" />
            <span>نظام الرتب الملكي</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black leading-tight">
            من <span className="text-gray-500">مقاتل مبتدئ</span> <br /> إلى <span className={goldTextClass}>قائد جيش</span>
          </h2>
          <p className="text-xl text-gray-400 font-medium max-w-xl leading-relaxed">
            كل دقيقة مذاكرة هي نقطة خبرة (XP). كل اختبار تجتازه يقربك من المركز الأول في لوحة الشرف الملكية في عالم TOLO.
          </p>
          <div className="flex flex-wrap gap-8 pt-6">
            <div className="space-y-1">
              <p className="text-3xl font-black text-white">50K+</p>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">مغامر نشط</p>
            </div>
            <div className="w-px h-12 bg-white/10 hidden sm:block" />
            <div className="space-y-1">
              <p className="text-3xl font-black text-white">1M+</p>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">تحدي مكتمل</p>
            </div>
            <div className="w-px h-12 bg-white/10 hidden sm:block" />
            <div className="space-y-1">
              <p className="text-3xl font-black text-white">4.9/5</p>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">تقييم الفرسان</p>
            </div>
          </div>
        </div>

        <div className="relative w-full max-w-md lg:max-w-lg aspect-square">
          <div className="absolute inset-0 bg-primary/10 rounded-full" />
          <div className="absolute inset-0 border-[2px] border-dashed border-white/5 rounded-full" />

          <div className="absolute inset-4 border border-white/10 rounded-full flex items-center justify-center bg-black/40 shadow-2xl">
            <Crown className="w-32 h-32 text-primary" />
          </div>

          {/* Animated Icons */}
          {mounted && !shouldReduceMotion && (
            icons.map((Icon, idx) => (
              <m.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="absolute p-6 rounded-3xl bg-white/5 border border-white/10 shadow-2xl z-20"
                style={{
                  top: idx === 0 ? "10%" : idx === 1 ? "10%" : "auto",
                  bottom: idx === 2 ? "10%" : idx === 3 ? "10%" : "auto",
                  left: idx === 0 || idx === 2 ? "10%" : "auto",
                  right: idx === 1 || idx === 3 ? "10%" : "auto"
                }}
              >
                <Icon className="w-8 h-8 text-white/40" />
              </m.div>
            ))
          )}

          {/* Static Icons for SSR/Reduced Motion */}
          {(!mounted || shouldReduceMotion) && (
            icons.map((Icon, idx) => (
              <div
                key={`static-${idx}`}
                className="absolute p-6 rounded-3xl bg-white/5 border border-white/10 shadow-2xl z-20"
                style={{
                  top: idx === 0 ? "10%" : idx === 1 ? "10%" : "auto",
                  bottom: idx === 2 ? "10%" : idx === 3 ? "10%" : "auto",
                  left: idx === 0 || idx === 2 ? "10%" : "auto",
                  right: idx === 1 || idx === 3 ? "10%" : "auto"
                }}
              >
                <Icon className="w-8 h-8 text-white/40" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

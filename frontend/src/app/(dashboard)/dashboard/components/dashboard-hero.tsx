"use client";

import React from "react";
import { m, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, LayoutDashboard, BookOpen, Play, BarChart3, Clock as ClockIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "./clock";
import { StatsGrid } from "./stats-grid";

interface DashboardHeroProps {
  displayName: string;
  userLevel: number;
  userXP: number;
  nextLevelXP: number;
  xpPercentage: number;
  lastCourse: { id: string; title: string; thumbnailUrl?: string; progress: number; lastAccessedAt: string } | null;
  userProgress: any;
  styles: {
    glass: string;
    neonText: string;
    divider: string;
  };
}

export function DashboardHero({
  displayName,
  userLevel,
  userXP,
  nextLevelXP,
  xpPercentage,
  lastCourse,
  userProgress,
  styles
}: DashboardHeroProps) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={styles.glass + " p-4 sm:p-6 md:p-8 lg:p-12 border-primary/20 shadow-primary/5 group transition-all duration-700 hover:border-primary/40 relative"}
    >
      {/* Animated Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent group-hover:via-primary transition-all duration-700" aria-hidden="true" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 md:gap-10 lg:gap-12 relative z-10">
        <div className="space-y-4 sm:space-y-5 md:space-y-6 flex-1 w-full md:w-auto text-center md:text-start">
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 sm:gap-3 md:gap-4">
            <m.div
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]"
            >
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 animate-pulse" />
              <span>القائد العام للمنصة</span>
            </m.div>
            <Clock />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight leading-none">
            أهلاً، <span className={styles.neonText}>{displayName}</span>
            <m.span
              animate={{ rotate: [0, 10, -10, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="inline-block mr-4 scale-75 md:scale-100"
            >
              🛡️
            </m.span>
          </h1>

          <p className="max-w-2xl text-base sm:text-lg md:text-xl text-gray-400 font-medium leading-relaxed mx-auto md:mx-0">
            قوتك تزداد يوماً بعد يوم، الرتبة القادمة بانتظارك. هل أنت مستعد لخوض تحديات اليوم الملحمية؟
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 pt-2">
            <Button className="bg-primary hover:bg-primary/90 text-white font-black px-4 sm:px-6 md:px-8 h-11 sm:h-12 md:h-14 rounded-xl sm:rounded-2xl shadow-[0_10px_30px_rgba(var(--primary),0.4)] flex items-center gap-2 group-hover:scale-105 transition-all text-sm sm:text-base md:text-lg border-b-4 border-black/20">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              ابدأ جلسة المذاكرة
            </Button>
            <Button variant="outline" className="h-11 sm:h-12 md:h-14 px-4 sm:px-6 md:px-8 rounded-xl sm:rounded-2xl border-white/10 hover:bg-white/5 font-black text-sm sm:text-base md:text-lg gap-2">
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
              التقارير التفصيلية
            </Button>
          </div>
        </div>

        {/* Level Hexagon Display */}
        <div className="relative shrink-0">
          <m.div
            animate={{
              boxShadow: ["0 0 40px rgba(var(--primary), 0.1)", "0 0 80px rgba(var(--primary), 0.3)", "0 0 40px rgba(var(--primary), 0.1)"]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-primary/20 blur-3xl opacity-60"
            aria-hidden="true"
          />

          <div className="relative flex items-center justify-center h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56 lg:h-64 lg:w-64 bg-card/60 border-2 border-primary/40 rounded-2xl sm:rounded-3xl md:rounded-[3.5rem] shadow-2xl backdrop-blur-3xl overflow-hidden ring-4 sm:ring-6 md:ring-8 ring-white/5">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-600/10 opacity-30" aria-hidden="true" />
            <div className="absolute inset-0 border-4 border-transparent border-t-primary/50 border-r-primary/20 rounded-full animate-spin-slow scale-110 pointer-events-none" aria-hidden="true" />

            <div className="text-center space-y-1 relative z-10">
              <p className="text-gray-400 text-[10px] sm:text-xs font-black uppercase tracking-tighter">الرتبة الأكاديمية</p>
              <p className={styles.neonText + " text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black drop-shadow-2xl"}>{userLevel}</p>
              <div className="flex flex-col items-center justify-center gap-1 mt-2">
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/10 shadow-inner">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />
                  <span className="text-white font-black text-sm sm:text-base md:text-lg">{userXP.toLocaleString()} XP</span>
                </div>
              </div>
            </div>

            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-3 sm:p-4" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
              <circle cx="100" cy="100" r="88" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
              <m.circle
                initial={{ strokeDashoffset: 552 }}
                animate={{ strokeDashoffset: 552 * (1 - xpPercentage / 100) }}
                transition={{ duration: 2.5, ease: "circOut" }}
                cx="100" cy="100" r="88" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={552} className="text-primary drop-shadow-[0_0_12px_rgba(var(--primary),0.6)]" />
            </svg>
          </div>

          <m.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute -bottom-3 sm:-bottom-4 md:-bottom-6 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] sm:text-[10px] font-black px-3 py-1 sm:px-4 sm:py-1.5 rounded-full shadow-2xl z-20 whitespace-nowrap"
          >
            متبقي {(nextLevelXP - userXP % nextLevelXP).toLocaleString()} XP للترقية التالية 🎉
          </m.div>
        </div>
      </div>

      {/* --- Continue Learning Banner --- */}
      <AnimatePresence>
        {lastCourse && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-8"
          >
            <div className="relative group overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background p-6 md:p-8 shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                <div className="relative h-32 w-48 rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-2xl">
                  {lastCourse.thumbnailUrl ? (
                    <img src={lastCourse.thumbnailUrl} alt={lastCourse.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-primary" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-10 h-10 text-white fill-white" />
                  </div>
                </div>

                <div className="flex-1 text-center md:text-right space-y-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black">تابع من حيث توقفت</Badge>
                  <h3 className="text-2xl font-black text-white">{lastCourse.title}</h3>
                  <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span>إنجاز {lastCourse.progress}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>آخر دخول: {new Date(lastCourse.lastAccessedAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full mt-4 overflow-hidden border border-white/5">
                    <m.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${lastCourse.progress}%` }}
                      className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                    />
                  </div>
                </div>

                <Button asChild className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black gap-2 shrink-0 border-b-4 border-black/20">
                  <Link href={`/learning/${lastCourse.id}`}>
                    <Play className="w-5 h-5 fill-white" />
                    متابعة الدرس
                  </Link>
                </Button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <div className={styles.divider} />

      <StatsGrid
        currentStreak={userProgress?.currentStreak || 0}
        totalXP={userXP}
        achievementsCount={userProgress?.achievements?.length || 0}
      />
    </m.div>
  );
}

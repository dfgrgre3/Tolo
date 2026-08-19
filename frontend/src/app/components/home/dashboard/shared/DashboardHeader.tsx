"use client";

import { Sparkles, Flame } from "lucide-react";
import { User } from "@/types/user";
import { rpgCommonStyles } from "./styles";
import { LevelProgressSection } from "../sections/LevelProgressSection";

interface DashboardHeaderProps {
  user: User;
  /** Consecutive study days, read from gamification progress. */
  currentStreak: number;
  /** Minutes studied in the trailing week. */
  weeklyMinutes: number;
}

/**
 * Greeting header. Every figure shown here is measured, so when the learner has
 * no activity yet the copy invites them to start rather than showing zeros as
 * if they were achievements.
 */
export function DashboardHeader({ user, currentStreak, weeklyMinutes }: DashboardHeaderProps) {
  const firstName = user.name?.split(" ")[0] || "بك";
  const todayDate = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const weeklyHours = Math.floor(weeklyMinutes / 60);
  const remainderMinutes = weeklyMinutes % 60;

  return (
    <header className="relative z-10">
      <div className="relative overflow-hidden rounded-[3rem] bg-card/40 border border-border p-10 md:p-16 shadow-2xl backdrop-blur-2xl mb-12 ring-1 ring-border/5">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-50 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/30 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center gap-10">
          <div className="space-y-8 max-w-4xl">
            {currentStreak > 0 && (
              <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-black tracking-wide backdrop-blur-md">
                <Flame className="w-4 h-4 fill-orange-400 text-orange-400" />
                سلسلة {currentStreak} يوم متتالي
              </div>
            )}

            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-black text-foreground tracking-tighter leading-[1.15]">
                أهلاً{" "}
                <span className={`${rpgCommonStyles.neonText} drop-shadow-[0_0_35px_rgba(168,85,247,0.6)]`}>
                  {firstName}
                </span>
              </h1>
            </div>

            <p className="text-xl md:text-2xl text-gray-400 font-medium leading-relaxed max-w-3xl mx-auto">
              {weeklyMinutes > 0
                ? `ذاكرت ${weeklyHours} ساعة و${remainderMinutes} دقيقة هذا الأسبوع. تابع تقدمك بالأسفل.`
                : "لم تسجل أي جلسة مذاكرة هذا الأسبوع. ابدأ الآن لتظهر إحصائياتك هنا."}
            </p>
          </div>

          <div className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 shadow-inner">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-gray-300 font-bold text-lg">{todayDate}</span>
          </div>
        </div>

        <div className="relative">
          <LevelProgressSection user={user} />
        </div>
      </div>
    </header>
  );
}

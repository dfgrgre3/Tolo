"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { m } from "framer-motion";
import { AlertCircle, Trophy, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fetchLeaderboard } from "@/lib/api/gamification-client";
import type { LeaderboardEntry } from "@/types/gamification";

const getDisplayName = (entry: LeaderboardEntry) => entry.username || entry.name || "مستخدم بدون اسم";

export function LeaderboardCard() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchLeaderboard("global", 3)
      .then((entries) => {
        if (!isMounted) return;
        setLeaders(entries);
        setHasError(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setLeaders([]);
        setHasError(true);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const STYLES = {
    glass: "relative overflow-hidden rounded-[2rem] border border-white/5 bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5"
  };

  return (
    <m.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={STYLES.glass + " p-6 space-y-4 hover:border-amber-500/20 transition-all duration-500"}>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black flex items-center gap-3">
          <Trophy className="text-amber-400 w-5 h-5" />
          <span>لوحة الشرف</span>
        </h2>
        <Badge variant="outline" className="text-[10px] font-black border-amber-500/20 text-amber-500 rounded-full h-5">
          بيانات فعلية
        </Badge>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-[66px] animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
            ))}
          </div>
        ) : hasError ? (
          <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-bold text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            تعذر تحميل لوحة الشرف
          </div>
        ) : leaders.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-center">
            <Zap className="mx-auto h-9 w-9 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-bold text-muted-foreground">لا توجد نتائج حقيقية حاليا</p>
          </div>
        ) : (
          leaders.map((user) => (
            <div
              key={user.userId || user.id || user.rank}
              className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all group">
              <div className="flex min-w-0 items-center gap-4">
                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-black text-sm ${user.rank === 1 ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' :
                    user.rank === 2 ? 'bg-gray-400 text-black' :
                      'bg-orange-800 text-white'}`
                }>
                  {user.rank}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-sm group-hover:text-primary transition-colors">{getDisplayName(user)}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Level {user.level}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <span className="text-sm font-black text-amber-500">{user.totalXP.toLocaleString()} XP</span>
              </div>
            </div>
          ))
        )}
      </div>

      <Link href="/leaderboard" className="block w-full py-3 text-center text-xs font-black text-gray-500 hover:text-white transition-colors border-t border-white/5 mt-2">
        عرض القائمة الكاملة
      </Link>
    </m.div>);

}

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Shield, Zap, Award, Flame } from 'lucide-react';
import type { TimeStats } from '../types';

interface MasterySystemProps {
  stats: TimeStats;
}

const MasterySystem = ({ stats }: MasterySystemProps) => {
  const { level, xp, nextLevelXp, rank, streakDays, focusScore, disciplineScore } = stats;

  const getRankColor = (lvl: number) => {
    if (lvl >= 50) return "text-amber-600 dark:text-amber-400";
    if (lvl >= 40) return "text-purple-400";
    if (lvl >= 30) return "text-blue-600 dark:text-blue-400";
    if (lvl >= 20) return "text-primary-strong";
    if (lvl >= 10) return "text-rose-400";
    return "text-muted-foreground";
  };

  const rankColor = getRankColor(level);

  return (
    <Card className="bg-background/40 backdrop-blur-xl border-border overflow-hidden relative group">
      {/* Animated background glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-[80px] group-hover:bg-orange-500/20 transition-all duration-700" />
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            نظام الإتقان (Level {level})
          </CardTitle>
          <div className={`px-3 py-1 rounded-full bg-muted/60 border border-border text-xs font-bold ${rankColor}`}>
            {rank}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* XP Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">الخبرة (XP)</span>
            <span className="font-mono">{xp} / {nextLevelXp}</span>
          </div>
          <div className="relative h-3 w-full bg-muted/60 rounded-full overflow-hidden border border-border">
            <div
              className="absolute inset-y-0 start-0 bg-gradient-to-r from-orange-500 via-amber-400 to-blue-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col items-center text-center group/item hover:bg-muted transition-all">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mb-2 group-hover/item:scale-110 transition-transform">
              <Flame className="h-5 w-5 text-orange-600 dark:text-orange-500" />
            </div>
            <span className="text-2xl font-black">{streakDays}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">يوم متتالي</span>
          </div>

          <div className="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col items-center text-center group/item hover:bg-muted transition-all">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-2 group-hover/item:scale-110 transition-transform">
              <Shield className="h-5 w-5 text-blue-500" />
            </div>
            <span className="text-2xl font-black">{disciplineScore}%</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">الانضباط</span>
          </div>

          <div className="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col items-center text-center group/item hover:bg-muted transition-all">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-2 group-hover/item:scale-110 transition-transform">
              <Zap className="h-5 w-5 text-purple-500" />
            </div>
            <span className="text-2xl font-black">{focusScore}%</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">التركيز</span>
          </div>

          <div className="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col items-center text-center group/item hover:bg-muted transition-all">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center mb-2 group-hover/item:scale-110 transition-transform">
              <Award className="h-5 w-5 text-rose-500" />
            </div>
            <span className="text-2xl font-black">{stats.masteryScore}%</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">الإتقان</span>
          </div>
        </div>

        {/* Level Path Mini-Map */}
        <div className="pt-2 border-t border-border">
          <div className="flex justify-between items-center px-2">
            {[1, 2, 3, 4, 5].map((i) => {
              const currentPoint = Math.floor(level / 5) * 5 + i;
              const isPast = currentPoint < level;
              const isCurrent = currentPoint === level;
              
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    isCurrent ? "bg-orange-500 border-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]" : 
                    isPast ? "bg-orange-500/40 border-orange-500/20" : "bg-muted/60 border-border"
                  }`} />
                  <span className="text-[10px] font-bold opacity-50">{currentPoint}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MasterySystem;

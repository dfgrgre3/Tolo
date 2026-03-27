"use client";

import React from "react";
import { Flame, Clock, Target, Trophy } from "lucide-react";

interface StatsGridProps {
  currentStreak: number;
  totalXP: number;
  achievementsCount: number;
}

export function StatsGrid({ currentStreak, totalXP, achievementsCount }: StatsGridProps) {
  const stats = [
    {
       label: "سلسلة الانتصارات",
       value: `${currentStreak || 0} يوم`,
       icon: Flame,
       color: "orange",
       bgColor: "bg-orange-500/10",
       borderColor: "border-orange-500/20",
       textColor: "text-orange-400",
       glowColor: "shadow-[0_0_15px_rgba(249,115,22,0.1)]"
    },
    {
       label: "ساعات التدريب",
       value: `${Math.floor(totalXP / 100)} صاعة`,
       icon: Clock,
       color: "blue",
       bgColor: "bg-blue-500/10",
       borderColor: "border-blue-500/20",
       textColor: "text-blue-400",
       glowColor: "shadow-[0_0_15px_rgba(59,130,246,0.1)]"
    },
    {
       label: "دقة الإنجاز",
       value: "92%",
       icon: Target,
       color: "emerald",
       bgColor: "bg-emerald-500/10",
       borderColor: "border-emerald-500/20",
       textColor: "text-emerald-400",
       glowColor: "shadow-[0_0_15px_rgba(16,185,129,0.1)]"
    },
    {
       label: "الأوسمة",
       value: `${achievementsCount || 0} وسام`,
       icon: Trophy,
       color: "amber",
       bgColor: "bg-amber-500/10",
       borderColor: "border-amber-500/20",
       textColor: "text-amber-400",
       glowColor: "shadow-[0_0_15px_rgba(245,158,11,0.1)]"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, idx) => (
        <div 
          key={idx}
          className="flex items-center gap-4 group cursor-default p-4 rounded-3xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
        >
          <div className={`p-4 rounded-2xl ${stat.bgColor} border ${stat.borderColor} ${stat.textColor} group-hover:scale-110 group-hover:rotate-12 transition-all ${stat.glowColor}`}>
            <stat.icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
            <p className="text-white font-black text-2xl">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import type { UserDetails } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Zap, BookOpen, Crown } from "lucide-react";

export function UserStatsGrid({ user }: { user: UserDetails }) {
  const stats = [
    { label: "إجمالي الخبرة (XP)", value: user.totalXP.toLocaleString(), icon: Flame, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "التتابع الحالي", value: user.currentStreak, icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "ساعات المذاكرة", value: Math.floor(user.totalStudyTime / 60), icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "الاختبارات المجتازة", value: user.examsPassed, icon: Crown, color: "text-purple-500", bg: "bg-purple-500/10" }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-4">
      {stats.map((stat, i) => (
        <Card key={i} className="border-none shadow-xl bg-card/50 backdrop-blur-md overflow-hidden relative group hover:scale-[1.02] transition-all duration-300">
          <CardContent className="p-6">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
              <stat.icon className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-3xl font-black tracking-tight">{stat.value}</h3>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </CardContent>
          <div className={`absolute bottom-0 left-0 h-1.5 w-full scale-x-0 group-hover:scale-x-100 transition-transform origin-right ${stat.bg.replace('/10', '')} opacity-50`} />
        </Card>
      ))}
    </div>
  );
}

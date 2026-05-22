"use client";

import React, { memo } from 'react';
import Link from "next/link";
import { m } from "framer-motion";
import { Trophy, Star, Award, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { rpgCommonStyles } from "../constants";

// --- Types ---
export interface Achievement {
  id: string;
  icon?: React.ReactNode;
  title: string;
  description: string;
  progress: number;
  color?: string;
  iconName?: string; // Fallback for serializable data
}

export interface AchievementStat {
  id: string;
  icon?: React.ReactNode;
  value: string | number;
  label: string;
  color?: string;
}

interface AchievementsSectionProps {
  achievements?: Achievement[];
  stats?: AchievementStat[];
  loading?: boolean;
}

// --- Constants & Defaults ---
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
{ id: '1', title: "بطل الدراسة", description: "أكمل 10 أيام متتالية من المذاكرة", progress: 70, color: "from-yellow-400 to-amber-500", icon: <Trophy className="text-white" /> },
{ id: '2', title: "نجم المواد", description: "احصل على معدل 90% في 3 مواد", progress: 45, color: "from-blue-400 to-indigo-500", icon: <Star className="text-white" /> },
{ id: '3', title: "محلل ممتاز", description: "استخدم أدوات التحليل 5 أيام", progress: 80, color: "from-purple-400 to-pink-500", icon: <Award className="text-white" /> }];


const DEFAULT_STATS: AchievementStat[] = [
{ id: 'completed', icon: <CheckCircle2 className="w-5 h-5 text-green-400" />, value: "12", label: "إنجاز مكتمل", color: "bg-green-500/10 border-green-500/20" },
{ id: 'points', icon: <Star className="w-5 h-5 text-yellow-400" />, value: "2,450", label: "نقطة مكافأة", color: "bg-yellow-500/10 border-yellow-500/20" },
{ id: 'rank', icon: <Trophy className="w-5 h-5 text-purple-400" />, value: "#42", label: "الترتيب الحالي", color: "bg-purple-500/10 border-purple-500/20" }];


// --- Sub-components ---
const AchievementCard = memo(({ achievement, index }: {achievement: Achievement;index: number;}) =>
<m.div
  initial={{ opacity: 0, scale: 0.9 }}
  whileInView={{ opacity: 1, scale: 1 }}
  viewport={{ once: true }}
  transition={{ delay: index * 0.1, duration: 0.4 }}
  whileHover={{ y: -5 }}
  className="h-full">
  
    <div className={`${rpgCommonStyles.card} p-5 group`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${achievement.color || "from-primary to-primary/50"} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      
      <div className="relative z-10 flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${achievement.color || "from-gray-700 to-gray-600"} flex items-center justify-center shrink-0 shadow-lg`}>
          {achievement.icon || <Trophy className="h-6 w-6 text-white" />}
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-bold text-gray-100 group-hover:text-primary transition-colors">{achievement.title}</h3>
          <p className="text-xs text-muted-foreground leading-snug">{achievement.description}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 relative z-10">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-gray-400">التقدم</span>
          <span className="text-primary">{achievement.progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
          <m.div
          initial={{ width: 0 }}
          whileInView={{ width: `${achievement.progress}%` }}
          transition={{ duration: 1, delay: 0.2 }}
          className={`h-full rounded-full bg-gradient-to-r ${achievement.color || "from-primary to-purple-500"}`} />
        
        </div>
      </div>
    </div>
  </m.div>
);
AchievementCard.displayName = "AchievementCard";

export const AchievementsSection = memo(function AchievementsSection({
  achievements = DEFAULT_ACHIEVEMENTS,
  stats = DEFAULT_STATS,
  loading = false
}: AchievementsSectionProps) {

  if (loading) {
    return <div className="h-64 animate-pulse bg-white/5 rounded-3xl" />;
  }

  return (
    <section className={rpgCommonStyles.glassPanel + " px-6 py-10"}>
       <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 mix-blend-overlay pointer-events-none" />
       
       <div className="relative z-10">
         <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
            <div className="text-center md:text-right">
              <Badge variant="outline" className="mb-3 bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20 backdrop-blur-sm">
                <Sparkles className="h-3 w-3 mr-2" />
                <span>لوحة الشرف</span>
              </Badge>
              <h2 className={`text-3xl font-black ${rpgCommonStyles.goldText}`}>
                إنجازاتك الأسطورية
              </h2>
              <p className="text-muted-foreground text-sm mt-1">سجلك الحافل بالانتصارات والأوسمة</p>
            </div>

            {/* Quick Stats Row */}
            <div className="flex flex-wrap justify-center gap-3">
              {stats.map((stat) =>
            <div key={stat.id} className={`flex items-center gap-3 px-4 py-2 rounded-xl border backdrop-blur-md ${stat.color || "bg-white/5 border-white/10"}`}>
                  <div className="shrink-0">{stat.icon}</div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white leading-none">{stat.value}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{stat.label}</div>
                  </div>
                </div>
            )}
            </div>
         </div>

         <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">
           {achievements.map((ach, idx) =>
          <AchievementCard key={ach.id} achievement={ach} index={idx} />
          )}
         </div>

         <div className="text-center">
            <Link href="/achievements">
              <Button size="lg" variant="ghost" className="group text-gray-300 hover:text-white hover:bg-white/10">
                <span>عرض سجل الأوسمة الكامل</span>
                <ArrowRight className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </Button>
            </Link>
         </div>
       </div>
    </section>);

});

export default AchievementsSection;
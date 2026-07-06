"use client";

import React from "react";
import { BookOpen, Users, DollarSign, Star, Award, GraduationCap, CheckCircle2, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { InstructorStats } from "../hooks/use-teaching-data";

interface DashboardCardsProps {
  stats: InstructorStats;
}

export default function DashboardCards({ stats }: DashboardCardsProps) {
  const cardData = [
    {
      title: "إجمالي الإيرادات",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      description: "صافي الأرباح المحققة",
      change: "+12.5%",
      changeType: "up",
      icon: DollarSign,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      title: "الطلاب النشطون",
      value: stats.totalStudents.toLocaleString(),
      description: "طالب يدرسون حالياً",
      change: "+8.2%",
      changeType: "up",
      icon: Users,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "معدل إكمال الكورسات",
      value: `${stats.completionRate}%`,
      description: "نسبة إنهاء المحاضرات",
      change: "+2.4%",
      changeType: "up",
      icon: CheckCircle2,
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20",
    },
    {
      title: "متوسط التقييم",
      value: stats.averageRating.toString(),
      description: "من إجمالي آراء الطلاب",
      change: "+0.1",
      changeType: "up",
      icon: Star,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-right">
      {cardData.map((card, i) => {
        const Icon = card.icon;
        return (
          <Card key={i} className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/10 px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{card.change}</span>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  {card.value}
                </h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-350">
                  {card.title}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-450">
                  {card.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

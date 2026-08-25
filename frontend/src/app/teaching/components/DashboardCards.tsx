"use client";

import React from "react";
import { BookOpen, Users, DollarSign, Star } from "lucide-react";
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
      icon: DollarSign,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      title: "الطلاب النشطون",
      value: stats.totalStudents.toLocaleString(),
      description: "إجمالي الطلاب المسجلين",
      icon: Users,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "الكورسات النشطة",
      value: `${stats.publishedCourses || stats.totalCourses || 0}`,
      description: "كورسات منشورة بالمنصة",
      icon: BookOpen,
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20",
    },
    {
      title: "متوسط التقييم",
      value: (stats.averageRating || 5.0).toFixed(1),
      description: "من إجمالي آراء الطلاب",
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

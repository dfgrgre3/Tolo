"use client";

import React from "react";
import { UserPlus, Star, BookOpen, FileText } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ActivityLog } from "../hooks/use-teaching-data";

interface RecentActivityProps {
  activities: ActivityLog[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const getIcon = (type: ActivityLog["type"]) => {
    switch (type) {
      case "enrollment":
        return { icon: UserPlus, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" };
      case "review":
        return { icon: Star, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20" };
      case "submission":
        return { icon: FileText, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20" };
      default:
        return { icon: BookOpen, color: "text-slate-500 bg-slate-50 dark:bg-slate-800/20" };
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-card text-right">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
          آخر النشاطات والتفاعلات
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">لا توجد تفاعلات مؤخراً</p>
        ) : (
          <div className="relative border-r border-slate-100 dark:border-slate-850 pr-4 space-y-6">
            {activities.map((act) => {
              const { icon: Icon, color } = getIcon(act.type);
              return (
                <div key={act.id} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className={`absolute -right-[27px] top-0.5 w-5 h-5 rounded-full border-4 border-card flex items-center justify-center ${color}`}>
                    <Icon className="w-2.5 h-2.5" />
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-medium">
                      {act.messageAr}
                    </p>
                    <span className="text-[10px] text-slate-400 block">
                      {act.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import React from "react";
import { m } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface ActivityItem {
  id: string;
  type: "achievement" | "task_completed" | "exam_finished" | "study_session" | "milestone" | "notification";
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ReactNode;
  color: string;
  user?: string;
}

interface ActivityCardProps {
  activity: ActivityItem;
  index: number;
}

export const ActivityCard = ({ activity, index }: ActivityCardProps) => {
  const formatTime = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true, locale: ar });
    } catch {
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      if (seconds < 60) return "منذ قليل";
      if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
      if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
      return `منذ ${Math.floor(seconds / 86400)} يوم`;
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      layout
    >
      <Card className="bg-black/40 border-white/5 shadow-2xl hover:bg-white/5 hover:border-blue-500/30 transition-all duration-500 group/item relative overflow-hidden backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 translate-x-[-100%] group-hover/item:animate-shimmer" />
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className={`flex-shrink-0 rounded-2xl p-4 border ${activity.color} transition-all duration-500 group-hover/item:scale-110 group-hover/item:rotate-3 shadow-xl relative z-10`}>
              {activity.icon}
            </div>
            
            <div className="flex-1 min-w-0 relative z-10">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-black text-gray-100 text-xl group-hover/item:text-blue-400 transition-colors">
                  {activity.title}
                </h3>
                <span className="flex-shrink-0 text-xs font-bold text-gray-500 flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  <Clock className="h-3 w-3 text-blue-400" />
                  {formatTime(activity.timestamp)}
                </span>
              </div>
              
              <p className="text-gray-400 text-base mb-6 leading-relaxed line-clamp-2 group-hover/item:text-gray-300 transition-colors">
                {activity.description}
              </p>

              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase tracking-[0.2em] font-black border-white/10 bg-white/5 text-gray-400 px-3 py-1"
                >
                  {activity.type === "achievement" && "إنجاز ملحمي (Epic Achievement)"}
                  {activity.type === "task_completed" && "تم إكمال المهمة (Quest Clear)"}
                  {activity.type === "study_session" && "جلسة مذاكرة (Training Log)"}
                  {activity.type === "milestone" && "إنجاز مرحلي (Level Milestone)"}
                  {activity.type === "notification" && "تنبيه النظام (System Alert)"}
                </Badge>
                {index === 0 && (
                  <Badge className="text-[10px] uppercase font-black px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                    جديد (NEW)
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
};

export default ActivityCard;

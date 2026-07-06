"use client";

import React from "react";
import { Plus, Video, Calendar, Megaphone, FileCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onCreateCourse: () => void;
  onUploadVideo?: () => void;
  onScheduleSession?: () => void;
  onSendAnnouncement?: () => void;
}

export default function QuickActions({
  onCreateCourse,
  onUploadVideo,
  onScheduleSession,
  onSendAnnouncement,
}: QuickActionsProps) {
  const actions = [
    {
      label: "إنشاء كورس جديد",
      description: "صمم منهجك التعليمي وابدأ النشر",
      icon: Plus,
      color: "bg-primary text-white hover:bg-primary/95",
      onClick: onCreateCourse,
    },
    {
      label: "جدولة حصة مباشرة",
      description: "تفاعل مع الطلاب عبر بث حي",
      icon: Video,
      color: "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
      onClick: onScheduleSession || (() => {}),
    },
    {
      label: "إرسال إعلان عام",
      description: "أرسل تنبيهاً لكافة الطلاب المشتركين",
      icon: Megaphone,
      color: "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
      onClick: onSendAnnouncement || (() => {}),
    },
  ];

  return (
    <div className="space-y-4 text-right">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">إجراءات سريعة</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((act, idx) => {
          const Icon = act.icon;
          return (
            <button
              key={idx}
              onClick={act.onClick}
              className={`p-5 rounded-2xl border border-slate-200 dark:border-slate-850 flex items-center gap-4 text-right transition-all duration-300 group hover:border-primary/45 ${
                idx === 0
                  ? "bg-gradient-to-l from-primary/90 to-primary text-white shadow-lg shadow-primary/10 hover:shadow-primary/20"
                  : "bg-card hover:bg-slate-50 dark:hover:bg-slate-900/40"
              }`}
            >
              <div className={`p-3 rounded-xl ${
                idx === 0 ? "bg-white/20 text-white" : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground"
              }`}>
                <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-xs font-bold">{act.label}</h4>
                <p className={`text-[10px] ${idx === 0 ? "text-white/80" : "text-slate-400 dark:text-slate-450"}`}>
                  {act.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

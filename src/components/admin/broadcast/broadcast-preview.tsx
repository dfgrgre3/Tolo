"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageType } from "./types";
import { Bell } from "lucide-react";

interface BroadcastPreviewProps {
  title: string;
  message: string;
  type: MessageType;
  actionUrl?: string;
}

const TYPE_STYLES: Record<MessageType, string> = {
  info: "bg-blue-900/20 border-blue-500/30 text-blue-100",
  success: "bg-emerald-900/20 border-emerald-500/30 text-emerald-100",
  warning: "bg-amber-900/20 border-amber-500/30 text-amber-100",
  error: "bg-rose-900/20 border-rose-500/30 text-rose-100",
};

export function BroadcastPreview({ title, message, type, actionUrl }: BroadcastPreviewProps) {
  return (
    <div className="flex items-center justify-center py-6 min-h-[400px]">
      <div 
        className={`w-full max-w-md p-8 rounded-[3rem] border shadow-2xl relative overflow-hidden transition-all duration-500 ${TYPE_STYLES[type]}`}
      >
        <div className="space-y-6 relative z-10 text-right" dir="rtl">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-1 rounded-full ${type === 'info' ? 'bg-blue-400' : type === 'success' ? 'bg-emerald-400' : type === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">تنبيه إداري</span>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-black leading-tight">
              {title || "عنوان التنبيه سيظهر هنا"}
            </h3>
            <p className="text-lg font-bold leading-relaxed opacity-90 line-clamp-6">
              {message || "محتوى التنبيه الإداري سيظهر في هذه المساحة..."}
            </p>
          </div>

          {actionUrl && (
            <div className="pt-4">
              <div className="w-full h-14 bg-white/10 rounded-2xl flex items-center justify-center font-black text-sm border border-white/20">
                عرض التفاصيل
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center gap-4 pt-6 border-t border-white/10 text-right" dir="rtl">
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-white/20 shadow-lg">
              <AvatarFallback className="bg-primary/20 text-primary font-black">AD</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1 border border-black">
              <Bell className="w-2 h-2 text-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <p className="text-xs font-black">من: إدارة المنصة</p>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
               <p className="text-[10px] font-bold opacity-60">بث مباشر</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

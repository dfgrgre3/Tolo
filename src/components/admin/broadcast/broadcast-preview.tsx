"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageType, UserModel } from "./types";
import { Bell, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface BroadcastPreviewProps {
  title: string;
  message: string;
  type: MessageType;
  actionUrl?: string;
  selectedUsers?: UserModel[];
}

const TYPE_STYLES: Record<MessageType, string> = {
  info: "bg-blue-900/20 border-blue-500/30 text-blue-100",
  success: "bg-emerald-900/20 border-emerald-500/30 text-emerald-100",
  warning: "bg-amber-900/20 border-amber-500/30 text-amber-100",
  error: "bg-rose-900/20 border-rose-500/30 text-rose-100",
};

export function BroadcastPreview({ title, message, type, actionUrl, selectedUsers = [] }: BroadcastPreviewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-6 min-h-[400px]">
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

      {/* Selected Users Preview */}
      <div className="bg-black/20 rounded-[2rem] border border-white/5 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h4 className="font-black text-white">المستلمون ({selectedUsers.length})</h4>
          </div>
          {selectedUsers.length > 6 && (
            <span className="text-xs text-muted-foreground font-bold">+{selectedUsers.length - 6} آخرين</span>
          )}
        </div>

        {selectedUsers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/40">
            <Users className="h-12 w-12 mb-2" />
            <p className="text-sm font-bold">لم يتم اختيار أي مستخدم</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar-none">
            {selectedUsers.slice(0, 6).map((user, index) => (
              <div 
                key={user.id} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all",
                  "bg-white/5 border border-white/5"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Avatar className="h-8 w-8 border border-white/10">
                  <AvatarImage src={user.avatar || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-black">
                    {user.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate">{user.name || "مستخدم"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  {user.role && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-bold",
                      user.role === "ADMIN" ? "bg-red-500/20 text-red-400" :
                      user.role === "TEACHER" ? "bg-orange-500/20 text-orange-400" :
                      "bg-purple-500/20 text-purple-400"
                    )}>
                      {user.role === "ADMIN" ? "إداري" : user.role === "TEACHER" ? "معلم" : "طالب"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-bold">إجمالي المستلمين:</span>
            <span className="font-black text-primary text-lg">{selectedUsers.length} مستخدم</span>
          </div>
        </div>
      </div>
    </div>
  );
}

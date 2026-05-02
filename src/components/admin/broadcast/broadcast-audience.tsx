"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserModel } from "./types";
import { Users, Shield } from "lucide-react";

interface BroadcastAudienceProps {
  users: UserModel[];
}

export function BroadcastAudience({ users }: BroadcastAudienceProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40">
        <Users className="h-16 w-16 mb-4" />
        <p className="font-bold text-sm">جاري جلب بيانات المستخدمين المستهدفين...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/20 rounded-3xl p-6 border border-white/5 backdrop-blur-xl group">
        <div className="flex items-center gap-4">
           <div className="p-4 bg-primary/10 rounded-2xl">
              <Shield className="w-8 h-8 text-primary" />
           </div>
           <div>
              <h4 className="text-xl font-black text-white">المستخدمين المستهدفين</h4>
              <p className="text-xs text-muted-foreground font-bold">سيتم إرسال الرسالة لـ {users.length} مستهدف نشط</p>
           </div>
        </div>
        
        <div className="flex gap-2">
           <div className="flex flex-col items-center justify-center px-6 py-2 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] font-black uppercase text-primary tracking-widest px-1">إجمالي المستلمين</span>
              <span className="text-lg font-black text-white">{users.length} مستخدم</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-1">
        {users.map((u) => (
          <div 
            key={u.id} 
            className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.08] rounded-[2rem] border border-white/5 hover:border-white/20 transition-all group overflow-hidden relative"
          >
            <div className="relative">
              <Avatar className="h-12 w-12 border-2 border-white/10 shadow-lg">
                <AvatarImage src={u.avatar || ""} className="object-cover" />
                <AvatarFallback className="bg-primary/20 text-primary font-black text-xs">{u.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            </div>

            <div className="overflow-hidden relative z-10">
              <p className="text-xs font-black truncate group-hover:text-primary transition-colors">{u.name || "مستخدم"}</p>
              <p className="text-[9px] text-muted-foreground font-bold opacity-60 truncate tracking-tight">{u.email}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

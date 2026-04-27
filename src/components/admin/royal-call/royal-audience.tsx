"use client";

import { m } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserModel } from "./types";
import { Users, Shield, Zap } from "lucide-react";

interface RoyalAudienceProps {
  users: UserModel[];
}

export function RoyalAudience({ users }: RoyalAudienceProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse text-muted-foreground/40">
        <Users className="h-16 w-16 mb-4" />
        <p className="font-black italic text-sm">جاري جلب سجلات المحاربين المستهدفين...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/40 rounded-3xl p-6 border border-white/5 backdrop-blur-xl shadow-inner group">
        <div className="flex items-center gap-4">
           <div className="p-4 bg-amber-500/10 rounded-2xl group-hover:bg-amber-500/20 transition-all">
              <Shield className="w-8 h-8 text-amber-500 shadow-amber-500/10" />
           </div>
           <div>
              <h4 className="text-xl font-black tracking-tighter text-white">تحشيد المحاربين</h4>
              <p className="text-[10px] text-muted-foreground font-bold italic">سيتم بث المرسوم لـ {users.length} من أتباع الإمبراطورية</p>
           </div>
        </div>
        
        <div className="flex gap-2">
           <div className="flex flex-col items-center justify-center px-6 py-2 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-colors">
              <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest px-1">القوة الاجمالية</span>
              <span className="text-lg font-black text-white">{users.reduce((acc, u) => acc + (u.level || 0), 0) * 100} XP</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-1">
        {users.map((u, i) => (
          <m.div 
            key={u.id} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.08] rounded-[2rem] border border-white/5 hover:border-white/20 transition-all group overflow-hidden relative"
          >
            {/* Background design */}
            <div className="absolute -right-2 top-0 p-2 opacity-5 scale-150 rotate-12 transition-transform duration-500 group-hover:rotate-0">
               <Zap className="w-12 h-12 text-primary" />
            </div>

            <div className="relative">
              <Avatar className="h-12 w-12 border-2 border-white/10 shadow-lg ring-2 ring-primary/5 transition-transform group-hover:scale-110">
                <AvatarImage src={u.avatar || ""} className="object-cover" />
                <AvatarFallback className="bg-primary/20 text-primary font-black text-xs">{u.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-primary text-[8px] font-black text-white px-1.5 rounded-full border border-black shadow-sm tracking-tighter">
                LVL {u.level || 1}
              </div>
            </div>

            <div className="overflow-hidden relative z-10">
              <p className="text-xs font-black truncate group-hover:text-amber-500 transition-colors">{u.name || "محارب مجهول"}</p>
              <p className="text-[9px] text-muted-foreground font-bold opacity-60 truncate tracking-tight">{u.email}</p>
            </div>
          </m.div>
        ))}
      </div>
    </div>
  );
}

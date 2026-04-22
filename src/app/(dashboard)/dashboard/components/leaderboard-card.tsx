"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, Star, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const leaderData = [
{ id: 1, name: "عمر خالد", xp: "12,450", level: 12, rank: 1, trend: "up" },
{ id: 2, name: "سارة أحمد", xp: "11,200", level: 11, rank: 2, trend: "down" },
{ id: 3, name: "محمود علي", xp: "10,900", level: 10, rank: 3, trend: "up" }];


export function LeaderboardCard() {
  const STYLES = {
    glass: "relative overflow-hidden rounded-[2rem] border border-white/5 bg-card/40 shadow-2xl backdrop-blur-2xl ring-1 ring-border/5"
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={STYLES.glass + " p-6 space-y-4 hover:border-amber-500/20 transition-all duration-500"}>
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black flex items-center gap-3">
          <Trophy className="text-amber-400 w-5 h-5" />
          <span>لوحة المتصدرين</span>
        </h2>
        <Badge variant="outline" className="text-[10px] font-black border-amber-500/20 text-amber-500 rounded-full h-5">
          الأسبوع الحالي
        </Badge>
      </div>

      <div className="space-y-3">
        {leaderData.map((user, _idx) =>
        <div
          key={user.id}
          className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all cursor-pointer group">
          
            <div className="flex items-center gap-4">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
            user.rank === 1 ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' :
            user.rank === 2 ? 'bg-gray-400 text-black' :
            'bg-orange-800 text-white'}`
            }>
                  {user.rank}
               </div>
               <div>
                  <p className="font-bold text-sm group-hover:text-primary transition-colors">{user.name}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Level {user.level}</p>
               </div>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-sm font-black text-amber-500">{user.xp} XP</span>
               <div className="flex items-center gap-1 opacity-60">
                 {user.trend === 'up' ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <Star className="w-3 h-3 text-amber-500 animate-pulse" />}
               </div>
            </div>
          </div>
        )}
      </div>

      <button className="w-full py-3 text-xs font-black text-gray-500 hover:text-white transition-colors border-t border-white/5 mt-2">
         عرض القائمة الكاملة
      </button>
    </motion.div>);

}
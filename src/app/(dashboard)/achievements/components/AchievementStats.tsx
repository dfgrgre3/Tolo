"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AchievementStats as StatsType, AchievementCategory } from '../types';
import { getCategoryIcon, getCategoryLabel } from '../utils';
import { Trophy, Zap, Sparkles, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface AchievementStatsProps {
  stats: StatsType | null;
  userProgress: {totalXP: number;level: number;} | null;
}

const STYLES = {
  glass: "relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-6",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export function AchievementStats({ stats, userProgress }: AchievementStatsProps) {
  if (!stats) return null;

  const circleRadius = 38;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - stats.completionPercentage / 100 * circleCircumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12" dir="rtl">
			
			{/* --- Ancient Seal: Overall Completion --- */}
			<Card className={STYLES.glass + " p-0 group flex flex-col items-center justify-center min-h-[250px]"}>
				<div className="absolute inset-0 bg-primary/20 blur-[60px] opacity-0 group-hover:opacity-40 transition-opacity duration-700 rounded-full scale-150" />
				<CardContent className="p-8 relative z-10 flex flex-col items-center justify-center text-center gap-4">
					<div className="relative flex items-center justify-center">
						<svg className="w-32 h-32 transform -rotate-90">
							<circle
                cx="64"
                cy="64"
                r={circleRadius}
                className="stroke-white/5"
                strokeWidth="10"
                fill="none" />
              
							<motion.circle
                initial={{ strokeDashoffset: circleCircumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 2, ease: "easeOut" }}
                cx="64"
                cy="64"
                r={circleRadius}
                className="stroke-primary"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                style={{ strokeDasharray: circleCircumference }} />
              
						</svg>
						<div className="absolute inset-0 flex flex-col items-center justify-center">
							<span className={STYLES.neonText + " text-2xl uppercase tracking-tighter"}>{stats.completionPercentage}%</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">تزامن</span>
						</div>
					</div>
					<div className="space-y-1">
						<h3 className="font-black text-white text-lg">معدل الإتقان الكلي</h3>
						<p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stats.earned} من أصل {stats.total} إنجاز مكتسب</p>
					</div>
				</CardContent>
			</Card>

			{/* --- Thematic Mini Stats Column --- */}
			<div className="flex flex-col gap-5">
				 <div className={STYLES.glass + " p-5 flex items-center gap-4 group hover:border-primary/50 transition-all"}>
             <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 fill-amber-500/20" />
             </div>
             <div>
                <p className="text-3xl font-black text-white">{(userProgress?.totalXP || stats.totalXP).toLocaleString()}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">القوة القتالية (XP)</p>
             </div>
         </div>

         <div className={STYLES.glass + " p-5 flex items-center gap-4 group hover:border-emerald-500/50 transition-all"}>
             <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Trophy className="h-6 w-6 fill-emerald-500/20" />
             </div>
             <div>
                <p className="text-3xl font-black text-white">{stats.earned}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">إنجازات مفتوحة</p>
             </div>
         </div>

         <div className={STYLES.glass + " p-5 flex items-center gap-4 group hover:border-red-500/50 transition-all"}>
             <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 group-hover:scale-110 transition-transform">
                <Lock className="h-6 w-6 fill-red-500/20" />
             </div>
             <div>
                <p className="text-3xl font-black text-white">{stats.locked}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">أسرار مقفلة</p>
             </div>
         </div>
			</div>

			{/* --- Category Mastery Grid (Spans 2 columns) --- */}
			<Card className={STYLES.glass + " lg:col-span-2 p-0 border border-white/5"}>
				<CardHeader className="pb-1 pt-8 px-8 flex-row items-center justify-between">
					<div className="space-y-1">
             <CardTitle className="text-xl font-black text-white flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>خريطة التخصصات البرمجية</span>
             </CardTitle>
             <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">تحديثات المهارات المكتسبة عبر العوالم</p>
          </div>
          <div className="p-2 bg-white/5 rounded-xl border border-white/10">
             <LayoutGrid className="w-5 h-5 text-gray-400" />
          </div>
				</CardHeader>
				<CardContent className="px-8 pb-8 pt-4">
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 h-full">
						{(Object.entries(stats.byCategory) as [AchievementCategory, number][]).map(([category, count], idx) =>
            <motion.div
              key={category}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-primary/30 transition-all cursor-default group">
              
								<div className="text-4xl mb-3 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:scale-125 transition-transform duration-500">{getCategoryIcon(category)}</div>
								<div className="text-2xl font-black text-white">{count}</div>
								<div className="text-[9px] font-black text-gray-500 uppercase tracking-tighter mt-1 group-hover:text-primary transition-colors">
									{getCategoryLabel(category)}
								</div>
							</motion.div>
            )}
					</div>
				</CardContent>
			</Card>
		</div>);

}

function LayoutGrid(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>);

}
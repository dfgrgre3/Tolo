"use client";

import { useState } from 'react';
import { m } from "framer-motion";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Achievement } from '../types';
import {
  getCategoryIcon,
  getDifficultyLabel,
  getDifficultyColor,
  getRarityColor,
  getRarityLabel,
  formatRelativeTime } from
'../utils';
import {
  EyeOff,
  Lock,
  Zap,

  Clock } from



'lucide-react';
import { AchievementModal } from './AchievementModal';

interface AchievementCardProps {
  achievement: Achievement;
  index?: number;
}

const STYLES = {
  card: "rounded-3xl border border-border bg-card/60 backdrop-blur-3xl h-full p-0 flex flex-col group overflow-hidden transition-all duration-500",
};

export function AchievementCard({ achievement, index = 0 }: AchievementCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isEarned = achievement.isEarned || false;
  const rarity = achievement.rarity || 'common';

  const getRarityGlow = () => {
    switch (rarity) {
      case 'legendary':return 'from-amber-400 to-orange-600 shadow-amber-500/40';
      case 'epic':return 'from-purple-500 to-fuchsia-600 shadow-purple-500/40';
      case 'rare':return 'from-blue-500 to-cyan-600 shadow-blue-500/40';
      default:return 'from-emerald-500 to-teal-600 shadow-emerald-500/40';
    }
  };

  return (
    <>
			<m.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ y: -8 }}
        className="h-full relative group cursor-pointer"
        onClick={() => setIsModalOpen(true)}>
        
				{/* Radiant Glow for Earned Relics */}
				{isEarned &&
        <div className={`absolute inset-0 bg-gradient-to-tr ${getRarityGlow()} opacity-0 group-hover:opacity-20 blur-[80px] transition-all duration-700 rounded-full scale-150`} />
        }

				<Card className={`${STYLES.card} ${isEarned ? 'border-primary/30' : 'opacity-60 grayscale'}`}>
           <CardContent className="p-0 flex flex-col h-full">
              {/* Header: The Socket */}
              <div className="relative h-40 flex items-center justify-center overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.03] to-transparent" />

                 {/* Magical Socket Halo */}
                 <div className={`h-24 w-24 rounded-full border-2 border-dashed ${isEarned ? 'border-primary/50 animate-[spin_20s_linear_infinite]' : 'border-border'}`} />

                 <div className={`absolute text-6xl transition-all duration-700 ${isEarned ? 'group-hover:scale-125 z-10' : 'filter blur-sm opacity-20'}`}>
                    {achievement.icon || getCategoryIcon(achievement.category)}
                 </div>

                 {/* Status Badge */}
                 <div className="absolute top-4 right-4 translate-x-1/2 -translate-y-1/2">
                    {isEarned ?
                <Badge className="bg-amber-500 text-amber-950 font-black border-2 border-amber-950/40 rotate-12 shadow-lg">تم الاكتساب</Badge> :

                <div className="p-2 bg-muted/50 rounded-full border border-border">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                       </div>
                }
                 </div>

                 {/* Secret Indicator */}
                 {achievement.isSecret && !isEarned &&
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm z-20">
                       <EyeOff className="w-8 h-8 text-muted-foreground" />
                    </div>
              }
              </div>

              {/* Body: Relic Details */}
              <div className="p-6 flex flex-col gap-4 text-right flex-grow" dir="rtl">
                 <div className="space-y-1">
                    <h3 className={`text-xl font-black transition-all ${isEarned ? 'text-foreground' : 'text-muted-foreground blur-[1px]'}`}>
                       {achievement.isSecret && !isEarned ? 'إنجاز سري مدفون' : achievement.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 pt-1 transition-opacity">
                       <Badge variant="outline" className={`${getDifficultyColor(achievement.difficulty)} border-border font-bold uppercase tracking-widest text-[9px] px-2`}>
                          {getDifficultyLabel(achievement.difficulty)}
                       </Badge>
                       <Badge variant="outline" className={`${getRarityColor(rarity)} border-border font-black uppercase tracking-widest text-[9px] px-2`}>
                          {getRarityLabel(rarity)}
                       </Badge>
                    </div>
                 </div>

                 <p className={`text-sm leading-relaxed line-clamp-2 ${isEarned ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                    {achievement.isSecret && !isEarned ? 'استمر في استكشاف العالم التعليمي لفك تشفير هذه المهارة العظيمة.' : achievement.description}
                 </p>

                 {/* Mastery Progress Bar */}
                 {!isEarned && achievement.progress !== undefined && achievement.maxProgress && achievement.maxProgress > 0 &&
              <div className="space-y-1.5 pt-2">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest px-1">
                          <span className="text-muted-foreground">معدل الاكتساب</span>
                          <span className="text-primary">{achievement.progress} / {achievement.maxProgress}</span>
                       </div>
                       <div className="h-1.5 bg-muted rounded-full overflow-hidden border border-border/50">
                          <m.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, achievement.progress / achievement.maxProgress * 100)}%` }}
                    className="h-full bg-gradient-to-r from-primary to-accent" />

                       </div>
                    </div>
              }

                 {/* Footer: Power Crystal (XP Reward) */}
                 <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50">
                    <div className="flex items-center gap-2 px-3 py-1 bg-muted/40 rounded-xl border border-border">
                       <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                       <span className="text-sm font-black text-foreground">{achievement.xpReward}</span>
                       <span className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">XP</span>
                    </div>

                    {isEarned && achievement.earnedAt &&
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(achievement.earnedAt)}</span>
                       </div>
                }
                 </div>
              </div>
           </CardContent>
				</Card>
			</m.div>

			<AchievementModal
        achievement={achievement}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)} />
      
		</>);

}

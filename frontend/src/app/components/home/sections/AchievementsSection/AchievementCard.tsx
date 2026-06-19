"use client";

import React, { memo } from "react";
import { m } from "framer-motion";
import { Trophy } from "lucide-react";
import { rpgCommonStyles } from "../../constants";

export interface Achievement {
  id: string;
  icon?: React.ReactNode;
  title: string;
  description: string;
  progress: number;
  color?: string;
  iconName?: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  index: number;
}

export const AchievementCard = memo(({ achievement, index }: AchievementCardProps) => (
  <m.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1, duration: 0.4 }}
    whileHover={{ y: -5 }}
    className="h-full"
  >
    <div className={`${rpgCommonStyles.card} p-5 group`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${achievement.color || "from-primary to-primary/50"} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      
      <div className="relative z-10 flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${achievement.color || "from-gray-700 to-gray-600"} flex items-center justify-center shrink-0 shadow-lg`}>
          {achievement.icon || <Trophy className="h-6 w-6 text-white" />}
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-bold text-gray-100 group-hover:text-primary transition-colors">{achievement.title}</h3>
          <p className="text-xs text-muted-foreground leading-snug">{achievement.description}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 relative z-10">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-gray-400">التقدم</span>
          <span className="text-primary">{achievement.progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
          <m.div
            initial={{ width: 0 }}
            whileInView={{ width: `${achievement.progress}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            className={`h-full rounded-full bg-gradient-to-r ${achievement.color || "from-primary to-purple-500"}`}
          />
        </div>
      </div>
    </div>
  </m.div>
));

AchievementCard.displayName = "AchievementCard";

export default AchievementCard;

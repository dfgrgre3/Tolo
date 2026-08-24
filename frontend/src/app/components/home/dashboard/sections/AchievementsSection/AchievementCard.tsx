"use client";

import React, { memo } from "react";
import { Trophy } from "lucide-react";
import { rpgCommonStyles } from "../../shared/styles";

// ✅ 1. Type Safety: إزالة iconName غير المستخدم وتحديد الألوان المسموحة
export type AchievementColor = "primary" | "purple" | "emerald" | "amber" | "rose";

export interface Achievement {
  id: string;
  icon?: React.ReactNode;
  title: string;
  description: string;
  progress: number;
  color?: AchievementColor;
}

interface AchievementCardProps {
  achievement: Achievement;
  index: number;
  /** ✅ دعم التدويل بدلاً من النص الثابت */
  progressLabel?: string;
}

// ✅ 2. Color Mapping: حل مشكلة Tailwind Dynamic Classes
const COLOR_MAP: Record<AchievementColor, { gradient: string; bar: string }> = {
  primary: { gradient: "from-primary to-primary/50", bar: "from-primary to-purple-500" },
  purple: { gradient: "from-purple-600 to-purple-400", bar: "from-purple-500 to-fuchsia-500" },
  emerald: { gradient: "from-emerald-600 to-emerald-400", bar: "from-emerald-500 to-teal-500" },
  amber: { gradient: "from-amber-600 to-amber-400", bar: "from-amber-500 to-orange-500" },
  rose: { gradient: "from-rose-600 to-rose-400", bar: "from-rose-500 to-pink-500" },
};

const DEFAULT_COLOR: AchievementColor = "primary";

export const AchievementCard = memo(({ 
  achievement, 
  index, 
  progressLabel = "التقدم" 
}: AchievementCardProps) => {
  
  // ✅ 3. Clamping: ضمان أن التقدم بين 0 و 100 فقط
  const safeProgress = Math.min(100, Math.max(0, Math.round(achievement.progress)));
  const colors = COLOR_MAP[achievement.color || DEFAULT_COLOR];

  return (
    <div
      className="h-full"
    >
      {/* ✅ 4. Semantic HTML: استخدام article بدلاً من div */}
      <article className={`${rpgCommonStyles.card} p-5 group relative overflow-hidden`}>
        
        {/* خلفية التوهج عند التحويم */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-10 pointer-events-none`} 
          aria-hidden="true"
        />
      
        <div className="relative z-10 flex items-start gap-4">
          <div 
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shrink-0 shadow-lg`}
            aria-hidden="true"
          >
            {achievement.icon || <Trophy className="h-6 w-6 text-white" />}
          </div>
          
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-bold text-gray-100 group-hover:text-primary truncate">
              {achievement.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
              {achievement.description}
            </p>
          </div>
        </div>

        {/* ✅ 5. Accessibility: شريط تقدم حقيقي لقرّاء الشاشة */}
        <div className="mt-4 space-y-2 relative z-10">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-gray-300">{progressLabel}</span>
            <span className="text-primary tabular-nums">{safeProgress}%</span>
          </div>
          
          <div 
            role="progressbar"
            aria-valuenow={safeProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${achievement.title}: ${safeProgress}%`}
            className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden"
          >
            <div
              className={`h-full rounded-full bg-gradient-to-r ${colors.bar}`}
            />
          </div>
        </div>
      </article>
    </div>
  );
});

AchievementCard.displayName = "AchievementCard";

export default AchievementCard;
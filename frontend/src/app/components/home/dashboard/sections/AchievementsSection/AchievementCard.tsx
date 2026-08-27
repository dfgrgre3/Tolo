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
const COLOR_MAP: Record<AchievementColor, { solid: string; bar: string }> = {
  primary: { solid: "bg-primary", bar: "bg-primary" },
  purple: { solid: "bg-primary", bar: "bg-primary" },
  emerald: { solid: "bg-emerald-500", bar: "bg-emerald-500" },
  amber: { solid: "bg-amber-500", bar: "bg-amber-500" },
  rose: { solid: "bg-red-500", bar: "bg-red-500" },
};

const DEFAULT_COLOR: AchievementColor = "primary";

export const AchievementCard = memo(({ 
  achievement, 
  index: _index, 
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
        <div className="relative z-10 flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl ${colors.solid} flex items-center justify-center shrink-0`}
            aria-hidden="true"
          >
            {achievement.icon || <Trophy className="h-6 w-6 text-white" />}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-bold text-foreground group-hover:text-primary-strong truncate">
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
            <span className="text-muted-foreground">{progressLabel}</span>
            <span className="text-primary-strong tabular-nums">{safeProgress}%</span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={safeProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${achievement.title}: ${safeProgress}%`}
            className="h-1.5 w-full bg-background rounded-full overflow-hidden"
          >
            <div
              className={`h-full rounded-full ${colors.bar}`}
            />
          </div>
        </div>
      </article>
    </div>
  );
});

AchievementCard.displayName = "AchievementCard";

export default AchievementCard;
'use client';

import React from 'react';
import Image from 'next/image';
import { User } from '@/types/user';
import { UserProgress } from '@/types/gamification';
import { Zap, Crown, Target, Flame } from 'lucide-react';

interface LevelProgressProps {
  user: User;
  /** Gamification progress owned by the parent — this component stays pure
   * so the hero never opens its own data subscriptions. */
  progress?: UserProgress | null;
}

/** Derives the learner's initials for the avatar fallback. */
function initialsOf(name: string | null | undefined): string {
  if (!name) return '؟';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
}

/**
 * Compact level/XP strip rendered as a flat bordered card — same Noon panel
 * language as every dashboard section, no blur, no translucency.
 * Pure/presentational: zero hooks, re-renders only when its props change.
 */
function LevelProgressSectionBase({ user, progress }: LevelProgressProps) {
  const level = progress?.level ?? user.level ?? 1;
  const currentXP = progress?.totalXP ?? Number(user.totalXP ?? 0);

  // XP thresholds come from the backend so the curve is never guessed here.
  const currentLevelXP = progress?.currentLevelXP ?? 0;
  const nextLevelXP = progress?.nextLevelXP ?? 0;
  const xpIntoLevel = progress?.xpIntoLevel ?? 0;
  const remainingXP = progress?.xpToNextLevel ?? 0;

  const levelSpan = nextLevelXP - currentLevelXP;
  const progressPercent = levelSpan > 0 ? Math.min((xpIntoLevel / levelSpan) * 100, 100) : 0;

  const currentStreak = progress?.currentStreak ?? 0;
  const displayName = user.name || 'طالب';

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
      {/* Avatar + identity */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={displayName}
                width={56}
                height={56}
                unoptimized
                className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-black text-muted-foreground">{initialsOf(displayName)}</span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-black text-primary-foreground ring-2 ring-background">
            {level}
          </div>
        </div>

        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-black text-foreground truncate">
            <span className="truncate">{displayName}</span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary-strong">
              <Crown className="h-3 w-3" aria-hidden="true" />
              المستوى {level}
            </span>
          </p>
          {currentStreak > 0 ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400">
              <Flame className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              {currentStreak} يوم متتالي من المذاكرة
            </p>
          ) : (
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              ابدأ جلسة مذاكرة اليوم لتفتح سلسلة الأيام
            </p>
          )}
        </div>
      </div>

      {/* XP progress toward next level */}
      <div className="min-w-0 flex-1 sm:border-r sm:border-border sm:pr-4">
        <div className="mb-1.5 flex items-end justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-black tabular-nums text-foreground">
            <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
            {currentXP.toLocaleString('ar-EG')} نقطة خبرة
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium tabular-nums text-muted-foreground">
            <Target className="h-3 w-3" aria-hidden="true" />
            المستوى التالي {nextLevelXP.toLocaleString('ar-EG')}
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="font-medium tabular-nums text-muted-foreground">
            تبقى {remainingXP.toLocaleString('ar-EG')} نقطة للمستوى {level + 1}
          </span>
          <span className="font-black tabular-nums text-foreground">{Math.round(progressPercent)}%</span>
        </div>
      </div>
    </div>
  );
}

export const LevelProgressSection = React.memo(LevelProgressSectionBase);

'use client';

import React from 'react';
import Image from 'next/image';
import { User } from '@/types/user';
import { Zap, Crown, Target, Flame } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/hooks/use-gamification';

interface LevelProgressProps {
  user: User;
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

export const LevelProgressSection = ({ user }: LevelProgressProps) => {
  const { user: authUser } = useAuth();
  const { userProgress } = useGamification({ userId: authUser?.id || '' });

  const level = userProgress?.level ?? user.level ?? 1;
  const currentXP = userProgress?.totalXP ?? Number(user.totalXP ?? 0);

  // XP thresholds come from the backend so the curve is never guessed here.
  const currentLevelXP = userProgress?.currentLevelXP ?? 0;
  const nextLevelXP = userProgress?.nextLevelXP ?? 0;
  const xpIntoLevel = userProgress?.xpIntoLevel ?? 0;
  const remainingXP = userProgress?.xpToNextLevel ?? 0;

  const levelSpan = nextLevelXP - currentLevelXP;
  const progressPercent = levelSpan > 0 ? Math.min((xpIntoLevel / levelSpan) * 100, 100) : 0;

  const currentStreak = userProgress?.currentStreak ?? 0;
  const displayName = user.name || authUser?.username || 'طالب';

  return (
    <div
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl hover:bg-black/50 hover:border-white/20">

      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl mix-blend-overlay-slow" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl mix-blend-overlay" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">

        {/* Avatar, level badge and streak */}
        <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto text-center sm:text-right">
          <div className="relative group">
            <svg className="h-24 w-24 -rotate-90 text-transparent" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="3" className="text-white/20" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="46"
                stroke="currentColor"
                strokeWidth="3"
                className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                fill="none"
                strokeDasharray="289"
                strokeDashoffset={289 - (289 * progressPercent) / 100}
                style={{ }} />
            </svg>

            <div className="absolute inset-2 overflow-hidden rounded-full border-2 border-white/50 shadow-inner bg-violet-900/60 flex items-center justify-center">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={displayName}
                  width={80}
                  height={80}
                  unoptimized
                  className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-white/90">{initialsOf(displayName)}</span>
              )}
            </div>

            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-300 to-yellow-600 text-sm font-black text-yellow-900 shadow-lg ring-2 ring-violet-900 rotate-12">
              {level}
            </div>
          </div>

          <div className="text-white space-y-1">
            <h2 className="text-2xl font-bold flex flex-col sm:flex-row items-center gap-2">
              <span className="drop-shadow-md">{displayName}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium text-yellow-200 ring-1 ring-inset ring-white/20 backdrop-blur-sm">
                <Crown className="h-3 w-3 text-yellow-400" />
                المستوى {level}
              </span>
            </h2>
            {currentStreak > 0 ? (
              <p className="text-base text-orange-200 font-medium flex items-center gap-2 justify-center sm:justify-start">
                <Flame className="h-4 w-4 text-orange-400 fill-orange-400" />
                {currentStreak} يوم متتالي من المذاكرة
              </p>
            ) : (
              <p className="text-base text-indigo-100/90 font-medium">
                ابدأ جلسة مذاكرة اليوم لتفتح سلسلة الأيام
              </p>
            )}
          </div>
        </div>

        {/* XP progress toward the next level */}
        <div className="flex-1 w-full lg:max-w-xl bg-black/20 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
          <div className="flex justify-between items-end mb-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1">نقاط الخبرة (XP)</span>
              <span className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                {currentXP.toLocaleString('ar-EG')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-indigo-200">المستوى التالي</span>
              <div className="text-sm font-semibold text-white flex items-center gap-1 justify-end">
                <Target className="h-3 w-3" />
                {nextLevelXP.toLocaleString('ar-EG')}
              </div>
            </div>
          </div>

          <div className="relative h-6 w-full overflow-hidden rounded-full bg-gray-900/50 shadow-inner ring-1 ring-white/5">
            <div
              className="relative h-full rounded-full bg-gradient-to-l from-yellow-400 via-orange-500 to-pink-600 shadow-[0_0_15px_rgba(251,146,60,0.5)]">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/2 -skew-x-12" />
            </div>
          </div>

          <div className="mt-3 flex justify-between items-center text-xs">
            <span className="text-indigo-200/80 font-medium">
              تبقى {remainingXP.toLocaleString('ar-EG')} نقطة للمستوى {level + 1}
            </span>
            <span className="text-yellow-300 font-bold">{Math.round(progressPercent)}%</span>
          </div>
        </div>

      </div>
    </div>
  );
};

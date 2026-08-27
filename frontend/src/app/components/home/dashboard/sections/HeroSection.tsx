'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Flame,
  Timer,
  Target,
  Clock,
  ListChecks,
  Gauge,
} from 'lucide-react';
import { User } from '@/types/user';
import { UserProgress, ProgressSummary } from '@/types/gamification';
import { DASH_BUTTON, DASH_CARD } from '../shared/design-system';
import { LevelProgressSection } from './LevelProgressSection';

interface HeroSectionProps {
  user: User;
  /** Gamification progress fetched once by the page and handed down —
   * the hero opens no data subscriptions of its own. */
  progress?: UserProgress | null;
  /** Weekly progress summary from /api/progress/summary. */
  summary?: ProgressSummary | null;
}

/** Flat metric tile matching the dashboard's stat cards. */
function HeroStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className={`${DASH_CARD.stat} flex items-center gap-3`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-strong">
        {icon}
      </span>
      <span className="min-w-0">
        <span className={`block leading-tight ${DASH_CARD.statValue}`}>{value}</span>
        <span className={`mt-0.5 block truncate ${DASH_CARD.statLabel}`}>{label}</span>
      </span>
    </div>
  );
}

/**
 * Open-air hero: no colored banner — greeting, quick actions, measured weekly
 * stats and the level/XP strip stacked directly on the page background so the
 * ambient top wash shows through. Every figure is real — nothing dressed up.
 * Pure/presentational; memoized so page-level updates never re-render it.
 */
function HeroSectionBase({ user, progress, summary }: HeroSectionProps) {
  const firstName = user.name?.split(' ')[0] || 'بك';
  const todayDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // All figures are measured — the hero only formats what the page hands it.
  const weeklyMinutes = summary?.totalMinutes ?? 0;
  const weeklyHours = Math.floor(weeklyMinutes / 60);
  const remainderMinutes = weeklyMinutes % 60;
  const tasksCompleted = summary?.tasksCompleted ?? 0;
  const averageFocus = Math.round(summary?.averageFocus ?? 0);
  const currentStreak = progress?.currentStreak ?? 0;
  const longestStreak = progress?.longestStreak ?? 0;

  return (
    <header className="relative z-10">
      <div className="space-y-4">
        {/* Greeting vs quick actions */}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-primary-strong">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="text-[11px] font-black sm:text-xs">{todayDate}</span>
              </div>
              {currentStreak > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-amber-700 dark:text-amber-400">
                  <Flame className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span className="text-[11px] font-black sm:text-xs">
                    سلسلة {currentStreak} يوم متتالي
                  </span>
                </div>
              )}
            </div>

            <h1 className="text-2xl font-black leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
              أهلاً {firstName}
            </h1>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground md:text-base">
              {weeklyMinutes > 0
                ? `ذاكرت ${weeklyHours} ساعة و${remainderMinutes} دقيقة هذا الأسبوع. تابع تقدمك بالأسفل.`
                : 'لم تسجل أي جلسة مذاكرة هذا الأسبوع. ابدأ الآن لتظهر إحصائياتك هنا.'}
            </p>
          </div>

          {/* Quick actions */}
          <nav aria-label="إجراءات سريعة" className="flex flex-wrap items-center gap-2">
            <Link href="/time" className={DASH_BUTTON.primary}>
              <Timer className="h-4 w-4" aria-hidden="true" />
              متابعة المذاكرة
            </Link>
            <Link href="/goals" className={DASH_BUTTON.outline}>
              <Target className="h-4 w-4" aria-hidden="true" />
              أهدافي
            </Link>
          </nav>
        </div>

        {/* Weekly stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HeroStat
            icon={<Clock className="h-5 w-5" aria-hidden="true" />}
            value={
              weeklyMinutes > 0
                ? `${weeklyHours.toLocaleString('ar-EG')} س ${remainderMinutes.toLocaleString('ar-EG')} د`
                : `٠ د`
            }
            label="وقت المذاكرة هذا الأسبوع"
          />
          <HeroStat
            icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}
            value={tasksCompleted.toLocaleString('ar-EG')}
            label="مهام مكتملة"
          />
          <HeroStat
            icon={<Gauge className="h-5 w-5" aria-hidden="true" />}
            value={`${averageFocus.toLocaleString('ar-EG')}%`}
            label="متوسط التركيز"
          />
          <HeroStat
            icon={<Flame className="h-5 w-5 fill-current" aria-hidden="true" />}
            value={`${longestStreak.toLocaleString('ar-EG')} يوم`}
            label="أطول سلسلة مذاكرة"
          />
        </div>

        {/* Level / XP strip */}
        <LevelProgressSection user={user} progress={progress} />
      </div>
    </header>
  );
}

export const HeroSection = React.memo(HeroSectionBase);

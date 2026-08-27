"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Trophy,
  ArrowLeft,
  Target,
  CalendarCheck,
} from "lucide-react";
import ProfileCompletenessCard from "./ProfileCompletenessCard";
import InlineErrorState from "./InlineErrorState";
import { rarityStyle, formatArabicDate } from "./profile.constants";
import { levelPercent, useGamificationProgress, useUnlockedAchievements } from "./useGamification";
import { formatMinutes, useProgressSummary } from "./useProgressSummary";

/**
 * Overview tab — the landing section for `/profile`. Answers "where do I stand?"
 * at a glance: level/XP, study stats, profile completeness, and the three most
 * recent achievements, each linking to the tab that owns the detail.
 *
 * Study-time/current-streak numbers live only in the activity card — they used
 * to be rendered here twice with different labels from two different endpoints
 * (`/gamification/progress` vs `/progress/summary`), which could disagree.
 * The level card keeps what is unique to it: longest streak + unlocked count.
 */
export default function ProfileOverviewTab() {
  const { progress, isLoading: isProgressLoading } = useGamificationProgress();
  const {
    achievements,
    isLoading: isAchievementsLoading,
    error: achievementsError,
    refetch: refetchAchievements,
  } = useUnlockedAchievements();
  const {
    summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    retry: retrySummary,
  } = useProgressSummary();

  const recent = achievements.slice(0, 3);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> مستواك ونقاط الخبرة
          </CardTitle>
          <CardDescription>تُحتسب النقاط من المذاكرة والمهام والإنجازات.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isProgressLoading ? (
            <>
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-2 w-full" />
            </>
          ) : !progress ? (
            <p className="text-sm text-muted-foreground">لا توجد بيانات تقدم بعد — ابدأ أول جلسة مذاكرة.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-3xl font-bold">المستوى {progress.level}</div>
                  <div className="text-sm text-muted-foreground mt-1 tabular-nums">
                    {progress.totalXP} نقطة خبرة إجمالية
                  </div>
                </div>
                <div className="text-sm text-muted-foreground tabular-nums">
                  {progress.xpToNextLevel > 0
                    ? `${progress.xpToNextLevel} نقطة للمستوى ${progress.level + 1}`
                    : "أنت في القمة"}
                </div>
              </div>

              <div>
                <Progress
                  value={levelPercent(progress)}
                  className="h-2"
                  aria-label={`تقدم المستوى ${levelPercent(progress)}%`}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5 tabular-nums">
                  <span>{progress.currentLevelXP}</span>
                  <span>{progress.nextLevelXP}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <StatTile
                  icon={CalendarCheck}
                  label="أطول انتظام"
                  value={`${progress.longestStreak} يوم`}
                />
                <StatTile
                  icon={Trophy}
                  label="إنجازات مفتوحة"
                  value={progress.achievements.length}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" /> نشاطك الدراسي
          </CardTitle>
          <CardDescription>ملخص سريع لآخر فترة.</CardDescription>
        </CardHeader>
        <CardContent>
          {isSummaryLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : summaryError ? (
            <InlineErrorState message={summaryError} onRetry={retrySummary} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatTile label="وقت المذاكرة" value={formatMinutes(summary?.totalMinutes ?? 0)} />
              <StatTile label="مهام مكتملة" value={summary?.tasksCompleted ?? 0} />
              <StatTile label="أيام الانتظام" value={summary?.streakDays ?? 0} />
              <StatTile label="متوسط التركيز" value={`${Math.round(summary?.averageFocus ?? 0)}%`} />
            </div>
          )}
        </CardContent>
      </Card>

      <ProfileCompletenessCard />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" /> أحدث الإنجازات
            </CardTitle>
            <Link href="/profile?tab=achievements">
              <Button variant="ghost" size="sm" className="gap-1">
                الكل <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isAchievementsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : achievementsError ? (
            <InlineErrorState message={achievementsError} onRetry={refetchAchievements} />
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لم تفتح أي إنجاز بعد — أكمل مهامك الدراسية لتبدأ في جمعها.
            </p>
          ) : (
            <ul className="space-y-3">
              {recent.map((a) => {
                const rarity = rarityStyle(a.rarity);
                return (
                  <li key={a.id} className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-lg">
                      {a.icon || "🏆"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{a.title}</span>
                        <Badge variant="secondary" className={rarity.className}>
                          {rarity.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatArabicDate(a.unlockedAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4 text-center">
      {Icon && <Icon className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground" />}
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

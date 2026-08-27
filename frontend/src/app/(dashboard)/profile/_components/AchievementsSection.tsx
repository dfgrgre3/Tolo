"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Sparkles } from "lucide-react";
import { formatArabicDate, rarityStyle } from "./profile.constants";
import { useUnlockedAchievements } from "./useGamification";
import InlineErrorState from "./InlineErrorState";

/**
 * A log of *unlocked* achievements only — no locked catalogue and no progress
 * bars. `GET /api/gamification/achievements` returns `UserAchievementReadModel`
 * (id/key/title/description/icon/unlockedAt/rarity/xpReward) for achievements
 * the user already earned; it never sends the full definition list, an
 * `isEarned` flag, or `progress`/`maxProgress`, so a "3 / 40 unlocked" style UI
 * would be inventing numbers.
 */
export default function AchievementsSection() {
  const { achievements, isLoading, error, refetch } = useUnlockedAchievements();

  const { totalXP, sorted } = useMemo(() => {
    const list = [...achievements].sort(
      (a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
    );
    return {
      totalXP: list.reduce((sum, a) => sum + (a.xpReward || 0), 0),
      sorted: list,
    };
  }, [achievements]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" /> إنجازاتك
            </CardTitle>
            <CardDescription>الإنجازات التي فتحتها حتى الآن، من الأحدث للأقدم.</CardDescription>
          </div>
          {!isLoading && !error && sorted.length > 0 && (
            <div className="text-end shrink-0">
              <div className="text-2xl font-bold tabular-nums">{sorted.length}</div>
              <div className="text-xs text-muted-foreground">{totalXP} نقطة خبرة</div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <InlineErrorState message={error} onRetry={refetch} />
        ) : sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">لا توجد إنجازات بعد</p>
            <p className="mt-1 text-sm text-muted-foreground">
              أكمل مهامك الدراسية وحافظ على انتظامك لتفتح أول إنجاز لك.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {sorted.map((a) => {
              const rarity = rarityStyle(a.rarity);
              const unlockedAt = formatArabicDate(a.unlockedAt);
              return (
                <li
                  key={a.id}
                  className="flex gap-3 rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-xl">
                    {a.icon || "🏆"}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.title}</span>
                      <Badge variant="secondary" className={rarity.className}>
                        {rarity.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.description}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" /> +{a.xpReward} نقطة
                      </span>
                      {unlockedAt && <span>فُتح في {unlockedAt}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

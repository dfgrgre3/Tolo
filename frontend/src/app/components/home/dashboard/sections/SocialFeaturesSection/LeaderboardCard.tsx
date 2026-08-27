"use client";

import React from "react";
import { Crown, Medal, Star, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { DASH_CARD, DASH_SKELETON } from "../../shared/design-system";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  badge?: string;
  isCurrentUser?: boolean;
}

interface LeaderboardCardProps {
  loading: boolean;
  leaderboard: LeaderboardEntry[];
}

/** Flat ranked list of top learners — Noon-style rows on the shared panel. */
export const LeaderboardCard = ({ loading, leaderboard }: LeaderboardCardProps) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-4 w-4 text-amber-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Medal className="h-4 w-4 text-amber-700" />;
      default:
        return <Star className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatScore = (score: number) => new Intl.NumberFormat("ar-EG").format(score);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${DASH_SKELETON.base} h-14 w-full`} />
        ))}
      </div>
    );
  }

  if (leaderboard.length === 0) return null;

  return (
    <div className="space-y-2">
      {leaderboard.map((entry, index) => (
        <div
          key={`${entry.rank}-${index}`}
          className={`flex items-center gap-3 rounded-lg border p-3 ${
            entry.isCurrentUser
              ? "border-primary bg-primary/5"
              : `${DASH_CARD.inner} hover:border-primary/40`
          } transition-colors`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted border border-border">
            {getRankIcon(entry.rank)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-bold text-sm text-foreground truncate">
              <span>{entry.name}</span>
              {entry.isCurrentUser && (
                <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground">أنت</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {formatScore(entry.score)} نقطة خبرة
            </p>
          </div>
          <span className="text-sm font-black text-muted-foreground tabular-nums shrink-0">
            #{entry.rank}
          </span>
        </div>
      ))}

      <Link
        href="/leaderboard"
        className="inline-flex items-center gap-1 pt-1 text-xs sm:text-sm font-bold text-primary-strong hover:bg-primary/10 px-2.5 py-1.5 rounded-md transition-colors"
      >
        عرض الكل
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
};

export default LeaderboardCard;

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

/**
 * Deliberately narrower than `@/types/gamification`'s `UserProgress` /
 * `Achievement`: those carry many optional fields the handlers never send
 * (studyXP, examsPassed, category, difficulty, isEarned, progress…), and reading
 * them here would render permanently-empty UI. These shapes mirror
 * `UserProgressReadModel` / `UserAchievementReadModel` in
 * backend/internal/domain/gamification/service/gamification_read_models.go.
 *
 * No `?userId=` is sent: `resolveGamificationUserID` defaults to the session
 * user and answers 403 for anyone else's id, so passing it adds only risk.
 */
export interface GamificationProgress {
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number;
  achievements: string[];
  /** Cumulative XP at which the current level started. */
  currentLevelXP: number;
  /** Cumulative XP required to reach the next level. */
  nextLevelXP: number;
  /** XP earned since entering the current level. */
  xpIntoLevel: number;
  /** XP still needed to reach the next level. */
  xpToNextLevel: number;
}

export interface UnlockedAchievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  rarity: string;
  xpReward: number;
}

/** Percentage through the current level, clamped to 0..100. */
export function levelPercent(progress: GamificationProgress): number {
  const span = progress.xpIntoLevel + progress.xpToNextLevel;
  if (span <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((progress.xpIntoLevel / span) * 100)));
}

export function useGamificationProgress() {
  const [progress, setProgress] = useState<GamificationProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get<GamificationProgress>(apiRoutes.gamification.progress, {
        signal: controller.signal,
        retries: 0,
      })
      .then((data) => {
        setProgress(data);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("تعذر تحميل بيانات التقدم.");
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [token]);

  const refetch = useCallback(() => setToken((t) => t + 1), []);

  return { progress, isLoading, error, refetch };
}

export function useUnlockedAchievements() {
  const [achievements, setAchievements] = useState<UnlockedAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get<{ achievements: UnlockedAchievement[] | null }>(apiRoutes.gamification.achievements, {
        signal: controller.signal,
      })
      .then((data) => {
        setAchievements(data.achievements ?? []);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("تعذر تحميل الإنجازات.");
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [token]);

  const refetch = useCallback(() => setToken((t) => t + 1), []);

  return { achievements, isLoading, error, refetch };
}

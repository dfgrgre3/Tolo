"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

/**
 * Shared by the overview tab and the learning tab — both used to carry
 * byte-identical copies of this interface, the fetch effect, and
 * `formatMinutes`. Same shape as `ProgressSummary` in progress_handler.go
 * (study/time tracking, not enrollment counts).
 */
export interface ProgressSummary {
  totalMinutes: number;
  averageFocus: number;
  tasksCompleted: number;
  streakDays: number;
}

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} دقيقة`;
  if (minutes === 0) return `${hours} ساعة`;
  return `${hours}س ${minutes}د`;
}

export function useProgressSummary() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Starts true so the very first render shows skeletons without the effect
  // having to flip any flag synchronously.
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get<ProgressSummary>(apiRoutes.progress.summary, { signal: controller.signal })
      .then((data) => {
        setSummary(data);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "تعذر تحميل ملخص التقدم.");
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [token]);

  const retry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setToken((t) => t + 1);
  }, []);

  return { summary, isLoading, error, retry };
}

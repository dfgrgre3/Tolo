/**
 * Explainable Productivity Score.
 *
 * Weighted blend of five auditable components — every sub-score is 0-100 and
 * returned with its weight, so the UI can show exactly why the score moved.
 * This replaces ad-hoc "focusScore/disciplineScore" heuristics with one
 * single-source-of-truth formula.
 */

import type { ProductivityBreakdown, ProductivityInput } from "./types";

const WEIGHTS = {
  completionRate: 0.3,
  scheduleAdherence: 0.25,
  consistency: 0.2,
  focusQuality: 0.15,
  goalProgress: 0.1,
} as const;

const clamp100 = (n: number) => (Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0);

export function computeProductivity(input: ProductivityInput): ProductivityBreakdown {
  const completionRate =
    input.dueTasksTotal > 0
      ? clamp100((input.dueTasksCompleted / input.dueTasksTotal) * 100)
      : // No due tasks in period → neutral 100 only if some focus happened, else 0.
        input.actualFocusMin > 0 ? 100 : 0;

  // Adherence caps at 100 — over-studying is not "more adherent".
  const scheduleAdherence =
    input.plannedMin > 0
      ? clamp100((input.actualFocusMin / input.plannedMin) * 100)
      : input.actualFocusMin > 0
        ? 100
        : 0;

  const periodDays = Math.max(1, input.periodDays);
  const consistency = clamp100((Math.max(0, input.activeDays) / periodDays) * 100);

  const target = Math.max(5, input.targetSessionMin ?? 25);
  const focusQuality = clamp100((input.avgSessionMin / target) * 100);

  const goalProgress = clamp100(input.goalProgressPct);

  const score = Math.round(
    completionRate * WEIGHTS.completionRate +
      scheduleAdherence * WEIGHTS.scheduleAdherence +
      consistency * WEIGHTS.consistency +
      focusQuality * WEIGHTS.focusQuality +
      goalProgress * WEIGHTS.goalProgress,
  );

  return {
    score: clamp100(score),
    components: {
      completionRate: { weight: WEIGHTS.completionRate, value: Math.round(completionRate) },
      scheduleAdherence: { weight: WEIGHTS.scheduleAdherence, value: Math.round(scheduleAdherence) },
      consistency: { weight: WEIGHTS.consistency, value: Math.round(consistency) },
      focusQuality: { weight: WEIGHTS.focusQuality, value: Math.round(focusQuality) },
      goalProgress: { weight: WEIGHTS.goalProgress, value: Math.round(goalProgress) },
    },
  };
}

/**
 * Unified performance calculations for the analytics dashboard.
 *
 * Goals:
 *  - Remove duplicated / placeholder math scattered across tab components.
 *  - Prefer REAL backend `performance` payload when present, fall back to
 *    deriving scores from summary+weekly so the UI never shows NaN.
 *  - All functions are pure + unit-testable.
 */

import type {
  PerformanceRaw,
  ScoreLabel,
  SubjectInsight,
  SummaryData,
  WeeklyData,
} from "./types";

export interface CoreScores {
  productivityScore: number;
  consistencyScore: number;
  engagementScore: number;
  growthRate: number; // signed percent, can be negative
  averageScore: number;
}

function clamp0_100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 80) return "ممتاز";
  if (score >= 60) return "جيد";
  if (score >= 40) return "متوسط";
  return "يحتاج تحسين";
}

/** Daily minutes series, safe against missing data. */
export function dailySeries(weekly: WeeklyData | null | undefined): number[] {
  if (!weekly?.byDay) return [];
  return weekly.byDay.map((d) => num(d?.minutes));
}

/**
 * Growth rate: compares second half average vs first half average.
 * Returns 0 when there is no baseline (avoids Infinity).
 */
export function calcGrowthRate(daily: number[]): number {
  if (daily.length < 2) return 0;
  const mid = Math.floor(daily.length / 2);
  const first = daily.slice(0, mid);
  const second = daily.slice(mid);
  const avg = (a: number[]) =>
    a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const f = avg(first);
  const s = avg(second);
  if (f <= 0) return s > 0 ? 100 : 0;
  return Math.round(((s - f) / f) * 100);
}

/**
 * Week-over-week change when backend provides previousWeekMinutes.
 * Falls back to internal growth rate otherwise.
 */
export function weekOverWeekChange(
  weekly: WeeklyData | null | undefined,
  performance: PerformanceRaw | null | undefined,
): number | null {
  const prev = num((performance as Record<string, unknown> | null)?.["previousWeekMinutes"], NaN);
  if (Number.isFinite(prev) && prev > 0) {
    const cur = totalWeeklyMinutes(weekly);
    return Math.round(((cur - prev) / prev) * 100);
  }
  return null;
}

export function totalWeeklyMinutes(weekly: WeeklyData | null | undefined): number {
  if (!weekly?.bySubject) return dailySeries(weekly).reduce((a, b) => a + b, 0);
  return Object.values(weekly.bySubject).reduce((a, b) => a + num(b), 0);
}

export function activeDaysCount(weekly: WeeklyData | null | undefined): number {
  return dailySeries(weekly).filter((m) => m > 0).length;
}

export function calcConsistency(weekly: WeeklyData | null | undefined): number {
  const days = dailySeries(weekly);
  if (!days.length) return 0;
  // Denominator = elapsed days in the series (min 1), not always 7,
  // so a fresh account mid-week isn't penalised.
  const denom = Math.max(1, days.length);
  return clamp0_100((activeDaysCount(weekly) / denom) * 100);
}

export function calcEngagement(summary: SummaryData | null | undefined): number {
  if (!summary) return 0;
  const tasks = num(summary.tasksCompleted);
  const streak = num(summary.streakDays);
  // Diminishing returns instead of the old tasks/(tasks+5) magic number.
  const taskPart = clamp0_100((tasks / Math.max(tasks + 10, 1)) * 100);
  const streakPart = clamp0_100((streak / 30) * 100);
  return clamp0_100(taskPart * 0.6 + streakPart * 0.4);
}

export function calcProductivity(
  summary: SummaryData | null | undefined,
  weekly: WeeklyData | null | undefined,
  performance: PerformanceRaw | null | undefined,
): number {
  // Prefer backend-provided focus average when available.
  const backendFocus = num(performance?.focusAverage, NaN);
  const focus = Number.isFinite(backendFocus)
    ? Math.min(100, Math.max(0, backendFocus))
    : clamp0_100(num(summary?.averageFocus));
  const weeklyHours = totalWeeklyMinutes(weekly) / 60;
  const totalHours = num(summary?.totalMinutes) / 60;
  // Normalise against a 15h/week healthy target instead of 20h magic split.
  const weeklyPart = clamp0_100((weeklyHours / 15) * 100);
  const totalPart = clamp0_100((totalHours / 60) * 100); // 60h lifetime = full
  return clamp0_100(weeklyPart * 0.4 + totalPart * 0.2 + focus * 0.4);
}

export function calcCoreScores(
  summary: SummaryData | null | undefined,
  weekly: WeeklyData | null | undefined,
  performance: PerformanceRaw | null | undefined,
): CoreScores {
  const productivityScore = calcProductivity(summary, weekly, performance);
  const consistencyScore = calcConsistency(weekly);
  const engagementScore = calcEngagement(summary);
  const wow = weekOverWeekChange(weekly, performance);
  const growthRate = wow ?? calcGrowthRate(dailySeries(weekly));
  const averageScore = clamp0_100(
    (productivityScore + consistencyScore + engagementScore) / 3,
  );
  return { productivityScore, consistencyScore, engagementScore, growthRate, averageScore };
}

/**
 * Per-subject strengths / weaknesses.
 * - sharePct: share of weekly study time.
 * - quizScore: from performance.quizScores when backend provides it.
 * - masteryEstimate: 60% quiz (if present) + 40% balanced-time heuristic.
 */
export function buildSubjectInsights(
  weekly: WeeklyData | null | undefined,
  performance: PerformanceRaw | null | undefined,
): SubjectInsight[] {
  if (!weekly?.bySubject) return [];
  const entries = Object.entries(weekly.bySubject);
  const total = entries.reduce((a, [, m]) => a + num(m), 0);
  if (total <= 0) return [];
  const quizScores =
    (performance?.quizScores as Record<string, number> | undefined) ?? {};
  const ideal = 100 / entries.length; // balanced share

  return entries
    .map(([subject, m]) => {
      const minutes = num(m);
      const sharePct = Math.round((minutes / total) * 100);
      const rawQuiz = quizScores[subject];
      const quizScore =
        typeof rawQuiz === "number" && Number.isFinite(rawQuiz) ? rawQuiz : null;
      const balanceScore = clamp0_100(100 - Math.abs(sharePct - ideal) * 2);
      const masteryEstimate =
        quizScore !== null
          ? clamp0_100(quizScore * 0.6 + balanceScore * 0.4)
          : clamp0_100(balanceScore * 0.5 + Math.min(100, (minutes / 300) * 100) * 0.5);
      return {
        subject,
        minutes,
        sharePct,
        quizScore,
        masteryEstimate,
        strength: masteryEstimate >= 70,
        weakness: masteryEstimate < 45,
      };
    })
    .sort((a, b) => b.masteryEstimate - a.masteryEstimate);
}

/** CSV export helper — pure, so it can be unit tested. */
export function toAnalyticsCsv(args: {
  summary: SummaryData | null;
  weekly: WeeklyData | null;
  scores: CoreScores;
  insights: SubjectInsight[];
}): string {
  const rows: string[][] = [
    ["metric", "value"],
    ["productivityScore", String(args.scores.productivityScore)],
    ["consistencyScore", String(args.scores.consistencyScore)],
    ["engagementScore", String(args.scores.engagementScore)],
    ["growthRatePct", String(args.scores.growthRate)],
    ["averageScore", String(args.scores.averageScore)],
    ["totalMinutes", String(args.summary?.totalMinutes ?? 0)],
    ["averageFocus", String(args.summary?.averageFocus ?? 0)],
    ["tasksCompleted", String(args.summary?.tasksCompleted ?? 0)],
    ["streakDays", String(args.summary?.streakDays ?? 0)],
    [],
    ["subject", "minutes", "sharePct", "quizScore", "masteryEstimate"],
    ...args.insights.map((i) => [
      i.subject,
      String(i.minutes),
      String(i.sharePct),
      i.quizScore === null ? "" : String(i.quizScore),
      String(i.masteryEstimate),
    ]),
  ];
  return rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

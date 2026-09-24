/**
 * Planned-vs-Actual variance classification.
 *
 * Classifies each planned unit of work into exactly one category so reports
 * can explain the gap without inventing causes.
 */

import type { TaskStatus, VarianceCategory, VarianceResult } from "./types";

/** Tolerance band around plan: ±15% counts as ON_PLAN. */
const ON_PLAN_TOLERANCE = 0.15;

export function classifyVariance(
  plannedMin: number,
  actualMin: number,
  status: TaskStatus,
): VarianceResult {
  const planned = Math.max(0, plannedMin);
  const actual = Math.max(0, actualMin);
  const deltaMin = actual - planned;

  let category: VarianceCategory;

  if (status === "CANCELLED" || (planned > 0 && actual === 0 && status === "PENDING")) {
    category = "SKIPPED";
  } else if (status === "COMPLETED") {
    if (planned === 0) {
      category = "UNDERESTIMATED"; // work happened with no estimate at all
    } else {
      const ratio = actual / planned;
      if (ratio < 1 - ON_PLAN_TOLERANCE) {
        category = actual >= planned * 0.5 ? "COMPLETED_EARLY" : "OVERESTIMATED";
      } else if (ratio <= 1 + ON_PLAN_TOLERANCE) {
        category = "ON_PLAN";
      } else {
        category = actual <= planned * 2 ? "COMPLETED_LATE" : "UNDERESTIMATED";
      }
    }
  } else if (actual > 0 && planned > 0 && actual < planned) {
    category = "PARTIAL";
  } else if (actual > planned && planned >= 0) {
    category = "UNDERESTIMATED";
  } else {
    category = "ON_PLAN";
  }

  return { category, plannedMin: planned, actualMin: actual, deltaMin };
}

/** Aggregate a set of variances into totals for reporting. */
export function summarizeVariances(results: VarianceResult[]) {
  const byCategory = new Map<VarianceCategory, number>();
  for (const r of results) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1);
  return {
    total: results.length,
    plannedMin: results.reduce((s, r) => s + r.plannedMin, 0),
    actualMin: results.reduce((s, r) => s + r.actualMin, 0),
    byCategory: Object.fromEntries(byCategory) as Partial<Record<VarianceCategory, number>>,
  };
}

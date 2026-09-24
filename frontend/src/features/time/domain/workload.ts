/**
 * Workload intelligence: compares remaining task demand against day capacity.
 *
 * Status bands (utilization = demandMin / capacityMin):
 *   < 0.50 UNDERLOADED · 0.50–0.85 BALANCED · 0.85–1.00 HEAVY
 *   1.00–1.20 OVERLOADED · > 1.20 CRITICAL
 */

import type { PlannableTask, WorkloadAnalysis, WorkloadStatus } from "./types";
import { remainingMin } from "./scoring";
import { calendarDaysBetween } from "./datetime";

export function classifyUtilization(utilization: number): WorkloadStatus {
  if (utilization >= 1.2) return "CRITICAL";
  if (utilization >= 1.0) return "OVERLOADED";
  if (utilization >= 0.85) return "HEAVY";
  if (utilization >= 0.5) return "BALANCED";
  return "UNDERLOADED";
}

export function analyzeWorkload(
  capacityMin: number,
  demandMin: number,
  bufferPct = 0.15,
): WorkloadAnalysis {
  const capacity = Math.max(0, Math.round(capacityMin));
  const bufferMin = Math.round(capacity * Math.min(0.5, Math.max(0, bufferPct)));
  const plannableMin = Math.max(0, capacity - bufferMin);
  const plannedMin = Math.min(Math.max(0, Math.round(demandMin)), plannableMin);
  const utilization = capacity > 0 ? demandMin / capacity : demandMin > 0 ? Infinity : 0;
  return {
    status: classifyUtilization(utilization),
    capacityMin: capacity,
    plannableMin,
    plannedMin,
    bufferMin,
    utilization: Number.isFinite(utilization) ? Math.round(utilization * 100) / 100 : utilization,
  };
}

/**
 * Demand for a specific day: unfinished tasks due on/before `date` (including
 * overdue), counting only their remaining minutes. Tasks due later don't
 * pressure today's workload.
 */
export function demandForDay(tasks: PlannableTask[], date: Date): number {
  return tasks
    .filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED")
    .filter((t) => {
      if (!t.dueAt) return false;
      const due = new Date(t.dueAt);
      return !Number.isNaN(due.getTime()) && calendarDaysBetween(date, due) <= 0;
    })
    .reduce((sum, t) => sum + remainingMin(t), 0);
}

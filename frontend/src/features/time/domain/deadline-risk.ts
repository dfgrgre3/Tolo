/**
 * Deadline risk assessment.
 *
 * risk compares remaining work against the user's REAL available capacity
 * (study windows, minus buffer) between now and the deadline.
 *   remaining <= 50% of available → LOW
 *   <= 80% → MEDIUM · <= 100% → HIGH · > 100% (or overdue) → CRITICAL
 */

import type {
  DeadlineRisk,
  DeadlineRiskAssessment,
  PlannableTask,
  TimeWindow,
} from "./types";
import { calendarDaysBetween, dayOfWeek, windowDurationMin } from "./datetime";
import { remainingMin } from "./scoring";

function riskFromRatio(ratio: number): DeadlineRisk {
  if (ratio > 1) return "CRITICAL";
  if (ratio > 0.8) return "HIGH";
  if (ratio > 0.5) return "MEDIUM";
  return "LOW";
}

/**
 * @param dailyCapacityByDow  study-window minutes per weekday (0-6), already
 *                            net of buffer or gross — we apply bufferPct here.
 */
export function assessDeadlineRisk(
  task: PlannableTask,
  now: Date,
  dailyCapacityByDow: number[],
  bufferPct = 0.15,
): DeadlineRiskAssessment | null {
  if (!task.dueAt) return null;
  const due = new Date(task.dueAt);
  if (Number.isNaN(due.getTime())) return null;

  const remaining = remainingMin(task);
  const days = calendarDaysBetween(now, due);

  if (days < 0) {
    return {
      taskId: task.id,
      risk: "CRITICAL",
      remainingMin: remaining,
      daysRemaining: days,
      availableMinBeforeDeadline: 0,
      requiredDailyMin: remaining,
    };
  }

  // Sum capacity for each calendar day from today through the due date.
  let gross = 0;
  for (let i = 0; i <= days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    gross += Math.max(0, dailyCapacityByDow[dayOfWeek(d)] ?? 0);
  }
  const available = Math.round(gross * (1 - Math.min(0.5, Math.max(0, bufferPct))));

  const ratio = available > 0 ? remaining / available : remaining > 0 ? Infinity : 0;
  const requiredDailyMin = days === 0 ? remaining : Math.ceil(remaining / (days + 1));

  return {
    taskId: task.id,
    risk: riskFromRatio(ratio),
    remainingMin: remaining,
    daysRemaining: days,
    availableMinBeforeDeadline: available,
    requiredDailyMin,
  };
}

/** Convenience: gross study capacity per weekday from weekly template windows. */
export function capacityByWeekday(studyWindows: TimeWindow[]): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const w of studyWindows) out[w.day] = (out[w.day] ?? 0) + windowDurationMin(w);
  return out;
}

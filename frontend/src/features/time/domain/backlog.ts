/**
 * Backlog intelligence — the missing "Re-plan" loop for work that slipped.
 *
 * A backlog item is an open task that is NOT part of today's plan's story:
 *   OVERDUE       — deadline already passed (or due today and untouched).
 *   NO_DUE_DATE   — open work with no deadline: never scheduled anywhere.
 *   UNSCHEDULED   — has a deadline but didn't fit today's generated plan
 *                   (plan.unscheduled from the scheduler output).
 *
 * The recovery plan answers "can I catch up?" with REAL capacity: it spreads
 * backlog minutes across future study days (using the weekly capacity map),
 * respecting the buffer, and reports what remains impossible within the
 * horizon. All pure; `now` is injected.
 */

import type { PlannableTask, Recommendation, TimeWindow } from "./types";
import { calendarDaysBetween, windowDurationMin } from "./datetime";
import { rankTasks, remainingMin } from "./scoring";

export type BacklogReason = "OVERDUE" | "NO_DUE_DATE" | "UNSCHEDULED";

export interface BacklogItem {
  taskId: string;
  title: string;
  subject?: string;
  reason: BacklogReason;
  remainingMin: number;
  /** Days until deadline; negative = overdue; null when NO_DUE_DATE. */
  daysRemaining: number | null;
  /** Score from the canonical ranking engine (higher = more urgent). */
  score: number;
  /** Human-readable, data-backed reasons for why it is in the backlog. */
  reasons: string[];
}

export interface BacklogAnalysis {
  items: BacklogItem[];
  /** Σ remaining minutes across the backlog. */
  totalMin: number;
  overdueCount: number;
  noDueCount: number;
  unscheduledCount: number;
}

/**
 * @param openTasks      all unfinished plannable tasks
 * @param unscheduledIds task ids the scheduler could not fit today (plan.unscheduled)
 */
export function analyzeBacklog(
  openTasks: PlannableTask[],
  now: Date,
  unscheduledIds: readonly string[] = [],
): BacklogAnalysis {
  const unscheduledSet = new Set(unscheduledIds);
  const scores = new Map(rankTasks(openTasks, now).map((s) => [s.taskId, s.total]));

  const items: BacklogItem[] = [];
  for (const t of openTasks) {
    if (t.status === "COMPLETED" || t.status === "CANCELLED") continue;
    const remaining = remainingMin(t);
    let days: number | null = null;
    if (t.dueAt) {
      const d = new Date(t.dueAt);
      if (!Number.isNaN(d.getTime())) days = calendarDaysBetween(now, d);
    }

    const overdue = days !== null && days <= 0;
    const noDue = days === null;
    const unscheduled = unscheduledSet.has(t.id) && !overdue && !noDue;

    if (!overdue && !noDue && !unscheduled) continue;

    const reasons: string[] = [];
    let reason: BacklogReason;
    if (overdue) {
      reason = "OVERDUE";
      reasons.push(
        days !== null && days < 0
          ? `متأخرة ${Math.abs(days)} يوم عن الموعد`
          : "موعد التسليم اليوم ولم تُنجز بعد",
      );
    } else if (noDue) {
      reason = "NO_DUE_DATE";
      reasons.push("بلا موعد نهائي — لم تُجدوَل");
    } else {
      reason = "UNSCHEDULED";
      reasons.push("لم تسع خطة اليوم لهذه المهمة");
    }
    if (!t.estimatedMin && !t.actualMin) {
      reasons.push("بلا تقدير وقت — محسوبة بجلسة قياسية (25 د)");
    }

    items.push({
      taskId: t.id,
      title: t.title,
      subject: t.subject,
      reason,
      remainingMin: remaining,
      daysRemaining: days,
      score: scores.get(t.id) ?? 0,
      reasons,
    });
  }

  // Most dangerous first: overdue first, then score desc, stable by id.
  items.sort((a, b) => {
    const aOd = a.reason === "OVERDUE" ? 1 : 0;
    const bOd = b.reason === "OVERDUE" ? 1 : 0;
    return bOd - aOd || b.score - a.score || a.taskId.localeCompare(b.taskId);
  });

  return {
    items,
    totalMin: items.reduce((s, i) => s + i.remainingMin, 0),
    overdueCount: items.filter((i) => i.reason === "OVERDUE").length,
    noDueCount: items.filter((i) => i.reason === "NO_DUE_DATE").length,
    unscheduledCount: items.filter((i) => i.reason === "UNSCHEDULED").length,
  };
}

export interface RecoveryDay {
  /** Local date key of the day. */
  date: string;
  /** 0=Sunday…6=Saturday. */
  day: number;
  /** Minutes of backlog assigned to this day (0 = empty day). */
  assignedMin: number;
  /** Gross study capacity of the day before buffer. */
  capacityMin: number;
}

export interface RecoveryPlan {
  days: RecoveryDay[];
  /** Total minutes assigned across the horizon. */
  assignedMin: number;
  /** Backlog minutes that do NOT fit within the horizon (0 = fully feasible). */
  overflowMin: number;
  feasible: boolean;
  reasons: string[];
}
/**
 * Spread backlog across the next `horizonDays` calendar days using real
 * weekly capacity (net of buffer). Greedy chronological fill: earliest days
 * take work first, so overdue work lands on the soonest days.
 */
export function buildRecoveryPlan(
  backlog: BacklogAnalysis,
  now: Date,
  dailyCapacityByDow: readonly number[],
  horizonDays = 7,
  bufferPct = 0.15,
): RecoveryPlan {
  const days: RecoveryDay[] = [];
  let remainingBacklog = backlog.totalMin;

  const span = Math.max(1, Math.floor(horizonDays));
  for (let i = 0; i < span && remainingBacklog > 0; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dow = d.getDay();
    const gross = Math.max(0, dailyCapacityByDow[dow] ?? 0);
    const plannable = Math.round(gross * (1 - Math.min(0.5, Math.max(0, bufferPct))));
    const assigned = Math.min(plannable, remainingBacklog);
    remainingBacklog -= assigned;
    days.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      day: dow,
      assignedMin: assigned,
      capacityMin: gross,
    });
  }

  const assignedMin = days.reduce((s, d) => s + d.assignedMin, 0);
  const overflowMin = Math.max(0, backlog.totalMin - assignedMin);
  const reasons: string[] = [];
  if (backlog.totalMin === 0) {
    reasons.push("لا يوجد backlog — كل المهام مجدولة أو منجزة");
  } else if (overflowMin === 0) {
    reasons.push(
      `خطة تعافٍ: ${assignedMin} دقيقة موزعة على ${days.length} يوم ضمن سعتك`,
    );
  } else {
    reasons.push(
      `السعة لا تكفي: ${assignedMin} من ${backlog.totalMin} دقيقة خلال ${span} أيام — المتبقٍ ${overflowMin} د يحتاج تمديد الأفق أو تقليص الأولويات`,
    );
  }

  return { days, assignedMin, overflowMin, feasible: overflowMin === 0, reasons };
}

/**
 * Advisor recommendation emitted when backlog is non-trivial.
 * Returns null when there is nothing meaningful to recover from.
 */
export function backlogRecoveryRecommendation(
  backlog: BacklogAnalysis,
  plan: RecoveryPlan,
): Recommendation | null {
  if (backlog.items.length === 0 || backlog.totalMin === 0) return null;

  const reasons: string[] = [];
  if (backlog.overdueCount > 0) {
    reasons.push(`${backlog.overdueCount} مهمة متأخرة عن موعدها`);
  }
  reasons.push(
    `${backlog.items.length} مهمة في الـ backlog (${backlog.totalMin} دقيقة عمل متبقية)`,
  );
  reasons.push(...plan.reasons);

  return {
    kind: "backlog_recovery",
    title:
      backlog.overdueCount > 0
        ? `خطة تعافٍ: ${backlog.overdueCount} مهمة متأخرة`
        : `لديك ${backlog.items.length} مهمة خارج الخطة`,
    reasons,
    taskId: backlog.items[0]?.taskId,
    subject: backlog.items[0]?.subject,
    priority: backlog.overdueCount > 0 ? 92 : 60,
  };
}

/** Convenience: gross weekly capacity from template windows (mirrors deadline-risk). */
export function capacityFromWindows(studyWindows: readonly TimeWindow[]): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const w of studyWindows) out[w.day] = (out[w.day] ?? 0) + windowDurationMin(w);
  return out;
}

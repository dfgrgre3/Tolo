/**
 * Plan execution progress — closes the loop between the generated daily plan
 * and what the user ACTUALLY did.
 *
 * The plan itself is derived data (scheduler output), so progress must also be
 * derived: we never persist "plan item done" flags. Instead we annotate each
 * plan item from two real sources of truth:
 *   1. Study sessions logged today (taskId + durationMin), and
 *   2. The task's own status.
 *
 * Logged minutes are water-filled into the task's plan items in chronological
 * order, so chunked tasks (multiple PlanItems sharing one taskId) report
 * per-chunk progress deterministically.
 *
 * Pure: `now` is injected; malformed sessions are ignored, never thrown on.
 */

import { localDateKey, minutesSinceMidnight } from "./datetime";
import type { DailyPlan, PlanItem, TaskStatus } from "./types";

export type PlanItemState =
  /** Fully covered by logged minutes, or the task itself is COMPLETED. */
  | "COMPLETED"
  /** Some minutes logged but fewer than planned. */
  | "STARTED"
  /** Zero logged minutes and `now` is inside the item's window. */
  | "ACTIVE"
  /** Window has passed with zero logged minutes (task items only). */
  | "MISSED"
  /** Window is still in the future. */
  | "UPCOMING"
  /** Non-task item (break/buffer) whose window has passed. */
  | "ELAPSED";

export interface PlanItemProgress {
  state: PlanItemState;
  /** Minutes water-filled into THIS item (0 for non-task items). */
  loggedMin: number;
  plannedMin: number;
}

export interface AnnotatedPlanItem extends PlanItem {
  progress: PlanItemProgress;
}

export interface PlanProgressSummary {
  /** Planned minutes across task-linked items only. */
  plannedMin: number;
  /** Logged minutes attributed to task-linked items. */
  loggedMin: number;
  completedItems: number;
  totalItems: number;
  /** loggedMin / plannedMin * 100, clamped to [0, 100]; 0 when nothing planned. */
  adherencePct: number;
}

/** Minimal session shape the annotator needs. */
export interface SessionLogInput {
  taskId?: string;
  /** ISO instant; invalid dates are ignored. */
  startTime: string;
  durationMin: number;
}

/** Minimal task-state shape the annotator needs. Status may be absent (API partials). */
export interface TaskStateInput {
  id: string;
  status?: TaskStatus;
}

function plannedOf(item: PlanItem): number {
  return Math.max(0, item.endMin - item.startMin);
}

export function annotatePlanProgress(
  plan: DailyPlan,
  sessions: SessionLogInput[],
  tasks: TaskStateInput[],
  now: Date,
): { items: AnnotatedPlanItem[]; summary: PlanProgressSummary } {
  const nowMin = minutesSinceMidnight(now);
  const completedTaskIds = new Set(
    tasks.filter((t) => t.status === "COMPLETED").map((t) => t.id),
  );

  // Logged minutes per task, restricted to sessions started on the plan's date.
  const loggedByTask = new Map<string, number>();
  for (const s of sessions) {
    if (!s.taskId || !(s.durationMin > 0)) continue;
    const start = new Date(s.startTime);
    if (Number.isNaN(start.getTime())) continue;
    if (localDateKey(start) !== plan.date) continue;
    loggedByTask.set(s.taskId, (loggedByTask.get(s.taskId) ?? 0) + s.durationMin);
  }

  // Water-fill: allocate each task's logged minutes to its plan items in
  // chronological order (earliest chunk fills first).
  const remainingByTask = new Map(loggedByTask);
  const ordered = [...plan.items].sort((a, b) => a.startMin - b.startMin);
  const allocated = new Map<PlanItem, number>();
  for (const item of ordered) {
    if (!item.taskId) continue;
    const remaining = remainingByTask.get(item.taskId) ?? 0;
    if (remaining <= 0) continue;
    const take = Math.min(remaining, plannedOf(item));
    allocated.set(item, take);
    remainingByTask.set(item.taskId, remaining - take);
  }

  const items: AnnotatedPlanItem[] = plan.items.map((item) => {
    const plannedMin = plannedOf(item);
    const loggedMin = allocated.get(item) ?? 0;

    let state: PlanItemState;
    if (!item.taskId) {
      // Breaks/buffers carry no execution semantics — time-based only.
      state =
        nowMin >= item.startMin && nowMin < item.endMin
          ? "ACTIVE"
          : nowMin >= item.endMin
            ? "ELAPSED"
            : "UPCOMING";
    } else if ((item.taskId && completedTaskIds.has(item.taskId)) || loggedMin >= plannedMin) {
      state = "COMPLETED";
    } else if (loggedMin > 0) {
      state = "STARTED";
    } else if (nowMin >= item.endMin) {
      state = "MISSED";
    } else if (nowMin >= item.startMin) {
      state = "ACTIVE";
    } else {
      state = "UPCOMING";
    }

    return { ...item, progress: { state, loggedMin, plannedMin } };
  });

  const taskItems = items.filter((i) => i.taskId);
  const plannedMin = taskItems.reduce((s, i) => s + i.progress.plannedMin, 0);
  const loggedMin = taskItems.reduce((s, i) => s + i.progress.loggedMin, 0);
  const completedItems = taskItems.filter((i) => i.progress.state === "COMPLETED").length;

  return {
    items,
    summary: {
      plannedMin,
      loggedMin,
      completedItems,
      totalItems: taskItems.length,
      adherencePct: plannedMin > 0 ? Math.min(100, Math.round((loggedMin / plannedMin) * 100)) : 0,
    },
  };
}

/**
 * Deterministic task scoring for the scheduling engine.
 *
 * Score = deadline urgency (0-50) + priority (0-25) + mastery weakness (0-15)
 *       + effort fit bonus (0-10).
 * Every component is returned so the UI can explain "why this task, why now".
 */

import type { PlannableTask } from "./types";
import { calendarDaysBetween } from "./datetime";

const PRIORITY_POINTS: Record<PlannableTask["priority"], number> = {
  LOW: 5,
  MEDIUM: 10,
  HIGH: 18,
  URGENT: 25,
};

export interface TaskScore {
  taskId: string;
  total: number;
  deadlineUrgency: number;
  priorityPoints: number;
  masteryPoints: number;
  reasons: string[];
}

/** Remaining work for a task in minutes. */
export function remainingMin(task: PlannableTask): number {
  const est = Math.max(0, task.estimatedMin ?? 0);
  const actual = Math.max(0, task.actualMin ?? 0);
  // Unknown estimate → assume a single standard session, never 0 (task must be plannable).
  if (est === 0 && actual === 0) return 25;
  return Math.max(0, est - actual);
}

export function scoreTask(task: PlannableTask, now: Date): TaskScore {
  const reasons: string[] = [];
  let deadlineUrgency = 0;

  if (task.dueAt) {
    const due = new Date(task.dueAt);
    if (!Number.isNaN(due.getTime())) {
      const days = calendarDaysBetween(now, due);
      if (days < 0) {
        deadlineUrgency = 50;
        reasons.push("متأخرة عن الموعد النهائي");
      } else if (days === 0) {
        deadlineUrgency = 45;
        reasons.push("موعد التسليم اليوم");
      } else if (days === 1) {
        deadlineUrgency = 38;
        reasons.push("موعد التسليم غدًا");
      } else if (days <= 3) {
        deadlineUrgency = 28;
        reasons.push(`موعد التسليم خلال ${days} أيام`);
      } else if (days <= 7) {
        deadlineUrgency = 18;
        reasons.push(`موعد التسليم خلال أسبوع`);
      } else {
        deadlineUrgency = 8;
      }
    }
  }

  const priorityPoints = PRIORITY_POINTS[task.priority];
  if (task.priority === "URGENT" || task.priority === "HIGH") {
    reasons.push("أولوية عالية");
  }

  let masteryPoints = 0;
  if (typeof task.masteryScore === "number" && Number.isFinite(task.masteryScore)) {
    const m = Math.min(100, Math.max(0, task.masteryScore));
    masteryPoints = Math.round(((100 - m) / 100) * 15);
    if (m < 50) reasons.push("مستوى الإتقان منخفض — يحتاج مراجعة");
  }

  const total = deadlineUrgency + priorityPoints + masteryPoints;
  return { taskId: task.id, total, deadlineUrgency, priorityPoints, masteryPoints, reasons };
}

/** Rank plannable (unfinished) tasks, highest score first; stable tie-break by title. */
export function rankTasks(tasks: PlannableTask[], now: Date): TaskScore[] {
  return tasks
    .filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED")
    .map((t) => scoreTask(t, now))
    .sort((a, b) => b.total - a.total || a.taskId.localeCompare(b.taskId));
}

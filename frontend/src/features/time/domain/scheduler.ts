/**
 * Smart Scheduling Engine — deterministic daily-plan generator.
 *
 * Inputs:  study windows (from the weekly template), unfinished tasks,
 *          user preferences (buffer %, session length bounds, break gap).
 * Output:  ordered PlanItems inside the day's study windows, each with
 *          human-readable reasons, plus the tasks that didn't fit and why.
 *
 * Rules (all deterministic, all explainable):
 *  1. Only "study" windows are plannable; fixed/sleep/personal blocks are respected.
 *  2. Buffer: only (1 - bufferPct) of capacity is planned — days are never 100% full.
 *  3. Tasks are ranked by scoreTask() (deadline urgency, priority, mastery).
 *  4. Sessions are chunked to [minSessionMin, maxSessionMin]; a task may span
 *     multiple chunks in one window.
 *  5. Context-switch guard: after placing a subject, the next chunk prefers a
 *     different subject unless the same subject's next task is deadline-critical.
 *  6. A `breakGapMin` transition gap is left between consecutive chunks.
 */

import type {
  DailyPlan,
  PlanItem,
  PlannableTask,
  TimeWindow,
  UnscheduledTask,
} from "./types";
import {
  dayOfWeek,
  isValidWindow,
  localDateKey,
  windowDurationMin,
} from "./datetime";
import { rankTasks, remainingMin } from "./scoring";
import { analyzeWorkload } from "./workload";

export interface SchedulerPreferences {
  /** Fraction of capacity reserved as buffer/catch-up (0-0.5). Default 0.15. */
  bufferPct?: number;
  /** Longest single focus chunk. Default 50. */
  maxSessionMin?: number;
  /** Shortest chunk worth scheduling. Default 15. */
  minSessionMin?: number;
  /** Transition gap between consecutive chunks. Default 10. */
  breakGapMin?: number;
}

const CRITICAL_SAME_SUBJECT_THRESHOLD = 60;

interface Cursor {
  window: TimeWindow;
  /** Next free minute inside the window. */
  at: number;
}

interface QueueEntry {
  score: ReturnType<typeof rankTasks>[number];
  task: PlannableTask;
  left: number;
}

export function generateDailyPlan(
  date: Date,
  studyWindows: TimeWindow[],
  tasks: PlannableTask[],
  prefs: SchedulerPreferences = {},
): DailyPlan {
  const bufferPct = Math.min(0.5, Math.max(0, prefs.bufferPct ?? 0.15));
  const maxSession = Math.max(15, prefs.maxSessionMin ?? 50);
  const minSession = Math.max(5, Math.min(maxSession, prefs.minSessionMin ?? 15));
  const gap = Math.max(0, prefs.breakGapMin ?? 10);

  const dow = dayOfWeek(date);
  const windows = studyWindows
    .filter((w) => w.day === dow && isValidWindow(w))
    .sort((a, b) => a.startMin - b.startMin);

  const capacityMin = windows.reduce((s, w) => s + windowDurationMin(w), 0);
  const ranked = rankTasks(tasks, date);
  const byId = new Map(tasks.map((t) => [t.id, t]));

  const totalDemand = ranked.reduce((s, r) => {
    const t = byId.get(r.taskId);
    return s + (t ? remainingMin(t) : 0);
  }, 0);
  const workload = analyzeWorkload(capacityMin, totalDemand, bufferPct);

  const items: PlanItem[] = [];
  const unscheduled: UnscheduledTask[] = [];
  let budget = workload.plannableMin;
  const cursors: Cursor[] = windows.map((w) => ({ window: w, at: w.startMin }));
  let cursorIdx = 0;
  let lastSubject: string | undefined;

  const advanceWindow = (): Cursor | null => {
    while (
      cursorIdx < cursors.length &&
      cursors[cursorIdx]!.window.endMin - cursors[cursorIdx]!.at < minSession
    ) {
      cursorIdx++;
    }
    return cursorIdx < cursors.length ? cursors[cursorIdx]! : null;
  };

  const queue: QueueEntry[] = ranked.map((r) => {
    const task = byId.get(r.taskId)!;
    return { score: r, task, left: remainingMin(task) };
  });

  while (budget >= minSession) {
    const cursor = advanceWindow();
    if (!cursor) break;

    // Pick next task: highest score, but avoid repeating the same subject
    // back-to-back unless it's deadline-critical.
    let pickIdx = queue.findIndex((q) => q.left > 0);
    if (pickIdx === -1) break;
    const altIdx = queue.findIndex(
      (q, i) =>
        q.left > 0 &&
        q.task.subject !== lastSubject &&
        (i === pickIdx || queue[pickIdx]!.score.total < CRITICAL_SAME_SUBJECT_THRESHOLD),
    );
    if (altIdx !== -1 && queue[pickIdx]!.task.subject === lastSubject) pickIdx = altIdx;

    const entry = queue[pickIdx]!;
    const spaceInWindow = cursor.window.endMin - cursor.at;
    const chunk = Math.min(entry.left, maxSession, spaceInWindow, budget);
    if (chunk < minSession) {
      cursor.at = cursor.window.endMin;
      continue;
    }

    const reasons = [
      `نافذة دراسة متاحة (${windowDurationMin(cursor.window)} دقيقة)`,
      ...entry.score.reasons,
    ];
    if (lastSubject && entry.task.subject && entry.task.subject !== lastSubject) {
      reasons.push("تنويع المواد لتقليل الإرهاق الذهني");
    }

    items.push({
      day: dow,
      startMin: cursor.at,
      endMin: cursor.at + chunk,
      taskId: entry.task.id,
      title: entry.task.title,
      kind: "study",
      subject: entry.task.subject,
      score: entry.score.total,
      reasons,
    });

    entry.left -= chunk;
    budget -= chunk;
    cursor.at += chunk + gap;
    lastSubject = entry.task.subject;

    if (entry.left > 0 && entry.left < minSession) {
      unscheduled.push({
        taskId: entry.task.id,
        title: entry.task.title,
        reason: `تبقّى ${entry.left} دقيقة أقل من الحد الأدنى للجلسة (${minSession} د)`,
        remainingMin: entry.left,
      });
      entry.left = 0;
    }
  }

  for (const q of queue) {
    if (q.left >= minSession) {
      unscheduled.push({
        taskId: q.task.id,
        title: q.task.title,
        reason:
          capacityMin === 0
            ? "لا توجد نوافذ دراسة في الجدول الأسبوعي لهذا اليوم"
            : "السعة المتاحة لليوم لا تكفي — أعد الجدولة أو انقلها ليوم آخر",
        remainingMin: q.left,
      });
    }
  }

  return {
    date: localDateKey(date),
    items,
    capacityMin,
    plannedMin: workload.plannedMin,
    bufferMin: workload.bufferMin,
    workload,
    unscheduled,
  };
}

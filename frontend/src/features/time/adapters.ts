/**
 * Time feature — boundary adapters.
 *
 * The domain layer (./domain) is pure and framework-free. Everything in THIS
 * file is the anti-corruption layer that converts real API/UI shapes
 * (Schedule.planJson, Task, StudySession) into domain inputs.
 *
 * All functions are pure and defensive: malformed planJson or dates never
 * throw — they degrade to empty inputs so the UI always renders.
 */

import {
  parseHHMM,
  windowDurationMin,
  type BlockKind,
  type PlannableTask,
  type ScheduleBlock,
  type TimeWindow,
} from "./domain";

// ─── planJson shapes (mirrors WeeklySchedule extractTimeBlocks contract) ─────

export interface PlanTimeBlock {
  id?: string;
  title?: string;
  startTime?: string; // "HH:mm" local wall-clock
  endTime?: string;
  day?: number; // 0-6 Sunday-Saturday
  type?: string; // STUDY | BREAK | TASK | ...
  subject?: string;
}

/** planJson may be: {timeBlocks:[...], ...} | TimeBlock[] | {dateKey: blocks[]} */
export function parsePlanJson(planJson: string | null | undefined): {
  root: Record<string, unknown>;
  blocks: PlanTimeBlock[];
} {
  if (!planJson) return { root: {}, blocks: [] };
  try {
    const parsed = JSON.parse(planJson) as unknown;
    if (Array.isArray(parsed)) {
      return { root: {}, blocks: parsed as PlanTimeBlock[] };
    }
    if (parsed && typeof parsed === "object") {
      const root = parsed as Record<string, unknown>;
      if (Array.isArray(root.timeBlocks)) {
        return { root, blocks: root.timeBlocks as PlanTimeBlock[] };
      }
      // Legacy date-keyed shape — flatten, best effort.
      const flat: PlanTimeBlock[] = [];
      for (const [dayKey, value] of Object.entries(root)) {
        if (!Array.isArray(value)) continue;
        const d = new Date(dayKey);
        if (Number.isNaN(d.getTime())) continue;
        for (const b of value as PlanTimeBlock[]) {
          flat.push({ ...(b ?? {}), day: d.getDay() });
        }
      }
      return { root: {}, blocks: flat };
    }
  } catch {
    // Corrupt planJson → empty schedule, never crash the dashboard.
  }
  return { root: {}, blocks: [] };
}

const BLOCK_KIND_MAP: Record<string, BlockKind> = {
  STUDY: "study",
  BREAK: "break",
  TASK: "fixed",
  MEETING: "fixed",
  WORK: "fixed",
  SLEEP: "sleep",
  PERSONAL: "personal",
  EXERCISE: "personal",
  MEAL: "personal",
  ENTERTAINMENT: "personal",
};


/** Weekly-template study windows (plannable) from planJson. */
export function extractStudyWindows(planJson: string | null | undefined): TimeWindow[] {
  const out: TimeWindow[] = [];
  for (const b of parsePlanJson(planJson).blocks) {
    if ((b.type ?? "").toUpperCase() !== "STUDY") continue;
    const startMin = b.startTime ? parseHHMM(b.startTime) : null;
    const endMin = b.endTime ? parseHHMM(b.endTime) : null;
    const day = typeof b.day === "number" ? b.day : NaN;
    if (startMin === null || endMin === null || !(day >= 0 && day <= 6)) continue;
    if (startMin >= endMin) continue;
    out.push({ day: day as TimeWindow["day"], startMin, endMin });
  }
  return out;
}

/** Every block as a domain ScheduleBlock (for conflict detection / display). */
export function extractScheduleBlocks(planJson: string | null | undefined): ScheduleBlock[] {
  const out: ScheduleBlock[] = [];
  for (const b of parsePlanJson(planJson).blocks) {
    const startMin = b.startTime ? parseHHMM(b.startTime) : null;
    const endMin = b.endTime ? parseHHMM(b.endTime) : null;
    const day = typeof b.day === "number" ? b.day : NaN;
    if (startMin === null || endMin === null || !(day >= 0 && day <= 6)) continue;
    if (startMin >= endMin) continue;
    out.push({
      id: typeof b.id === "string" ? b.id : `block_${day}_${startMin}`,
      day: day as TimeWindow["day"],
      startMin,
      endMin,
      kind: BLOCK_KIND_MAP[(b.type ?? "").toUpperCase()] ?? "personal",
      subject: typeof b.subject === "string" && b.subject ? b.subject : undefined,
      title: typeof b.title === "string" ? b.title : undefined,
    });
  }
  return out;
}

/** Gross study capacity per weekday (minutes), for deadline-risk math. */
export function weeklyCapacityByDay(planJson: string | null | undefined): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const w of extractStudyWindows(planJson)) {
    out[w.day] = (out[w.day] ?? 0) + windowDurationMin(w);
  }
  return out;
}


// ─── Task adapter ─────────────────────────────────────────────────────────────

interface ApiTaskLike {
  id: string;
  title: string;
  subject?: string;
  dueAt?: string;
  status?: string;
  priority?: string;
  estimatedTime?: number;
  actualTime?: number;
}

const VALID_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const VALID_STATUSES = new Set(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

export function toPlannableTask(task: ApiTaskLike): PlannableTask {
  const priority = VALID_PRIORITIES.has(task.priority ?? "")
    ? (task.priority as PlannableTask["priority"])
    : "MEDIUM";
  const status = VALID_STATUSES.has(task.status ?? "")
    ? (task.status as PlannableTask["status"])
    : "PENDING";
  return {
    id: task.id,
    title: task.title,
    subject: task.subject || undefined,
    priority,
    status,
    dueAt: task.dueAt,
    estimatedMin: typeof task.estimatedTime === "number" ? task.estimatedTime : undefined,
    actualMin: typeof task.actualTime === "number" ? task.actualTime : undefined,
  };
}

// ─── Session aggregates (real history → advisor inputs) ───────────────────────

interface ApiSessionLike {
  durationMin: number;
  startTime: string;
  subjectId?: string;
  subject?: string;
}

/** Minutes studied per subject over the trailing `days` days. */
export function minutesBySubject(
  sessions: ApiSessionLike[],
  now: Date,
  days = 7,
): Record<string, number> {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  const out: Record<string, number> = {};
  for (const s of sessions) {
    const start = new Date(s.startTime);
    if (Number.isNaN(start.getTime()) || start < from || start > now) continue;
    const key = s.subject || s.subjectId || "عام";
    out[key] = (out[key] ?? 0) + (s.durationMin || 0);
  }
  return out;
}

/** Distinct local days with ≥1 session in the trailing `days` days. */
export function activeDays(sessions: ApiSessionLike[], now: Date, days = 7): number {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  const set = new Set<string>();
  for (const s of sessions) {
    const start = new Date(s.startTime);
    if (Number.isNaN(start.getTime()) || start < from || start > now) continue;
    set.add(`${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`);
  }
  return set.size;
}

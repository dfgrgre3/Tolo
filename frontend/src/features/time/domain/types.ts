/**
 * Time Domain — canonical types (single source of truth for the planning engines).
 *
 * Everything here is framework-free and pure: no React, no network, no Date.now()
 * hidden inside — `now` is always injected so engines are deterministic and testable.
 *
 * Time model:
 *  - Instants (task deadlines, session boundaries) are ISO strings / epoch ms (UTC-safe).
 *  - Wall-clock schedule windows are minutes-since-midnight in the USER'S LOCAL
 *    timezone (device local time), because WeeklySchedule blocks are stored as
 *    "HH:mm" local times. A 08:00 study block is always 08:00 wall-clock.
 */

/** 0 = Sunday … 6 = Saturday (matches DAYS_OF_WEEK in WeeklySchedule/constants). */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A wall-clock window within a single day. Invariant: 0 <= startMin < endMin <= 1440. */
export interface TimeWindow {
  day: DayOfWeek;
  startMin: number;
  endMin: number;
}

export type BlockKind =
  | "study"
  | "break"
  | "fixed" // lessons, meetings, work, travel — not plannable
  | "sleep"
  | "personal"
  | "exam"
  | "buffer";

export interface ScheduleBlock extends TimeWindow {
  id: string;
  kind: BlockKind;
  /** Locked blocks are never moved by automation. */
  locked?: boolean;
  subject?: string;
  title?: string;
}

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

/** Minimal task shape the engines need — adapters map the API Task onto this. */
export interface PlannableTask {
  id: string;
  title: string;
  subject?: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** ISO instant (UTC). */
  dueAt?: string;
  /** Estimated total effort, minutes. */
  estimatedMin?: number;
  /** Effort already logged, minutes. */
  actualMin?: number;
  /** Lower mastery (0-100) increases scheduling priority. */
  masteryScore?: number;
}

// ─── Planning output ──────────────────────────────────────────────────────────

export interface PlanItem extends TimeWindow {
  taskId?: string;
  title: string;
  kind: BlockKind;
  subject?: string;
  score?: number;
  /** Deterministic, human-readable explanation of why this item is here. */
  reasons: string[];
  locked?: boolean;
}

export interface UnscheduledTask {
  taskId: string;
  title: string;
  reason: string;
  remainingMin: number;
}

export interface DailyPlan {
  /** Local date key yyyy-mm-dd. */
  date: string;
  items: PlanItem[];
  capacityMin: number;
  plannedMin: number;
  bufferMin: number;
  workload: WorkloadAnalysis;
  unscheduled: UnscheduledTask[];
}

// ─── Workload ─────────────────────────────────────────────────────────────────

export type WorkloadStatus =
  | "UNDERLOADED"
  | "BALANCED"
  | "HEAVY"
  | "OVERLOADED"
  | "CRITICAL";

export interface WorkloadAnalysis {
  status: WorkloadStatus;
  /** Total study-window minutes for the day (before buffer). */
  capacityMin: number;
  /** Minutes the engine was allowed to plan (capacity minus buffer). */
  plannableMin: number;
  plannedMin: number;
  bufferMin: number;
  /** plannedMin / capacityMin, 0..∞ (may exceed 1 → overload). */
  utilization: number;
}

// ─── Deadline risk ────────────────────────────────────────────────────────────

export type DeadlineRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface DeadlineRiskAssessment {
  taskId: string;
  risk: DeadlineRisk;
  remainingMin: number;
  daysRemaining: number;
  /** Minutes the user realistically has for this task before the deadline. */
  availableMinBeforeDeadline: number;
  /** required daily pace (remainingMin / daysRemaining), minutes. */
  requiredDailyMin: number;
}

// ─── Conflicts ────────────────────────────────────────────────────────────────

export interface ScheduleConflict {
  blockA: ScheduleBlock;
  blockB: ScheduleBlock;
  overlapMin: number;
  suggestions: string[];
}


// ─── Productivity ─────────────────────────────────────────────────────────────

export interface ProductivityInput {
  /** Tasks that were due inside the period. */
  dueTasksCompleted: number;
  dueTasksTotal: number;
  plannedMin: number;
  actualFocusMin: number;
  /** Days with ≥1 focus session, out of periodDays. */
  activeDays: number;
  periodDays: number;
  /** 0-100 progress toward the user's declared goal for the period. */
  goalProgressPct: number;
  /** Average focus-session length, minutes. */
  avgSessionMin: number;
  /** Session length considered "deep work" for this user (default 25). */
  targetSessionMin?: number;
}

export interface ProductivityBreakdown {
  score: number; // 0-100
  components: {
    completionRate: { weight: number; value: number };
    scheduleAdherence: { weight: number; value: number };
    consistency: { weight: number; value: number };
    focusQuality: { weight: number; value: number };
    goalProgress: { weight: number; value: number };
  };
}

// ─── Planned vs Actual ────────────────────────────────────────────────────────

export type VarianceCategory =
  | "COMPLETED_EARLY"
  | "ON_PLAN"
  | "COMPLETED_LATE"
  | "PARTIAL"
  | "SKIPPED"
  | "OVERESTIMATED"
  | "UNDERESTIMATED";

export interface VarianceResult {
  category: VarianceCategory;
  plannedMin: number;
  actualMin: number;
  /** actualMin - plannedMin (negative = under plan). */
  deltaMin: number;
}

// ─── Advisor ──────────────────────────────────────────────────────────────────

export type RecommendationKind =
  | "study_now"
  | "deadline_risk"
  | "overload"
  | "underload"
  | "reschedule"
  | "subject_balance"
  | "consistency"
  | "break"
  | "backlog_recovery";

export interface Recommendation {
  kind: RecommendationKind;
  title: string;
  /** Every recommendation must be explainable from real data — never invented. */
  reasons: string[];
  taskId?: string;
  subject?: string;
  /** Higher = shown first. */
  priority: number;
}

// ─── Recurrence ───────────────────────────────────────────────────────────────

export type RecurrenceRule =
  | { freq: "DAILY"; interval?: number; startDate: string; endDate?: string }
  | { freq: "WEEKDAYS"; weekdays: DayOfWeek[]; startDate: string; endDate?: string }
  | { freq: "EVERY_X_DAYS"; interval: number; startDate: string; endDate?: string }
  | { freq: "WEEKLY"; interval?: number; startDate: string; endDate?: string };

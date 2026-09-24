/**
 * Shared analytics types — single source of truth for the
 * (dashboard)/analytics page and its tab components.
 */

export interface DayDatum {
  date: string | Date;
  minutes: number;
}

export interface WeeklyData {
  bySubject: Record<string, number>;
  byDay: DayDatum[];
}

export interface SummaryData {
  totalMinutes: number;
  averageFocus: number;
  tasksCompleted: number;
  streakDays: number;
}

export interface Milestone {
  date: string;
  goal: string;
  status: string;
}

export interface Prediction {
  period: string;
  predictedScore: number;
  confidence: number;
  milestones: Milestone[];
  recommendations: string[];
}

/** Raw backend performance payload (shape is backend-dependent, keep loose). */
export type PerformanceRaw = Record<string, unknown> & {
  // Common optional fields the backend may return
  focusByDay?: Array<{ date: string; focus: number }>;
  focusAverage?: number;
  sessionsCount?: number;
  totalMinutes?: number;
  bySubject?: Record<string, number>;
  quizScores?: Record<string, number>;
  previousWeekMinutes?: number;
};

export type ScoreLabel = "ممتاز" | "جيد" | "متوسط" | "يحتاج تحسين";

export interface SubjectInsight {
  subject: string;
  minutes: number;
  sharePct: number;
  quizScore: number | null;
  /** heuristic 0-100 combining time share balance + quiz score */
  masteryEstimate: number;
  strength: boolean;
  weakness: boolean;
}

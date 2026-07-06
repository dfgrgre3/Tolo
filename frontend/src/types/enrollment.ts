import { UserSummary } from './user';
import { Subject } from './subject';

/**
 * Enrollment types — synced with backend `internal/models/enrollment.go`
 * Table: SubjectEnrollment (Enrollment model)
 * Last sync: 2026-06-29
 */

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED';

export interface SubjectEnrollment {
  id: string;
  userId: string;
  user?: UserSummary;
  subjectId: string;
  subject?: Subject;
  /** 0–100 progress percentage */
  progress: number;
  /** Legacy alias — same as `progress` */
  progressPercentage?: number;
  enrolledAt: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ────────────────────────────────────────────────────────────
// Lesson / Topic Progress
// (Table: TopicProgress in DB — maps to LessonProgress in Go)
// ────────────────────────────────────────────────────────────

export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface LessonProgress {
  id: string;
  userId: string;
  /** lessonId maps to sub_topic_id in DB */
  lessonId: string;
  status: ProgressStatus;
  completed: boolean;
  timeSpentSeconds: number;
  lastWatchedPosition: number;
  createdAt: string;
  updatedAt: string;
}

/** Legacy alias for LessonProgress (older code may use TopicProgress) */
export type TopicProgress = LessonProgress;

// ────────────────────────────────────────────────────────────
// Course progress summary (returned by GET /api/progress/summary)
// ────────────────────────────────────────────────────────────

export interface CourseProgressSummary {
  subjectId: string;
  subjectName: string;
  thumbnailUrl?: string | null;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  lastAccessedAt?: string | null;
  enrolledAt: string;
}

// ────────────────────────────────────────────────────────────
// Enrollment status check (GET /api/courses/:id/enrollment-status)
// ────────────────────────────────────────────────────────────

export interface EnrollmentStatusResponse {
  enrolled: boolean;
  enrollment?: SubjectEnrollment;
}

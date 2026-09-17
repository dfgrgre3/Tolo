export enum SubjectType {
    MATH = 'MATH',
    PHYSICS = 'PHYSICS',
    CHEMISTRY = 'CHEMISTRY',
    ARABIC = 'ARABIC',
    ENGLISH = 'ENGLISH'
}

export enum ExamType {
    FINAL = 'FINAL',
    MIDTERM = 'MIDTERM',
    QUIZ = 'QUIZ',
    PRACTICE = 'PRACTICE',
    OTHER = 'OTHER'
}

export enum FocusStrategy {
    POMODORO = 'POMODORO',
    EIGHTY_TWENTY = 'EIGHTY_TWENTY',
    DEEP_WORK = 'DEEP_WORK',
    TIME_BLOCKING = 'TIME_BLOCKING',
    NO_DISTRACTION = 'NO_DISTRACTION'
}

export enum TaskStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

/**
 * Frontend enums — the authorization vocabulary (`UserRole`, `UserStatus`)
 * is re-exported from `@thanawy/shared/types/enums` (single source of
 * truth, synced with the backend). The remaining enums below are
 * frontend-local and untouched by that contract.
 */
export { UserRole } from '@thanawy/shared/types/enums';

/** Access entitlements are subscription-derived, not authorization roles. */
export enum Entitlement {
  PREMIUM = 'PREMIUM',
}

export { UserStatus } from '@thanawy/shared/types/enums';

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  EXPERT = 'EXPERT',
}

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

/** Canonical lesson type; unknown server values are adapter-level INVALID. */
export { LessonType } from '@thanawy/shared/types/enums';
export type { LessonType as CanonicalLessonType } from '@thanawy/shared/types/enums';

export enum AchievementCategory {
  STUDY = 'STUDY',
  TASKS = 'TASKS',
  EXAMS = 'EXAMS',
  TIME = 'TIME',
  STREAK = 'STREAK',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum CategoryType {
  BLOG = 'BLOG',
  COURSE = 'COURSE',
  LIBRARY = 'LIBRARY',
}

export enum AddonType {
  EXAM_PACK = 'EXAM_PACK',
  AI_CREDITS = 'AI_CREDITS',
  TEACHER_HOURS = 'TEACHER_HOURS',
  OTHER = 'OTHER',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

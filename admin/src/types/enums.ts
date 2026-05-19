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

export enum UserRole {
    STUDENT = 'STUDENT',
    ADMIN = 'ADMIN',
    TEACHER = 'TEACHER',
    MODERATOR = 'MODERATOR',
}

export enum UserStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED',
    DELETED = 'DELETED',
}

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

export enum LessonType {
  VIDEO = 'VIDEO',
  ARTICLE = 'ARTICLE',
  QUIZ = 'QUIZ',
  FILE = 'FILE',
  ASSIGNMENT = 'ASSIGNMENT',
}

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

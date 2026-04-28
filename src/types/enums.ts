export enum SubjectType {
    MATH = 'MATH',
    PHYSICS = 'PHYSICS',
    CHEMISTRY = 'CHEMISTRY',
    ARABIC = 'ARABIC',
    ENGLISH = 'ENGLISH'
}

enum ExamType {
    FINAL = 'FINAL',
    MIDTERM = 'MIDTERM',
    QUIZ = 'QUIZ',
    PRACTICE = 'PRACTICE',
    OTHER = 'OTHER'
}

enum FocusStrategy {
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
    USER = 'USER',
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

enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  EXPERT = 'EXPERT',
}

enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

enum LessonType {
  VIDEO = 'VIDEO',
  ARTICLE = 'ARTICLE',
  QUIZ = 'QUIZ',
  FILE = 'FILE',
  ASSIGNMENT = 'ASSIGNMENT',
}

enum AchievementCategory {
  STUDY = 'STUDY',
  TASKS = 'TASKS',
  EXAMS = 'EXAMS',
  TIME = 'TIME',
  STREAK = 'STREAK',
}

enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

enum CategoryType {
  BLOG = 'BLOG',
  FORUM = 'FORUM',
  COURSE = 'COURSE',
}

enum AddonType {
  EXAM_PACK = 'EXAM_PACK',
  AI_CREDITS = 'AI_CREDITS',
  TEACHER_HOURS = 'TEACHER_HOURS',
  OTHER = 'OTHER',
}

enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  GRACE_PERIOD = 'GRACE_PERIOD',
}

enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

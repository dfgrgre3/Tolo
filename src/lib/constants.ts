import { UserRole, TaskStatus, FocusStrategy, Difficulty, NotificationType } from '@/types/enums';

/**
 * Enums from Prisma mapping
 */
export {
  UserRole,
  TaskStatus,
  FocusStrategy,
  Difficulty,
  NotificationType
};

export const TASK_STATUS_VALUES = Object.values(TaskStatus);

// Task Priority Constants (Not in Prisma as enum)
export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type TaskPriority = typeof TASK_PRIORITY[keyof typeof TASK_PRIORITY];

export const TASK_PRIORITY_VALUES = Object.values(TASK_PRIORITY);

// Task Priority to Number Mapping
export const TASK_PRIORITY_MAP: Record<TaskPriority, number> = {
  [TASK_PRIORITY.LOW]: 1,
  [TASK_PRIORITY.MEDIUM]: 2,
  [TASK_PRIORITY.HIGH]: 3,
};

// Task Defaults
export const TASK_DEFAULTS = {
  STATUS: TaskStatus.PENDING,
  PRIORITY: TASK_PRIORITY.MEDIUM,
  PRIORITY_NUMBER: TASK_PRIORITY_MAP[TASK_PRIORITY.MEDIUM],
} as const;

// Teacher roles array for queries
export const TEACHER_ROLES = [
  UserRole.TEACHER,
  UserRole.ADMIN,
] as const;

// Types from enums.ts moved here
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

// Map SubjectType to actual database IDs
export const SUBJECT_ID_MAP: Record<string, string> = {
  [SubjectType.MATH]: 'math-course',
  [SubjectType.PHYSICS]: 'physics-course',
  [SubjectType.CHEMISTRY]: 'chemistry-course',
  [SubjectType.ARABIC]: 'arabic-course',
  [SubjectType.ENGLISH]: 'english-course',
};

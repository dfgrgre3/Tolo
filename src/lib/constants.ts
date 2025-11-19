/**
 * API Constants
 * Centralized constants for API routes to avoid hardcoded values
 */

// Task Status Constants
export const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

export const TASK_STATUS_VALUES = Object.values(TASK_STATUS);

// Task Priority Constants
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
  STATUS: TASK_STATUS.PENDING,
  PRIORITY: TASK_PRIORITY.MEDIUM,
  PRIORITY_NUMBER: TASK_PRIORITY_MAP[TASK_PRIORITY.MEDIUM],
} as const;

// User Role Constants
export const USER_ROLE = {
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
  // Lowercase variants for compatibility
  teacher: 'teacher',
  admin: 'admin',
  student: 'student',
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

// Teacher roles array for queries
export const TEACHER_ROLES = [
  USER_ROLE.TEACHER,
  USER_ROLE.ADMIN,
  USER_ROLE.teacher,
  USER_ROLE.admin,
] as const;


import 'server-only';
/**
 * Data-Access Layer — central export point for all repositories.
 *
 * Usage:
 *   import { authRepository, subjectRepository } from '@/data-access';
 *   or
 *   import { authRepository } from '@/data-access/repositories/auth-repository';
 */
export { authRepository } from './repositories/auth-repository';
export { subjectRepository } from './repositories/subject-repository';
export { courseRepository } from './repositories/course-repository';
export { enrollmentRepository } from './repositories/enrollment-repository';
export { userRepository } from './repositories/user-repository';
export { examRepository } from './repositories/exam-repository';

// Re-export types
export type { LoginPayload, RegisterPayload, AuthResponse } from './repositories/auth-repository';
export type { GetCoursesParams, CreateReviewPayload } from './repositories/subject-repository';
export type { BillingSummary, UserSettings } from './repositories/user-repository';

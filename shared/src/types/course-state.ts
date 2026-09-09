/**
 * Canonical course and enrollment state vocabulary.
 *
 * Legacy API fields (`isActive`, `isPublished`, `isEnrolled`) are accepted
 * only at the adapter boundary. Feature code should consume the derived
 * state returned by `deriveCourseAccessState`.
 */
export type CourseLifecycle =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'REJECTED';

export type EnrollmentLifecycle =
  | 'ELIGIBLE'
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export type CourseAccessState =
  | 'UNAVAILABLE'
  | 'PREVIEW'
  | 'ENROLLED'
  | 'COMPLETED';

export interface CourseStateInput {
  lifecycle?: CourseLifecycle | null;
  status?: string | null;
  isActive?: boolean | null;
  isPublished?: boolean | null;
  isEnrolled?: boolean | null;
  progress?: number | null;
  completedAt?: string | Date | null;
}

export interface CourseState {
  lifecycle: CourseLifecycle;
  enrollment: EnrollmentLifecycle;
  access: CourseAccessState;
  progress: number;
  isComplete: boolean;
  certificateEligible: boolean;
}

const COURSE_LIFECYCLES: readonly CourseLifecycle[] = [
  'DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED', 'REJECTED',
];

export function normalizeCourseLifecycle(input: CourseStateInput): CourseLifecycle {
  const candidate = String(input.lifecycle ?? input.status ?? '').toUpperCase() as CourseLifecycle;
  if (COURSE_LIFECYCLES.includes(candidate)) return candidate;
  if (input.isPublished) return input.isActive === false ? 'PUBLISHED' : 'PUBLISHED';
  return 'DRAFT';
}

export function deriveCourseAccessState(input: CourseStateInput): CourseState {
  const lifecycle = normalizeCourseLifecycle(input);
  const progress = Math.max(0, Math.min(100, Number(input.progress ?? 0)));
  const isEnrolled = Boolean(input.isEnrolled);
  // Completion is an enrollment-owned state. A stale or malformed public
  // payload must not grant COMPLETED access from progress alone.
  const isComplete = isEnrolled && (Boolean(input.completedAt) || progress >= 100);
  const isPublic = lifecycle === 'PUBLISHED' && input.isActive !== false && input.isPublished !== false;
  const enrollment: EnrollmentLifecycle = isComplete
    ? 'COMPLETED'
    : isEnrolled
      ? 'ACTIVE'
      : isPublic
        ? 'ELIGIBLE'
        : 'CANCELLED';
  const access: CourseAccessState = isComplete
    ? 'COMPLETED'
    : isEnrolled
      ? 'ENROLLED'
      : isPublic
        ? 'PREVIEW'
        : 'UNAVAILABLE';

  return {
    lifecycle,
    enrollment,
    access,
    progress,
    isComplete,
    certificateEligible: isComplete && isEnrolled,
  };
}

export function canTransitionEnrollment(
  from: EnrollmentLifecycle,
  to: EnrollmentLifecycle,
): boolean {
  const transitions: Record<EnrollmentLifecycle, readonly EnrollmentLifecycle[]> = {
    ELIGIBLE: ['PENDING_PAYMENT', 'ACTIVE', 'CANCELLED'],
    PENDING_PAYMENT: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: ['ELIGIBLE', 'PENDING_PAYMENT'],
  };
  return transitions[from].includes(to);
}

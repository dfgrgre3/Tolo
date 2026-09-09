/** Canonical lesson/course progress contracts and their shared invariant. */
export interface LessonProgressSnapshot {
  lessonId: string;
  completed: boolean;
  percentage: number;
  secondsWatched?: number;
  updatedAt?: string | Date;
}

export interface CompletionEligibility {
  isComplete: boolean;
  certificateEligible: boolean;
  requiredExams: number;
  completedRequiredExams: number;
  requiredCourseQuizzes: number;
  completedCourseQuizzes: number;
}

export interface CourseProgressSnapshot {
  courseProgress: number;
  completedLessons: number;
  totalLessons: number;
  eligibility: CompletionEligibility;
}

export interface LessonProgressMutationResponse extends CourseProgressSnapshot {
  lesson: LessonProgressSnapshot;
  xpAwarded?: number;
}

export interface LegacyLessonProgressResponse {
  lessonProgress?: number;
  courseProgress?: number;
  isCourseComplete?: boolean;
  certificateEligible?: boolean;
  completedLessons?: number;
  totalLessons?: number;
  requiredExams?: number;
  completedRequiredExams?: number;
  requiredCourseQuizzes?: number;
  completedCourseQuizzes?: number;
  xpAwarded?: number;
}

export function normalizeLessonProgressResponse(
  input: LegacyLessonProgressResponse,
  lessonId: string,
): LessonProgressMutationResponse {
  const courseProgress = clampPercentage(input.courseProgress ?? 0);
  const lessonPercentage = clampPercentage(input.lessonProgress ?? (input.isCourseComplete ? 100 : 0));
  const eligibility: CompletionEligibility = {
    // Progress is a display metric; completion is server-authoritative and
    // may remain false while required exams or course quizzes are pending.
    isComplete: Boolean(input.isCourseComplete),
    certificateEligible: Boolean(input.certificateEligible),
    requiredExams: input.requiredExams ?? 0,
    completedRequiredExams: input.completedRequiredExams ?? 0,
    requiredCourseQuizzes: input.requiredCourseQuizzes ?? 0,
    completedCourseQuizzes: input.completedCourseQuizzes ?? 0,
  };

  return {
    lesson: { lessonId, completed: lessonPercentage >= 100, percentage: lessonPercentage },
    courseProgress,
    completedLessons: input.completedLessons ?? 0,
    totalLessons: input.totalLessons ?? 0,
    eligibility,
    xpAwarded: input.xpAwarded,
  };
}

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

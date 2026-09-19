/**
 * Canonical Course Domain Model (P0-2 Architecture Standard).
 *
 * Provides a unified, state-of-the-art LMS domain model for courses,
 * decoupling UI components from legacy database representations (Subject / Topic / SubTopic).
 */

export type CourseLifecycleStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED"
  | "REJECTED";

export type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";

export type LessonContentType =
  | "VIDEO"
  | "ARTICLE"
  | "QUIZ"
  | "ASSIGNMENT"
  | "AUDIO"
  | "DOCUMENT"
  | "LINK"
  | "LIVE";

export interface CanonicalAttachment {
  id: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
}

export interface CanonicalLesson {
  id: string;
  sectionId?: string;
  title: string;
  type: LessonContentType;
  order: number;
  durationMinutes: number;
  isPreview: boolean;
  videoUrl?: string | null;
  content?: string | null;
  description?: string | null;
  attachments?: CanonicalAttachment[];
  examId?: string | null;
}

export interface CanonicalSection {
  id: string;
  courseId?: string;
  title: string;
  order: number;
  description?: string | null;
  lessons: CanonicalLesson[];
}

export interface CanonicalQuizQuestion {
  id: string;
  text: string;
  type: "multiple_choice" | "true_false" | "single_choice";
  options: string[];
  correctAnswer: number | number[];
  explanation?: string;
  points?: number;
}

export interface CanonicalQuiz {
  id?: string;
  lessonId?: string;
  title: string;
  passingScore: number;
  timeLimitMinutes?: number;
  required?: boolean;
  questions: CanonicalQuizQuestion[];
}

export interface CanonicalPricing {
  price: number;
  currency: string;
  discountPrice?: number;
  isFree?: boolean;
}

export interface CanonicalCourse {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  trailerUrl?: string;
  status: CourseLifecycleStatus;
  level: CourseLevel;
  language: string;
  categoryId?: string;
  instructorId?: string;
  instructorName?: string;
  version: string;
  pricing: CanonicalPricing;
  sections: CanonicalSection[];
  quizzes?: CanonicalQuiz[];
  createdAt?: string;
  updatedAt?: string;
}

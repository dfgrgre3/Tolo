/**
 * Canonical education domain model — the SINGLE source of truth.
 *
 * The backend entity for "a course" is `Subject` (Go: models.Subject /
 * /api/courses/*). Everything else is a relation of it:
 *
 *   Course (Subject)
 *    ├── Topic            (chapter)
 *    │    └── Lesson      (SubTopic — video / quiz / article / assignment)
 *    ├── Enrollment       (user ↔ course)
 *    ├── Progress         (per-lesson / per-course completion)
 *    ├── Review           (CourseReview)
 *    └── Quiz             (see `@/types/course-quiz` + InteractiveQuestion)
 *
 * Page-level view models must NOT re-declare these shapes; they are
 * projections produced by the mappers in `./mappers`.
 */
export type {
  Level,
  SubTopicType,
  Subject,
  Topic,
  SubTopic,
  LessonAttachment,
  CourseReview,
} from '@/types/subject';

import type { Subject, SubTopic, Topic } from '@/types/subject';

/** A course is a Subject in the backend domain. */
export type Course = Subject;
/** A lesson is a SubTopic in the backend domain. */
export type Lesson = SubTopic;
/** A chapter is a Topic in the backend domain. */
export type Chapter = Topic;

/** User ↔ course enrollment with the user's aggregate progress. */
export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;          // percentage 0-100
  enrolledAt: Date | string;
  completedAt?: Date | string | null;
}

/** Per-lesson completion state (backend: /courses/lessons/{id}/progress). */
export interface Progress {
  lessonId: string;
  userId: string;
  completed: boolean;
  percentage: number;        // 0-100 within the lesson
  secondsWatched?: number;
  updatedAt: Date | string;
}

/** Interactive video question (backend: LmsInteractiveQuiz). */
export interface InteractiveQuestion {
  id: string;
  time: number;              // seconds into the video
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}
/**
 * Courses Domain Models & Types (P0-12 / P0-14)
 */

export type {
  CourseLifecycleStatus,
  CourseLevel,
  LessonContentType,
  CanonicalAttachment,
  CanonicalLesson,
  CanonicalSection,
  CanonicalCourse,
} from "@/types/domain/canonical-course";

export type { Subject, Topic, SubTopic } from "@/types/subject";

export {
  toCanonicalCourse,
  toTeachingMutationPayload,
  type TeachingMutationOptions,
} from "@/lib/course/course-domain-adapter";

/**
 * Teaching-dashboard projections of the canonical education domain.
 *
 * Subject/Topic/SubTopic remain the persisted domain models. These types only
 * describe the fields needed by the teaching UI and never replace the domain
 * model or introduce another course identity.
 */
import type { Subject, Topic, SubTopic } from "@/types/subject";
import type { QuizQuestion } from "@/types/course-quiz";
import type { CourseLifecycle } from "@thanawy/shared/types/course-state";

/** Explicit authoring DTO for the canonical SubTopic contract. */
export type TeachingLessonInput = Pick<SubTopic, "id" | "title" | "type"> & Partial<Pick<SubTopic, "description" | "content" | "videoUrl" | "examId" | "durationMinutes" | "isFree" | "order" | "attachments">> & {
  clientId?: string;
  isPreview?: boolean;
};

/** @deprecated Use TeachingLessonInput for write operations. */
export type TeachingLesson = TeachingLessonInput;
export type TeachingCourseStatus = CourseLifecycle;

export type TeachingChapter = Pick<Topic, "id" | "title"> & {
  clientId?: string;
  lessons: TeachingLessonInput[];
};

export type TeachingQuiz = {
  id?: string;
  lessonId?: string;
  title: string;
  passingScore: number;
  required?: boolean;
  timeLimitMinutes?: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showCorrectAnswers: boolean;
  maxAttempts?: number;
  showResultsImmediately?: boolean;
  allowReview?: boolean;
  status?: "draft" | "published" | "archived";
  questions: QuizQuestion[];
};

/** Subject identity plus teaching-only presentation fields. */
export type TeachingCourse = Pick<
  Subject,
  "id" | "description" | "thumbnailUrl" | "price" | "level" | "categoryId" | "enrolledCount" | "rating" | "durationHours"
> & {
  title: string;
  thumbnail: string;
  status: TeachingCourseStatus;
  studentsCount: number;
  lessonsCount: number;
  duration: string;
  category: string;
  createdDate: string;
  chapters: TeachingChapter[];
  quiz?: TeachingQuiz;
  quizzes?: TeachingQuiz[];
};

export type { QuizQuestion } from "@/types/course-quiz";

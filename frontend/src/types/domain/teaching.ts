/**
 * Teaching-dashboard projections of the canonical education domain.
 *
 * Subject/Topic/SubTopic remain the persisted domain models. These types only
 * describe the fields needed by the teaching UI and never replace the domain
 * model or introduce another course identity.
 */
import type { Subject, Topic, SubTopic } from "@/types/subject";
import type { QuizQuestion } from "@/types/course-quiz";

export type TeachingLesson = Pick<SubTopic, "id" | "title" | "type"> & {
  clientId?: string;
  durationMinutes: number;
  url?: string;
  isPreview?: boolean;
  description?: string;
  attachmentName?: string;
};

export type TeachingChapter = Pick<Topic, "id" | "title"> & {
  clientId?: string;
  lessons: TeachingLesson[];
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
  status: "published" | "draft" | "archived";
  studentsCount: number;
  lessonsCount: number;
  duration: string;
  category: string;
  createdDate: string;
  chapters: TeachingChapter[];
  quiz?: TeachingQuiz;
};

export type { QuizQuestion } from "@/types/course-quiz";

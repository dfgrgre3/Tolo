/**
 * Learning Hub view models.
 * Defined ONCE in `@/types/domain/mappers` and projected from the canonical
 * domain model (`@/types/domain/course`). Do not re-declare fields here.
 */
import type {
  AttachmentView,
  LearningLessonView,
  ChapterView,
  LearningCourseView,
} from "@/types/domain/mappers";

export type Attachment = AttachmentView;
export type Lesson = LearningLessonView;
export type Chapter = ChapterView;
export type Course = LearningCourseView;

export type LessonQuestion = {
  id: string;
  content: string;
  createdAt: string;
  user?: {
    name?: string | null;
  };
};

export type TabKey = "content" | "resources" | "qna" | "notes" | "ai";

/**
 * Canonical Course Domain Adapters (P0-2 & P0-3).
 *
 * Provides bidirectional transformations between external API representations
 * (legacy Subject/Topic/SubTopic and Teaching payloads) and the Canonical Course Domain.
 */
import type {
  CanonicalCourse,
  CanonicalSection,
  CanonicalLesson,
  CanonicalAttachment,
  CourseLifecycleStatus,
  CourseLevel,
  LessonContentType,
} from "@/types/domain/canonical-course";

/**
 * Normalizes any course-like object from the backend/API into a CanonicalCourse.
 */
export function toCanonicalCourse(raw: Record<string, any>): CanonicalCourse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid course payload: expected object");
  }

  const id = String(raw.id ?? "");
  const title = String(raw.title ?? raw.name ?? "");
  const status: CourseLifecycleStatus = (
    raw.status ? String(raw.status).toUpperCase() : "DRAFT"
  ) as CourseLifecycleStatus;

  const level: CourseLevel = (
    raw.level ? String(raw.level).toUpperCase() : "INTERMEDIATE"
  ) as CourseLevel;

  const rawPrice = Number(raw.price ?? 0);
  const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0;

  // Sections may arrive as `sections`, `chapters`, `topics`, or `curriculum`
  const rawSections: any[] = Array.isArray(raw.sections)
    ? raw.sections
    : Array.isArray(raw.chapters)
    ? raw.chapters
    : Array.isArray(raw.topics)
    ? raw.topics
    : Array.isArray(raw.curriculum)
    ? raw.curriculum
    : [];

  const sections: CanonicalSection[] = rawSections.map((sec, secIdx) => {
    const rawLessons: any[] = Array.isArray(sec.lessons)
      ? sec.lessons
      : Array.isArray(sec.subTopics)
      ? sec.subTopics
      : [];

    const lessons: CanonicalLesson[] = rawLessons.map((les, lesIdx) => {
      const rawDuration = Number(les.durationMinutes ?? les.duration ?? 0);
      const durationMinutes = Number.isFinite(rawDuration) && rawDuration >= 0 ? rawDuration : 0;
      const rawAttachments: any[] = Array.isArray(les.attachments) ? les.attachments : [];

      const attachments: CanonicalAttachment[] = rawAttachments.map((att) => ({
        id: String(att.id ?? ""),
        title: String(att.title ?? ""),
        fileUrl: String(att.fileUrl ?? att.fileURL ?? ""),
        fileType: att.fileType ? String(att.fileType) : undefined,
        fileSize: typeof att.fileSize === "number" ? att.fileSize : undefined,
      }));

      return {
        id: String(les.id ?? ""),
        sectionId: String(sec.id ?? ""),
        title: String(les.title ?? les.name ?? ""),
        type: (les.type ? String(les.type).toUpperCase() : "VIDEO") as LessonContentType,
        order: typeof les.order === "number" ? les.order : lesIdx + 1,
        durationMinutes,
        isPreview: Boolean(les.isFree ?? les.isPreview ?? false),
        videoUrl: les.videoUrl ?? null,
        content: les.content ?? null,
        description: les.description ?? null,
        attachments,
        examId: les.examId ?? null,
      };
    });

    return {
      id: String(sec.id ?? ""),
      courseId: id,
      title: String(sec.title ?? sec.name ?? ""),
      order: typeof sec.order === "number" ? sec.order : secIdx + 1,
      description: sec.description ?? null,
      lessons,
    };
  });

  return {
    id,
    title,
    slug: raw.slug ? String(raw.slug) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    shortDescription: raw.shortDescription ? String(raw.shortDescription) : undefined,
    thumbnailUrl: raw.thumbnailUrl ?? raw.thumbnail ?? undefined,
    trailerUrl: raw.trailerUrl ?? undefined,
    status,
    level,
    language: raw.language ? String(raw.language) : "ar",
    categoryId: raw.categoryId ? String(raw.categoryId) : undefined,
    instructorId: raw.instructorId ? String(raw.instructorId) : undefined,
    instructorName: raw.instructorName ? String(raw.instructorName) : undefined,
    version: raw.version ? String(raw.version) : "1.0.0",
    pricing: {
      price,
      currency: raw.currency ? String(raw.currency) : "EGP",
      discountPrice: raw.discountPrice ? Number(raw.discountPrice) : undefined,
      isFree: price === 0,
    },
    sections,
    quizzes: Array.isArray(raw.quizzes) ? raw.quizzes : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

export interface TeachingMutationOptions {
  deletedChapterIds?: string[];
  deletedLessonIds?: string[];
}

/**
 * Converts a CanonicalCourse or partial course update into the backend teaching mutation payload.
 * Injects explicit deletions for safe non-destructive curriculum updates (P0-3).
 */
export function toTeachingMutationPayload(
  course: Partial<CanonicalCourse>,
  options: TeachingMutationOptions = {}
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (course.title !== undefined) payload.title = course.title;
  if (course.description !== undefined) payload.description = course.description;
  if (course.thumbnailUrl !== undefined) payload.thumbnail = course.thumbnailUrl;
  if (course.pricing?.price !== undefined) payload.price = course.pricing.price;
  if (course.level !== undefined) payload.level = course.level;
  if (course.categoryId !== undefined) payload.categoryId = course.categoryId;
  if (course.language !== undefined) payload.language = course.language;

  if (course.sections !== undefined) {
    payload.chapters = course.sections.map((section, secIdx) => ({
      ...(section.id ? { id: section.id } : {}),
      title: section.title,
      order: section.order ?? secIdx + 1,
      lessons: section.lessons.map((lesson, lesIdx) => ({
        ...(lesson.id ? { id: lesson.id } : {}),
        title: lesson.title,
        order: lesson.order ?? lesIdx + 1,
        type: lesson.type,
        durationMinutes: lesson.durationMinutes,
        isFree: lesson.isPreview,
        videoUrl: lesson.videoUrl ?? null,
        content: lesson.content ?? null,
        description: lesson.description ?? null,
        examId: lesson.examId ?? null,
        attachments: (lesson.attachments ?? []).map((att) => ({
          ...(att.id ? { id: att.id } : {}),
          title: att.title,
          fileUrl: att.fileUrl,
          fileType: att.fileType ?? "application/octet-stream",
          fileSize: att.fileSize ?? 0,
        })),
      })),
    }));
  }

  if (options.deletedChapterIds && options.deletedChapterIds.length > 0) {
    payload.deletedChapterIds = options.deletedChapterIds;
  }

  if (options.deletedLessonIds && options.deletedLessonIds.length > 0) {
    payload.deletedLessonIds = options.deletedLessonIds;
  }

  return payload;
}

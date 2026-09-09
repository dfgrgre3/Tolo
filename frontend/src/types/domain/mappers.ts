/**
 * Single DTO → view-model mapper layer.
 *
 * Every page/projected shape used by the education UI is defined ONCE here
 * and derived from the domain model in `./course`. Pages re-export the types
 * they need instead of re-declaring parallel interfaces (which is how the
 * `Course` / `CourseLesson` / `Lesson` drift started).
 */
import type { Subject, Topic, SubTopic, LessonAttachment, InteractiveQuestion, Enrollment, Progress } from './course';

// ──────────────────────────────────────────────
// Course detail page (app/(education)/courses/[id])
// ──────────────────────────────────────────────

/** Server DTO for /courses/{id}/lessons — fields are optional until mapped. */
export interface LessonRowDTO {
  id: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  content?: string | null;
  videoUrl?: string | null;
  type?: string | null;
  isFree?: boolean | null;
  locked?: boolean | null;
  durationMinutes?: number | null;
  order?: number | null;
  completed?: boolean | null;
  progress?: number | null;
}

export interface CourseDetailResponse {
  subject: Subject;
  enrollment?: Enrollment | null;
}

export interface CourseDetailHydrationResponse {
  subject: Subject;
  enrollment?: Enrollment | null;
  lessons: LessonRowDTO[];
  progress?: CourseLessonsResponse["progress"];
  access: { isEnrolled: boolean };
  completion?: CompletionSnapshot;
}

export interface EnrollmentStatusResponse {
  isEnrolled: boolean;
  status: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  requiredCourseQuizzes?: number;
  completedCourseQuizzes?: number;
}

export interface CourseLessonsResponse {
  lessons: LessonRowDTO[];
  progress?: Record<string, Pick<Progress, 'completed' | 'percentage'> | boolean>;
}

export interface LearningHubResponse {
  subject?: Subject;
  enrollment?: Enrollment | null;
  curriculum?: ChapterView[];
  topics?: Topic[];
  completion?: CompletionSnapshot;
}

export interface LessonNotesResponse {
  content?: string | null;
}

export interface LessonQuestionsResponse {
  questions: Array<{
    id: string;
    content: string;
    createdAt: string;
    user?: { name?: string | null };
  }>;
}

export interface LessonProgressResponse {
  xpAwarded?: number;
  isCourseComplete?: boolean;
  lessonProgress?: number;
  courseProgress?: number;
  completedLessons?: number;
  totalLessons?: number;
  requiredExams?: number;
  completedRequiredExams?: number;
  certificateEligible?: boolean;
}

export interface EnrollmentResponse {
  requiresPayment?: boolean;
}

export interface EnrollmentEligibilityResponse {
  courseId: string;
  isEnrolled: boolean;
  eligible: boolean;
  requiresPayment: boolean;
  price: number;
}

export interface CompletionSnapshot {
  isComplete: boolean;
  progress: number;
  certificateEligible: boolean;
  completedRequiredExams?: number;
  requiredExams?: number;
  completedCourseQuizzes?: number;
  requiredCourseQuizzes?: number;
}

/** View model for the course-detail page hero / sidebar. */
export interface CourseSummaryView {
  id: string;
  title: string;
  description: string;
  instructor: string;
  subject: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration: number;
  thumbnailUrl?: string;
  price: number;
  rating: number;
  enrolledCount: number;
  createdAt: string;
  tags?: string[];
  enrolled: boolean;
  progress?: number;
  hasCertificate: boolean;
  completion?: CompletionSnapshot;
  lessonsCount?: number;
  whatYouLearn?: string[];
  coursePrerequisites?: string[];
  targetAudience?: string[];
  requirements?: string;
  learningObjectives?: string;
}

/** View model of one lesson row inside the course-detail curriculum list. */
export interface LessonCardView {
  id: string;
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  type: 'VIDEO' | 'ARTICLE' | 'QUIZ' | 'ASSIGNMENT' | 'DOCUMENT' | 'AUDIO' | 'LIVE' | 'LINK' | 'INVALID';
  isFree: boolean;
  locked: boolean;
  /** seconds (normalized from durationMinutes) */
  duration: number;
  order: number;
  completed: boolean;
  progress: number;
}

const LESSON_TYPES = new Set(['VIDEO', 'ARTICLE', 'QUIZ', 'ASSIGNMENT', 'DOCUMENT', 'AUDIO', 'LIVE', 'LINK', 'INVALID']);

function normalizeLessonType(type?: string | null): LessonCardView['type'] {
  const normalized = type?.trim().toUpperCase();
  return normalized && LESSON_TYPES.has(normalized)
    ? (normalized as LessonCardView['type'])
    : reportInvalidLessonType(type);
}

function reportInvalidLessonType(type?: string | null): 'INVALID' {
  if (typeof console !== 'undefined') {
    console.warn('[LessonMapper] rejected unknown lesson type', { type: type ?? null });
  }
  return 'INVALID';
}

/** Subject (course) + enrollment state → course-detail view model. */
export function toCourseSummary(
  subject: Subject,
  opts: { enrolled?: boolean; progress?: number; completion?: CompletionSnapshot } = {}
): CourseSummaryView {
  return {
    id: subject.id,
    title: subject.nameAr || subject.name,
    description: subject.description || 'لا يوجد وصف متاح لهذه الدورة.',
    instructor: subject.instructorName || 'المنصة التعليمية',
    subject: subject.nameAr || subject.name,
    level: subject.level || 'INTERMEDIATE',
    duration: subject.durationHours || 0,
    thumbnailUrl: subject.thumbnailUrl || undefined,
    price: subject.price || 0,
    rating: subject.rating || 0,
    enrolledCount: subject.enrolledCount || 0,
    createdAt: String(subject.createdAt || new Date().toISOString()),
    tags: [subject.nameAr || subject.name, ...(subject.tags || []).map((tag) => tag.name)],
    enrolled: Boolean(opts.enrolled),
    progress: opts.enrolled ? opts.progress || 0 : undefined,
    hasCertificate: Boolean(subject.hasCertificate),
    completion: opts.completion,
    whatYouLearn: subject.whatYouLearn,
    coursePrerequisites: subject.coursePrerequisites,
    targetAudience: subject.targetAudience,
    requirements: subject.requirements || undefined,
    learningObjectives: subject.learningObjectives || undefined,
  };
}

/** Raw lesson row → curriculum card. Duration is normalized to seconds. */
export function toLessonCard(raw: LessonRowDTO, index = 0): LessonCardView {
  const durationMinutes = typeof raw.durationMinutes === 'number' ? raw.durationMinutes : 0;
  return {
    id: raw.id,
    title: raw.title || raw.name || `الدرس ${index + 1}`,
    description: raw.description || undefined,
    content: raw.content || undefined,
    videoUrl: raw.videoUrl || undefined,
    type: normalizeLessonType(raw.type),
    isFree: Boolean(raw.isFree),
    locked: Boolean(raw.locked),
    duration: durationMinutes > 0 ? durationMinutes * 60 : 0,
    order: raw.order || index + 1,
    completed: Boolean(raw.completed),
    progress: typeof raw.progress === 'number' ? raw.progress : raw.completed ? 100 : 0,
  };
}

/** Raw lesson rows → curriculum cards, preserving server order. */
export function toLessonCards(rows: LessonRowDTO[]): LessonCardView[] {
  return (rows || []).map((row, i) => toLessonCard(row, i));
}

// ──────────────────────────────────────────────
// Learning Hub (app/(education)/learning/[courseId])
// ──────────────────────────────────────────────

/** Attachment projection used by the Learning Hub resources tab. */
export interface AttachmentView {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

/** View model of a lesson inside the Learning Hub player. */
export interface LearningLessonView {
  id: string;
  name: string;
  description: string | null;
  content: string | null;
  videoUrl: string | null;
  type: 'VIDEO' | 'ARTICLE' | 'QUIZ' | 'ASSIGNMENT' | 'DOCUMENT' | 'AUDIO' | 'LIVE' | 'LINK' | 'INVALID';
  completed: boolean;
  order: number;
  durationMinutes: number;
  isFree: boolean;
  locked: boolean;
  attachments?: AttachmentView[];
  examId?: string | null;
  interactiveQuestions?: InteractiveQuestion[];
}

/** View model of a chapter (Topic) with its lessons. */
export interface ChapterView {
  id: string;
  name: string;
  order: number;
  subTopics: LearningLessonView[];
}

/** Learning Hub header card. */
export interface LearningCourseView {
  id: string;
  title: string;
  instructor: string;
  rating: number;
  thumbnailUrl?: string | null;
  /** Server-owned completion state; lesson count alone is not certification. */
  completion?: { isComplete: boolean; progress: number };
}

/** LessonAttachment (domain) → resources-tab projection. */
export function toAttachmentView(a: LessonAttachment): AttachmentView {
  return {
    id: a.id,
    title: a.title,
    fileUrl: a.fileUrl,
    fileType: a.fileType,
    fileSize: a.fileSize,
  };
}

/** Domain SubTopic → Learning Hub lesson (server curriculum already matches). */
export function toLearningLesson(raw: SubTopic & Record<string, unknown>): LearningLessonView {
  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments.map(toAttachmentView)
    : undefined;
  return {
    id: raw.id,
    name: raw.title,
    description: raw.description ?? null,
    content: raw.content ?? null,
    videoUrl: raw.videoUrl ?? null,
    type: normalizeLessonType(raw.type),
    completed: Boolean((raw as { completed?: boolean }).completed),
    order: raw.order,
    durationMinutes: raw.durationMinutes || 0,
    isFree: raw.isFree,
    locked: Boolean((raw as { locked?: boolean }).locked),
    attachments,
    examId: raw.examId ?? null,
    interactiveQuestions: Array.isArray(raw.interactiveQuestions)
      ? (raw.interactiveQuestions as InteractiveQuestion[])
      : undefined,
  };
}

/** Curriculum payload chapters → Learning Hub chapters. */
export function toLearningChapters(
  chapters: ((Omit<ChapterView, 'subTopics'>) & {
    subTopics: (SubTopic & Record<string, unknown>)[];
  })[]
): ChapterView[] {
  return (chapters || []).map((c) => ({
    id: c.id,
    name: c.name,
    order: c.order,
    subTopics: (c.subTopics || []).map((l) => toLearningLesson(l)),
  }));
}

/** Backend Subject curriculum DTO → the canonical Learning Hub chapter view. */
export function toLearningChaptersFromTopics(topics: Topic[]): ChapterView[] {
  return (topics || []).map((topic) => ({
    id: topic.id,
    name: topic.title,
    order: topic.order,
    subTopics: (topic.subTopics || []).map((lesson) =>
      toLearningLesson(lesson as SubTopic & Record<string, unknown>)
    ),
  }));
}

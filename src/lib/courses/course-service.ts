import { prisma } from "@/lib/db";

export const COURSE_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

export type CourseLevel = (typeof COURSE_LEVELS)[number];

export interface SubjectProgressSummary {
  totalLessons: number;
  completedLessons: number;
  percentage: number;
}

export interface CourseSummary {
  id: string;
  title: string;
  description: string;
  instructor: string;
  subject: string;
  categoryId: string;
  categoryName: string;
  level: CourseLevel;
  duration: number;
  thumbnailUrl?: string;
  price: number;
  rating: number;
  enrolledCount: number;
  createdAt: string;
  tags: string[];
  enrolled: boolean;
  progress?: number;
  lessonsCount: number;
}

export interface CourseCategory {
  id: string;
  name: string;
  icon: string;
  count?: number;
}

type SubjectWithStats = {
  id: string;
  name: string;
  nameAr: string | null;
  code: string | null;
  description: string | null;
  type: string | null;
  createdAt: Date;
  teachers: Array<{ name: string; rating: number }>;
  _count: { enrollments: number };
};

const CATEGORY_NAMES: Record<string, string> = {
  MATH: "الرياضيات",
  PHYSICS: "الفيزياء",
  CHEMISTRY: "الكيمياء",
  BIOLOGY: "الأحياء",
  ARABIC: "اللغة العربية",
  ENGLISH: "اللغة الإنجليزية",
  HISTORY: "التاريخ",
  GEOGRAPHY: "الجغرافيا",
  PHILOSOPHY: "الفلسفة",
  RELIGION: "التربية الدينية",
  PROGRAMMING: "البرمجة",
  COMPUTER_SCIENCE: "علوم الحاسب",
  GENERAL: "عام",
};

const CATEGORY_ICONS: Record<string, string> = {
  MATH: "🔢",
  PHYSICS: "⚛️",
  CHEMISTRY: "🧪",
  BIOLOGY: "🧬",
  ARABIC: "📝",
  ENGLISH: "🔤",
  HISTORY: "🏛️",
  GEOGRAPHY: "🌍",
  PHILOSOPHY: "💭",
  RELIGION: "🕌",
  PROGRAMMING: "💻",
  COMPUTER_SCIENCE: "🖥️",
  GENERAL: "📘",
};

const CATEGORY_KEYWORDS: Array<{ id: string; keywords: string[] }> = [
  { id: "MATH", keywords: ["math", "رياض", "algebra", "geometry"] },
  { id: "PHYSICS", keywords: ["physics", "فيزياء"] },
  { id: "CHEMISTRY", keywords: ["chem", "كيمياء"] },
  { id: "BIOLOGY", keywords: ["bio", "أحياء", "احياء"] },
  { id: "ARABIC", keywords: ["arabic", "لغة عربية", "عربي"] },
  { id: "ENGLISH", keywords: ["english", "لغة انجليزية", "إنجليزي", "انجليزي"] },
  { id: "HISTORY", keywords: ["history", "تاريخ"] },
  { id: "GEOGRAPHY", keywords: ["geo", "جغرافيا"] },
  { id: "PHILOSOPHY", keywords: ["philosophy", "فلسفة"] },
  { id: "RELIGION", keywords: ["religion", "دين", "اسلام", "إسلام"] },
  { id: "PROGRAMMING", keywords: ["program", "برمجة", "coding", "code"] },
  { id: "COMPUTER_SCIENCE", keywords: ["computer", "حاسب", "cs", "علوم"] },
];

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCategoryToken(value?: string | null): string {
  if (!value) {
    return "";
  }

  return normalizeSpaces(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toSafeArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function inferCategoryFromText(text: string): string {
  const normalized = text.toLowerCase();
  for (const category of CATEGORY_KEYWORDS) {
    if (category.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
      return category.id;
    }
  }

  return "GENERAL";
}

export function resolveCourseCategory(subject: {
  type?: string | null;
  code?: string | null;
  name: string;
  nameAr?: string | null;
}): string {
  const normalizedType = normalizeCategoryToken(subject.type);
  if (normalizedType && CATEGORY_NAMES[normalizedType]) {
    return normalizedType;
  }

  const normalizedCode = normalizeCategoryToken(subject.code);
  if (normalizedCode && CATEGORY_NAMES[normalizedCode]) {
    return normalizedCode;
  }

  return inferCategoryFromText(`${subject.name} ${subject.nameAr ?? ""}`);
}

export function resolveCourseLevel(rawValue?: string | null): CourseLevel {
  const value = (rawValue ?? "").toUpperCase();

  if (["BEGINNER", "EASY", "INTRO", "FOUNDATION"].includes(value)) {
    return "BEGINNER";
  }

  if (["ADVANCED", "HARD", "EXPERT"].includes(value)) {
    return "ADVANCED";
  }

  return "INTERMEDIATE";
}

export function getCategoryName(categoryId: string): string {
  return CATEGORY_NAMES[categoryId] ?? CATEGORY_NAMES.GENERAL;
}

export function getCategoryIcon(categoryId: string): string {
  return CATEGORY_ICONS[categoryId] ?? CATEGORY_ICONS.GENERAL;
}

export async function getSubjectLessonCounts(subjectIds: string[]): Promise<Record<string, number>> {
  const uniqueIds = Array.from(new Set(subjectIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return {};
  }

  const topicCounts = await prisma.topic.findMany({
    where: {
      subjectId: {
        in: uniqueIds,
      },
    },
    select: {
      subjectId: true,
      _count: {
        select: {
          subTopics: true,
        },
      },
    },
  });

  return topicCounts.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.subjectId] = (accumulator[row.subjectId] ?? 0) + row._count.subTopics;
    return accumulator;
  }, {});
}

export async function getSubjectProgressMap(
  userId: string,
  subjectIds: string[]
): Promise<Record<string, SubjectProgressSummary>> {
  const uniqueIds = Array.from(new Set(subjectIds.filter(Boolean)));
  if (!userId || uniqueIds.length === 0) {
    return {};
  }

  const lessons = await prisma.subTopic.findMany({
    where: {
      topic: {
        subjectId: {
          in: uniqueIds,
        },
      },
    },
    select: {
      id: true,
      topic: {
        select: {
          subjectId: true,
        },
      },
    },
  });

  if (lessons.length === 0) {
    return uniqueIds.reduce<Record<string, SubjectProgressSummary>>((accumulator, subjectId) => {
      accumulator[subjectId] = {
        totalLessons: 0,
        completedLessons: 0,
        percentage: 0,
      };
      return accumulator;
    }, {});
  }

  const lessonToSubjectMap = new Map<string, string>();
  const lessonsPerSubject = new Map<string, number>();

  for (const lesson of lessons) {
    const subjectId = lesson.topic.subjectId;
    lessonToSubjectMap.set(lesson.id, subjectId);
    lessonsPerSubject.set(subjectId, (lessonsPerSubject.get(subjectId) ?? 0) + 1);
  }

  const completedProgress = await prisma.topicProgress.findMany({
    where: {
      userId,
      completed: true,
      subTopicId: {
        in: lessons.map((lesson) => lesson.id),
      },
    },
    select: {
      subTopicId: true,
    },
  });

  const completedPerSubject = new Map<string, number>();

  for (const progressRow of completedProgress) {
    const subjectId = lessonToSubjectMap.get(progressRow.subTopicId);
    if (!subjectId) {
      continue;
    }

    completedPerSubject.set(subjectId, (completedPerSubject.get(subjectId) ?? 0) + 1);
  }

  return uniqueIds.reduce<Record<string, SubjectProgressSummary>>((accumulator, subjectId) => {
    const totalLessons = lessonsPerSubject.get(subjectId) ?? 0;
    const completedLessons = completedPerSubject.get(subjectId) ?? 0;
    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    accumulator[subjectId] = {
      totalLessons,
      completedLessons,
      percentage,
    };

    return accumulator;
  }, {});
}

function estimateDurationHours(lessonsCount: number): number {
  if (lessonsCount <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil((lessonsCount * 35) / 60));
}

function buildTags(subject: SubjectWithStats, categoryName: string): string[] {
  const tags = new Set<string>();
  tags.add(categoryName);

  if (subject.code) {
    tags.add(subject.code.toUpperCase());
  }

  if (subject.nameAr) {
    tags.add(subject.nameAr);
  }

  tags.add(subject.name);

  return Array.from(tags).slice(0, 5);
}

function resolveRating(subject: SubjectWithStats): number {
  const teachers = toSafeArray(subject.teachers);

  if (teachers.length === 0) {
    return 4.0;
  }

  const ratingTotal = teachers.reduce((total, teacher) => {
    const current = Number.isFinite(teacher.rating) ? teacher.rating : 0;
    return total + current;
  }, 0);

  const average = ratingTotal / teachers.length;
  if (average <= 0) {
    return 4.0;
  }

  return Number(clamp(average, 0, 5).toFixed(1));
}

function resolveInstructor(subject: SubjectWithStats): string {
  if (subject.teachers.length > 0) {
    return subject.teachers[0].name;
  }

  return "فريق ثانوي";
}

export function mapSubjectToCourse(
  subject: SubjectWithStats,
  options?: {
    lessonsCount?: number;
    enrolled?: boolean;
    progress?: number;
  }
): CourseSummary {
  const categoryId = resolveCourseCategory(subject);
  const categoryName = getCategoryName(categoryId);
  const lessonsCount = options?.lessonsCount ?? 0;

  return {
    id: subject.id,
    title: subject.nameAr || subject.name,
    description: subject.description || "لا يوجد وصف متاح لهذه الدورة حالياً.",
    instructor: resolveInstructor(subject),
    subject: categoryName,
    categoryId,
    categoryName,
    level: resolveCourseLevel(subject.type),
    duration: estimateDurationHours(lessonsCount),
    thumbnailUrl: undefined,
    price: 0,
    rating: resolveRating(subject),
    enrolledCount: subject._count.enrollments,
    createdAt: subject.createdAt.toISOString(),
    tags: buildTags(subject, categoryName),
    enrolled: options?.enrolled ?? false,
    progress: options?.enrolled ? options?.progress ?? 0 : undefined,
    lessonsCount,
  };
}

export function buildCategoriesFromCourses(courses: CourseSummary[]): CourseCategory[] {
  const counter = new Map<string, number>();

  for (const course of courses) {
    counter.set(course.categoryId, (counter.get(course.categoryId) ?? 0) + 1);
  }

  return Array.from(counter.entries())
    .map(([id, count]) => ({
      id,
      name: getCategoryName(id),
      icon: getCategoryIcon(id),
      count,
    }))
    .sort((left, right) => right.count - left.count);
}

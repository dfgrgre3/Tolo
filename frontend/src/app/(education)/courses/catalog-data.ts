/**
 * تجميع بيانات كتالوج الدورات — خالص (لا React) ليعمل على الخادم
 * (في صفحة /courses كـ Server Component) وفي المتصفح (خطة بديلة عند فشل التجمع).
 */
import { apiClient } from "@/lib/api/api-client";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { CourseLevel, CourseSummary, CourseCategory } from "./_components/types";

export interface RawCategory {
  id: string;
  name: string;
  nameAr?: string;
}

export interface CatalogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CatalogCoursesResponse {
  items: Array<Record<string, unknown>>;
  pagination: CatalogPagination;
}

const catalogRecordSchema = z.record(z.unknown());
const catalogCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  nameAr: z.string().optional(),
});

function parseCatalogRecords(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = catalogRecordSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function readCatalogPayload(payload: unknown): {
  courses: Array<Record<string, unknown>>;
  categories: RawCategory[];
} {
  if (Array.isArray(payload)) {
    return { courses: [], categories: payload.flatMap((item) => {
      const parsed = catalogCategorySchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }) };
  }
  const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  if (Array.isArray(root.data)) {
    return { courses: [], categories: root.data.flatMap((item) => {
      const parsed = catalogCategorySchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }) };
  }
  const data = root.data && typeof root.data === "object" ? root.data as Record<string, unknown> : root;
  const coursesValue = data.items ?? data.courses ?? data.subjects;
  const categoriesValue = data.categories ?? (Array.isArray(data.data) ? data.data : undefined);
  return {
    courses: parseCatalogRecords(coursesValue),
    categories: Array.isArray(categoriesValue) ? categoriesValue.flatMap((item) => {
      const parsed = catalogCategorySchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }) : [],
  };
}

/** يحوّل استجابة الخادم الخام إلى الأشكال التي تستخدمها الواجهة. */
export function mapCoursesPayload(
  coursesData: Array<Record<string, unknown>>,
  categoriesData: RawCategory[]
): { courses: CourseSummary[]; categories: CourseCategory[] } {
  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    categoryMap.set(cat.id, cat.nameAr || cat.name || "");
  }

  const courses: CourseSummary[] = coursesData.map((course) => {
    const counts = course._count && typeof course._count === "object" ? course._count as Record<string, unknown> : {};
    const nestedLessonCount: number = Array.isArray(course.topics)
      ? (course.topics as unknown[]).reduce<number>((total, topic) => {
          if (!topic || typeof topic !== "object") return total;
          const topicRecord = topic as Record<string, unknown>;
          const lessons = topicRecord.subTopics ?? topicRecord.lessons;
          return total + (Array.isArray(lessons) ? lessons.length : 0);
        }, 0)
      : 0;
    const lessonsCount: number = typeof counts.lessons === "number"
      ? counts.lessons
      : typeof counts.subTopics === "number"
        ? counts.subTopics
        : nestedLessonCount;

    return {
      id: String(course.id || ""),
      title: String(course.name || course.nameAr || ""),
      description: String(course.description || ""),
      instructor: String(course.instructorName || ""),
      subject: String(course.nameAr || course.name || ""),
      categoryId: String(course.categoryId || ""),
      categoryName: categoryMap.get(String(course.categoryId || "")) || "",
      level: (course.level as CourseLevel) || "BEGINNER",
      duration: Number(course.durationHours || 0),
      thumbnailUrl: typeof course.thumbnailUrl === "string" ? course.thumbnailUrl : undefined,
      price: Number(course.price || 0),
      rating: Number(course.rating || 0),
      enrolledCount: Number(course.enrolledCount || counts.enrollments || 0),
      createdAt: String(course.createdAt || ""),
      tags: Array.isArray(course.tags) ? course.tags as string[] : [],
      enrolled: Boolean(course.enrolled ?? course.isEnrolled),
      progress: typeof course.progress === "number" ? course.progress : undefined,
      isFeatured: Boolean(course.isFeatured),
      lessonsCount,
    };
  });

  const categories: CourseCategory[] = categoriesData.map((cat) => ({
    id: cat.id,
    name: cat.nameAr || cat.name || "",
  }));

  return { courses, categories };
}

/**
 * تجلب الكورسات والتصنيفات من الـ API وتحوّلها دفعة واحدة.
 * مصمّمة للتنفيذ على الخادم أثناء الـ SSR — أي فشل هنا يُرجع
 * قوائم فارغة وتتكفل صفحة المتصفح بالجلب البديل.
 */
export interface CatalogLoadResult {
  courses: CourseSummary[];
  categories: CourseCategory[];
  status: "ok" | "error";
  errorMessage?: string;
}

export async function fetchCoursesCatalog(): Promise<CatalogLoadResult> {
  const [coursesResult, categoriesResult] = await Promise.allSettled([
    apiClient.get<unknown>("/courses?limit=48"),
    apiClient.get<unknown>("/categories"),
  ]);

  let coursesData: Array<Record<string, unknown>> = [];
  if (coursesResult.status === "fulfilled") {
    coursesData = readCatalogPayload(coursesResult.value).courses;
  } else {
    logger.error("SSR: failed to load courses", coursesResult.reason);
  }

  let categoriesData: RawCategory[] = [];
  if (categoriesResult.status === "fulfilled") {
    categoriesData = readCatalogPayload(categoriesResult.value).categories;
  } else {
    logger.error("SSR: failed to load categories", categoriesResult.reason);
  }

  const mapped = mapCoursesPayload(coursesData, categoriesData);
  const failed = coursesResult.status === "rejected" || categoriesResult.status === "rejected";
  return { ...mapped, status: failed ? "error" : "ok", errorMessage: failed ? "تعذر تحميل الكتالوج مؤقتًا." : undefined };
}

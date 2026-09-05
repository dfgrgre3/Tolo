/**
 * تجميع بيانات كتالوج الدورات — خالص (لا React) ليعمل على الخادم
 * (في صفحة /courses كـ Server Component) وفي المتصفح (خطة بديلة عند فشل التجمع).
 */
import { apiClient } from "@/lib/api/api-client";
import { logger } from "@/lib/logger";
import type { CourseLevel, CourseSummary, CourseCategory } from "./_components/types";

interface RawCategory {
  id: string;
  name: string;
  nameAr?: string;
}

/** يحوّل استجابة الخادم الخام إلى الأشكال التي تستخدمها الواجهة. */
export function mapCoursesPayload(
  coursesData: unknown[],
  categoriesData: RawCategory[]
): { courses: CourseSummary[]; categories: CourseCategory[] } {
  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    categoryMap.set(cat.id, cat.nameAr || cat.name || "");
  }

  const courses: CourseSummary[] = coursesData.map((course: any) => ({
    id: course.id || "",
    title: course.name || course.nameAr || "",
    description: course.description || "",
    instructor: course.instructorName || "",
    subject: course.nameAr || course.name || "",
    categoryId: course.categoryId || "",
    categoryName: categoryMap.get(course.categoryId) || "",
    level: (course.level as CourseLevel) || "BEGINNER",
    duration: course.durationHours || 0,
    thumbnailUrl: course.thumbnailUrl,
    price: course.price || 0,
    rating: course.rating || 0,
    enrolledCount: course.enrolledCount || course._count?.enrollments || 0,
    createdAt: course.createdAt || "",
    tags: course.tags || [],
    enrolled: false,
    progress: undefined,
    isFeatured: course.isFeatured || false,
    lessonsCount: course._count?.topics || course.topics?.length || 0,
  }));

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
export async function fetchCoursesCatalog(): Promise<{
  courses: CourseSummary[];
  categories: CourseCategory[];
}> {
  const [coursesResult, categoriesResult] = await Promise.allSettled([
    apiClient.get<any>("/courses?limit=48"),
    apiClient.get<any>("/categories"),
  ]);

  let coursesData: unknown[] = [];
  if (coursesResult.status === "fulfilled") {
    const payload = coursesResult.value;
    const data = payload?.data ?? payload;
    coursesData = data?.courses ?? data?.items ?? data?.subjects ?? [];
  } else {
    logger.error("SSR: failed to load courses", coursesResult.reason);
  }

  let categoriesData: RawCategory[] = [];
  if (categoriesResult.status === "fulfilled") {
    const payload = categoriesResult.value;
    const data = payload?.data ?? payload;
    if (Array.isArray(data)) {
      categoriesData = data;
    } else if (Array.isArray(data?.categories)) {
      categoriesData = data.categories;
    }
  } else {
    logger.error("SSR: failed to load categories", categoriesResult.reason);
  }

  return mapCoursesPayload(coursesData, categoriesData);
}

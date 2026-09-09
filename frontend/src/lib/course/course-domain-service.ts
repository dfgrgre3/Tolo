import { cache } from "react";
import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import type { CourseDetailHydrationResponse } from "@/types/domain/mappers";

/**
 * Request-scoped course boundary for server components. Metadata and the page
 * now share the same hydration loader/cache instead of issuing independent
 * requests for the same course.
 */
export const getCourseDetailHydration = cache(async (courseId: string) =>
  apiClient.get<CourseDetailHydrationResponse>(apiRoutes.courses.detail(courseId))
);

/**
 * Enrollment API Gateway
 *
 * المالك الوحيد لاستدعاءات تسجيل/إلغاء التسجيل في الكورسات.
 * يستخدم apiClient كـ transport خالص ولا يحمل منطق UI.
 */

import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import type {
  EnrollmentStatusResponse,
  EnrollmentEligibility,
  EnrollResponse,
  UnenrollResponse,
  MyCourse,
} from "../domain/types";

// ─── حالة التسجيل ─────────────────────────────────────────────────

export async function fetchEnrollmentStatus(
  courseId: string,
): Promise<EnrollmentStatusResponse> {
  return apiClient.get<EnrollmentStatusResponse>(
    apiRoutes.courses.enrollmentStatus(courseId),
  );
}

// ─── شروط الأهلية ─────────────────────────────────────────────────

export async function fetchEnrollmentEligibility(
  courseId: string,
): Promise<EnrollmentEligibility> {
  return apiClient.get<EnrollmentEligibility>(
    apiRoutes.courses.eligibility(courseId),
  );
}

// ─── التسجيل ──────────────────────────────────────────────────────

export async function enrollInCourse(courseId: string): Promise<EnrollResponse> {
  return apiClient.post<EnrollResponse>(apiRoutes.courses.enroll(courseId), {});
}

// ─── إلغاء التسجيل ────────────────────────────────────────────────

export async function unenrollFromCourse(
  courseId: string,
): Promise<UnenrollResponse> {
  return apiClient.delete<UnenrollResponse>(apiRoutes.courses.unenroll(courseId));
}

// ─── كورسات المستخدم ──────────────────────────────────────────────

export async function fetchMyCourses(): Promise<MyCourse[]> {
  const data = await apiClient.get<MyCourse[] | { courses: MyCourse[] }>(
    apiRoutes.subjects.myCourses,
  );
  return Array.isArray(data) ? data : data.courses ?? [];
}

import { cache } from "react";
import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";

// ──────────────────────────────────────────────
// Teacher public profile domain (backend:
// GET /api/v1/teachers/:id/{profile,courses,reviews,related})
// ──────────────────────────────────────────────

export interface TeacherPublicStats {
  coursesCount: number;
  studentsCount: number;
  lessonsCount: number;
  reviewsCount: number;
  ratingAvg: number;
}

export interface TeacherPublicProfile {
  id: string;
  name: string;
  avatar?: string | null;
  headline: string;
  bio?: string | null;
  subjects: string[];
  classes: string[];
  specialties: string[];
  languages: string[];
  experienceYears?: string | null;
  verified: boolean;
  country?: string | null;
  memberSince: string;
  stats: TeacherPublicStats;
}

export type TeacherCourseState =
  | "AVAILABLE"
  | "FREE"
  | "COMING_SOON"
  | "SOLD_OUT"
  | "UNAVAILABLE"
  | "ENROLLED";

export interface TeacherPublicCourse {
  id: string;
  name: string;
  nameAr?: string | null;
  slug?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  price: number;
  level?: string | null;
  rating?: number | null;
  enrolledCount: number;
  durationHours?: number | null;
  isFeatured?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  hasCertificate?: boolean;
  /** Server-authoritative state — render actions from this, never guess. */
  state: TeacherCourseState;
  isEnrolled: boolean;
  progress?: number;
}

export interface TeacherPublicReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  courseId: string;
  courseName?: string | null;
  reviewerName: string;
  reviewerAvatar?: string | null;
  /** Computed server-side from real enrollment rows. */
  isVerifiedEnrollment: boolean;
}

export interface TeacherReviewsSummary {
  average: number;
  total: number;
  distribution: Record<string, number>;
}

export interface PaginationView {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RelatedTeacher {
  id: string;
  name: string;
  avatar?: string | null;
  headline: string;
  subjects: string[];
  verified: boolean;
}

/**
 * Request-scoped teacher-profile loader for server components.
 * Metadata + page share one cached request per teacher.
 *
 * The backend serializes empty arrays as `null` (Go slices), so normalize
 * list fields to `[]` here — the single choke point — instead of guarding
 * every `.map()` call site.
 */
export const getTeacherPublicProfile = cache(async (teacherId: string) => {
  const profile = await apiClient.get<TeacherPublicProfile>(
    apiRoutes.teachers.profile(teacherId)
  );
  profile.subjects = profile.subjects ?? [];
  profile.classes = profile.classes ?? [];
  profile.specialties = profile.specialties ?? [];
  profile.languages = profile.languages ?? [];
  return profile;
});

export function getTeacherPublicCourses(
  teacherId: string,
  opts: { page?: number; limit?: number; featured?: boolean } = {}
) {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.featured) params.set("featured", "true");
  const qs = params.toString();
  return apiClient.get<{ items: TeacherPublicCourse[]; pagination: PaginationView }>(
    `${apiRoutes.teachers.courses(teacherId)}${qs ? `?${qs}` : ""}`
  );
}

export function getTeacherPublicReviews(
  teacherId: string,
  opts: { page?: number; limit?: number } = {}
) {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return apiClient.get<{
    items: TeacherPublicReview[];
    summary: TeacherReviewsSummary;
    pagination: PaginationView;
  }>(`${apiRoutes.teachers.reviews(teacherId)}${qs ? `?${qs}` : ""}`);
}

export function getRelatedTeachers(teacherId: string, limit = 6) {
  return apiClient.get<RelatedTeacher[]>(
    `${apiRoutes.teachers.related(teacherId)}?limit=${limit}`
  );
}

/**
 * Enrollment Feature — Public API
 *
 * الواجهة العامة لنطاق التسجيل.
 * استورد دائماً من هنا بدلاً من المسارات الداخلية.
 */

// Domain types
export type {
  EnrollmentStatus,
  EnrollmentStatusResponse,
  EnrollmentEligibility,
  EnrollRequest,
  EnrollResponse,
  UnenrollResponse,
  MyCourse,
} from "./domain/types";

// API gateway
export {
  fetchEnrollmentStatus,
  fetchEnrollmentEligibility,
  enrollInCourse,
  unenrollFromCourse,
  fetchMyCourses,
} from "./api/enrollment-gateway";

// Hooks
export {
  enrollmentKeys,
  useEnrollmentStatus,
  useEnrollmentEligibility,
  useMyCourses,
  useEnrollMutation,
  useUnenrollMutation,
} from "./hooks/use-enrollment";

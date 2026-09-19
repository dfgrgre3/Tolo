/**
 * Courses Typed Contract Service (P0-12)
 *
 * Public course operations backed directly by @thanawy/contracts OpenAPI client.
 */

export {
  contractListCourses,
  contractGetCourse,
  type ContractCourseListResponse,
  type ContractCourseDetailResponse,
} from "@/services/api/contracts-courses-service";

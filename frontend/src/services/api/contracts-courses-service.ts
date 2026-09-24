/** Typed public course operations backed by the generated OpenAPI paths. */
import { client, type components } from '@/lib/api/generated-client';

// swag names each schema after the Go import path used at its reference
// site; the application DTO package is imported unaliased by the handlers
// currently referencing these types, hence the full-path prefix.
export type ContractCourseListResponse =
  components['schemas']['thanawy-backend_internal_application_dto.CourseListResponse'];
export type ContractCourseDetailResponse =
  components['schemas']['thanawy-backend_internal_application_dto.CourseDetailResponse'];

export function contractListCourses(params?: {
  page?: number;
  limit?: number;
  offset?: number;
  search?: string;
  level?: string;
}) {
  return client.GET('/api/v1/courses', { params: { query: params } });
}

export function contractGetCourse(id: string) {
  return client.GET('/api/v1/courses/{id}', { params: { path: { id } } });
}

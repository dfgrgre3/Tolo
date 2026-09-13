/** Typed public course operations backed by the generated OpenAPI paths. */
import { client, type components } from '@/lib/api/generated-client';

export type ContractCourseListResponse =
  components['schemas']['authdto.CourseListResponse'];
export type ContractCourseDetailResponse =
  components['schemas']['authdto.CourseDetailResponse'];

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

/** Typed operation boundary for instructor course management. */
import { client, type components } from '@/lib/api/generated-client';

export type ContractTeachingCoursePayload =
  components['requestBodies']['Request']['content']['application/json'];

export function contractListTeachingCourses() {
  return client.GET('/api/v1/teaching/courses');
}

export function contractCreateTeachingCourse(payload: ContractTeachingCoursePayload) {
  return client.POST('/api/v1/teaching/courses', { body: payload });
}

export function contractUpdateTeachingCourse(id: string, payload: ContractTeachingCoursePayload) {
  return client.PATCH('/api/v1/teaching/courses/{id}', {
    params: { path: { id } },
    body: payload,
  });
}

export function contractDeleteTeachingCourse(id: string) {
  return client.DELETE('/api/v1/teaching/courses/{id}', {
    params: { path: { id } },
  });
}

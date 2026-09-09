import { useQuery } from '@tanstack/react-query';
import { contractGetCourse, contractListCourses } from '@/services/api/contracts-courses-service';
import { unwrapOpenApiPayload } from '@/lib/api/generated-client';
import type { Subject } from '@/types/subject';

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const result = await contractListCourses();
      const payload = unwrapOpenApiPayload<{ items?: Subject[] }>(result.data);
      return payload?.items ?? [];
    },
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const result = await contractGetCourse(id);
      if (result.error) throw result.error;
      const payload = unwrapOpenApiPayload<{ subject?: Subject } | Subject>(result.data);
      return (payload && "subject" in payload ? payload.subject : payload) as Subject;
    },
    enabled: !!id,
  });
}

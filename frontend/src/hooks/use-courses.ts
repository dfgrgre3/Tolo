import { useQuery } from '@tanstack/react-query';
import { contractGetCourse, contractListCourses } from '@/services/api/contracts-courses-service';
import type { Subject } from '@/types/subject';

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const result = await contractListCourses();
      return (result.data?.data?.items ?? []) as unknown as Subject[];
    },
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const result = await contractGetCourse(id);
      if (result.error) throw result.error;
      return (result.data?.data?.subject ?? result.data?.subject) as unknown as Subject;
    },
    enabled: !!id,
  });
}

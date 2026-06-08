import { useQuery } from '@tanstack/react-query';
import { courseRepository } from '@/data-access/repositories/course-repository';

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => courseRepository.getCourses(),
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: () => courseRepository.getCourse(id),
    enabled: !!id,
  });
}

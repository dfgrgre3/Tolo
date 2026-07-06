import { useQuery } from '@tanstack/react-query';
import { subjectRepository } from '@/data-access/repositories/subject-repository';
import type { Subject } from '@/types/subject';
import type { PaginatedResponse } from '@/types/api/responses';

/** Normalize API response — handles both Subject[] and PaginatedResponse<Subject> */
function normalizeCourses(data: PaginatedResponse<Subject> | Subject[]): Subject[] {
  if (Array.isArray(data)) return data;
  return data.data ?? [];
}

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => subjectRepository.getCourses().then(normalizeCourses),
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: () => subjectRepository.getCourse(id),
    enabled: !!id,
  });
}

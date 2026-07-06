import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';
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
    queryFn: () => apiClient.get<PaginatedResponse<Subject> | Subject[]>(apiRoutes.courses.list).then(normalizeCourses),
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: () => apiClient.get<Subject>(apiRoutes.courses.byId(id)),
    enabled: !!id,
  });
}

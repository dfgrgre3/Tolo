import { safeFetch } from '@/lib/safe-client-utils';
import type {
  ApiCategoriesResponse,
  ApiSubjectsResponse,
  BlogPost,
  Category,
  CourseItem,
  HomepageResponse,
  Instructor,
  PlatformStats,
} from './types';

/** Sort keys accepted by the courses tab strip. */
export type CourseSort = 'popular' | 'latest' | 'top_rated';

const SORT_FIELDS: Record<CourseSort, string> = {
  popular: 'enrolledCount',
  latest: 'createdAt',
  top_rated: 'rating',
};

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await safeFetch<ApiCategoriesResponse | Category[]>(
    '/api/categories?limit=12',
    undefined,
    null
  );
  if (error || !data) return [];
  if (Array.isArray(data)) return data;
  return data.data || data.categories || [];
}

export async function fetchCourses(sort: CourseSort): Promise<CourseItem[]> {
  const url = `/api/subjects?isPublished=true&isActive=true&limit=8&sort=${SORT_FIELDS[sort]}&order=desc`;
  const { data, error } = await safeFetch<ApiSubjectsResponse>(url, undefined, null);
  if (error || !data) {
    // Log authentication errors for debugging but return empty array
    if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
      console.log('[Guest API] Subjects endpoint requires authentication, returning empty array');
    }
    return [];
  }
  return data.items || data.courses || data.subjects || data.data || [];
}

export async function fetchInstructors(): Promise<Instructor[]> {
  const { data, error } = await safeFetch<
    { teachers?: Instructor[]; data?: Instructor[] } | Instructor[]
  >('/api/teachers?limit=6', undefined, null);
  if (error || !data) return [];
  if (Array.isArray(data)) return data;
  return data.teachers || data.data || [];
}

export async function fetchBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await safeFetch<
    | { posts?: BlogPost[]; items?: BlogPost[]; data?: { posts?: BlogPost[]; items?: BlogPost[] } | BlogPost[] }
    | BlogPost[]
  >('/api/blog?limit=4&published=true', undefined, null);
  if (error || !data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  return data.posts || data.items || data.data?.posts || data.data?.items || [];
}

/**
 * Reads the platform counters from `/api/homepage`, which aggregates them on
 * the server. Returns null when unavailable so the UI can hide the strip
 * rather than display invented numbers.
 */
export async function fetchStats(): Promise<PlatformStats | null> {
  const { data, error } = await safeFetch<HomepageResponse>('/api/homepage', undefined, null);
  if (error || !data?.stats) return null;

  const { totalCourses, totalStudents, totalTeachers, totalEnrollments } = data.stats;
  return {
    courses: totalCourses,
    students: totalStudents,
    instructors: totalTeachers,
    enrollments: totalEnrollments,
  };
}

/** All home data fetched in a single batch call. */
export interface HomeDataBatch {
  categories: Category[];
  stats: PlatformStats | null;
  instructors: Instructor[];
  blogPosts: BlogPost[];
}

/**
 * Fetches all home page data in parallel requests.
 * Uses individual endpoints since the batch endpoint is not available on the backend.
 */
export async function fetchHomeBatch(): Promise<HomeDataBatch> {
  const [categories, stats, instructors, blogPosts] = await Promise.all([
    fetchCategories(),
    fetchStats(),
    fetchInstructors(),
    fetchBlogPosts()
  ]);
  return { categories, stats, instructors, blogPosts };
}

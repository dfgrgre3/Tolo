import { apiClient } from '@/lib/api/api-client';
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
  try {
    return await apiClient.get<Category[]>('/api/categories?limit=12');
  } catch {
    return [];
  }
}

export async function fetchCourses(sort: CourseSort): Promise<CourseItem[]> {
  // The public catalog is exposed as /courses. /subjects is the authenticated
  // user's enrollment endpoint and returns 401 for visitors.
  const url = `/api/courses?isPublished=true&isActive=true&limit=8&sort=${SORT_FIELDS[sort]}&order=desc`;
  try {
    const data = await apiClient.get<ApiSubjectsResponse>(url);
    return data.items || [];
  } catch {
    return [];
  }
}

export async function fetchInstructors(): Promise<Instructor[]> {
  try {
    return await apiClient.get<Instructor[]>('/api/teachers?limit=6');
  } catch {
    return [];
  }
}

export async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    const data = await apiClient.get<{ posts: BlogPost[] }>('/api/blog?limit=4&published=true');
    return data.posts;
  } catch {
    return [];
  }
}

/**
 * Reads the platform counters from `/api/homepage`, which aggregates them on
 * the server. Returns null when unavailable so the UI can hide the strip
 * rather than display invented numbers.
 */
export async function fetchStats(): Promise<PlatformStats | null> {
  try {
    const data = await apiClient.get<HomepageResponse>('/api/homepage');
    if (!data.stats) return null;
    const { totalCourses, totalStudents, totalTeachers, totalEnrollments } = data.stats;
    return { courses: totalCourses, students: totalStudents, instructors: totalTeachers, enrollments: totalEnrollments };
  } catch {
    return null;
  }
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

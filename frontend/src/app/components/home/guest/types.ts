export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  coursesCount?: number;
}

export interface CourseItem {
  id: string;
  name?: string;
  nameAr?: string;
  title?: string;
  slug: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  price?: number;
  rating?: number;
  enrolledCount?: number;
  studentsCount?: number;
  instructorName?: string;
  categoryId?: string;
  level?: string;
  durationHours?: number;
  reviewsCount?: number;
  discountPrice?: number;
}

export interface Instructor {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  profileImage?: string;
  avatar?: string;
  coursesCount?: number;
  studentsCount?: number;
  rating?: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  summary?: string;
  featuredImage?: string;
  featured_image?: string;
  cover?: string;
  createdAt?: string;
  created_at?: string;
  publishedAt?: string;
}

/** Platform counters, all aggregated server-side by `/api/homepage`. */
export interface PlatformStats {
  courses: number;
  students: number;
  instructors: number;
  enrollments: number;
}

/** Shape of the `stats` block returned by `GET /api/homepage`. */
export interface HomepageResponse {
  stats?: {
    totalCourses: number;
    totalStudents: number;
    totalTeachers: number;
    totalEnrollments: number;
  };
}

export interface ApiSubjectsResponse {
  items?: CourseItem[];
  courses?: CourseItem[];
  subjects?: CourseItem[];
  data?: CourseItem[];
}

export interface ApiCategoriesResponse {
  data?: Category[];
  categories?: Category[];
}

/** A course flattened into the shape `CourseCard` expects. */
export interface NormalizedCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  price: number;
  ratingAvg: number | null;
  reviewsCount: number;
  studentsCount: number;
  instructorName?: string;
  level?: string;
  discountPrice?: number;
  categoryName?: string;
}

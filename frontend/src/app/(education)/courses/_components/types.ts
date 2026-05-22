export type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type SortOption =
  | "newest"
  | "popular"
  | "rated"
  | "price-low"
  | "price-high"
  | "duration-short"
  | "duration-long";

export type CourseSummary = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  subject: string;
  categoryId: string;
  categoryName: string;
  level: CourseLevel;
  duration: number;
  thumbnailUrl?: string;
  price: number;
  rating: number;
  enrolledCount: number;
  createdAt: string;
  tags?: string[];
  enrolled: boolean;
  progress?: number;
  isFeatured: boolean;
  lessonsCount: number;
};

export type CourseCategory = {
  id: string;
  name: string;
};

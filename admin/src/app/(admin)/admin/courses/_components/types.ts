export interface Course {
  id: string;
  name: string;
  nameAr: string | null;
  code: string | null;
  description: string | null;
  price: number;
  level: string;
  instructorName: string | null;
  instructorId: string | null;
  categoryId: string | null;
  thumbnailUrl: string | null;
  trailerUrl: string | null;
  isActive: boolean;
  isPublished: boolean;
  isFeatured?: boolean;
  durationHours: number;
  requirements: string | null;
  learningObjectives: string | null;
  slug?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  language?: string | null;
  coursePrerequisites?: string[] | null;
  targetAudience?: string[] | null;
  whatYouLearn?: string[] | null;
  _count: {
    enrollments: number;
    topics: number;
    reviews?: number;
    teachers?: number;
  };
}

export interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  coursesCount: number;
}

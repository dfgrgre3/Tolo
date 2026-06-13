export type MyCourse = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  subject: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  duration: number;
  thumbnailUrl?: string;
  price: number;
  rating: number;
  enrolledCount: number;
  tags: string[];
  enrolled: boolean;
  progress: number;
  lessonsCount: number;
  completedLessons: number;
  totalLessons: number;
  enrolledAt: string;
  lastAccessedAt: string;
  certificate: {
    id: string;
    url: string;
    issuedAt: string;
  } | null;
};

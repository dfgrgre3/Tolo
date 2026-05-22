export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {name: string | null;avatar: string | null;};
};

export type ReviewStats = {
  totalReviews: number;
  avgRating: number;
  distribution: Record<number, number>;
};

export type Course = {
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
  createdAt: string;
  tags?: string[];
  enrolled: boolean;
  progress?: number;
  lessonsCount?: number;
  whatYouLearn?: string[];
  coursePrerequisites?: string[];
  targetAudience?: string[];
  requirements?: string;
  learningObjectives?: string;
};

export type CourseLesson = {
  id: string;
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  type: "VIDEO" | "ARTICLE" | "QUIZ" | "FILE" | "ASSIGNMENT";
  isFree: boolean;
  locked: boolean;
  duration: number;
  order: number;
  completed: boolean;
  progress: number;
};

export const levelConfig = {
  BEGINNER: { label: "مبتدئ", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  INTERMEDIATE: { label: "متوسط", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  ADVANCED: { label: "متقدم", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" }
};

export const container = {
  hidden: { opacity: 0 as const },
  show: { opacity: 1 as const, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};

export const fadeUp = {
  hidden: { opacity: 0 as const, y: 16 },
  show: { opacity: 1 as const, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const } }
};

export function getListItems(
  primary: string[] | undefined,
  secondary: string | undefined,
  fallback: string[]
): string[] {
  if (primary && primary.length > 0) return primary;
  if (secondary) return secondary.split('\n').filter(Boolean);
  return fallback;
}

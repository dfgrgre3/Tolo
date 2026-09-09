export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {name: string | null;avatar: string | null;};
  comments?: ReviewComment[];
};

export type ReviewComment = {
  id: string;
  comment: string;
  createdAt: string;
  user: {id?: string;name: string | null;avatar: string | null;};
};

export type ReviewStats = {
  totalReviews: number;
  avgRating: number;
  distribution: Record<number, number>;
};

export type QuestionAnswer = {
  id: string;
  body: string;
  isInstructorAnswer: boolean;
  createdAt: string;
  user: { name: string | null; avatar: string | null };
};

export type Question = {
  id: string;
  title: string;
  body: string;
  subTopicId?: string | null;
  createdAt: string;
  user: { name: string | null; avatar: string | null };
  answers?: QuestionAnswer[];
};

/**
 * Course detail page view models.
 * Defined ONCE in `@/types/domain/mappers` and projected from the canonical
 * domain model (`@/types/domain/course`). Do not re-declare fields here.
 */
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

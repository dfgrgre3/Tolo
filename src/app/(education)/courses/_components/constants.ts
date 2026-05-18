import type { CourseLevel, SortOption } from "./types";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "الأحدث" },
  { value: "popular", label: "الأكثر طلبًا" },
  { value: "rated", label: "الأعلى تقييمًا" },
  { value: "price-low", label: "السعر من الأقل" },
  { value: "price-high", label: "السعر من الأعلى" },
  { value: "duration-short", label: "المدة الأقصر" },
  { value: "duration-long", label: "المدة الأطول" },
];

export const LEVEL_OPTIONS: { value: "ALL" | CourseLevel; label: string }[] = [
  { value: "ALL", label: "كل المستويات" },
  { value: "BEGINNER", label: "مبتدئ" },
  { value: "INTERMEDIATE", label: "متوسط" },
  { value: "ADVANCED", label: "متقدم" },
];

export const levelMap: Record<CourseLevel, { label: string; className: string }> = {
  BEGINNER: {
    label: "مبتدئ",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  INTERMEDIATE: {
    label: "متوسط",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  ADVANCED: {
    label: "متقدم",
    className: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
};

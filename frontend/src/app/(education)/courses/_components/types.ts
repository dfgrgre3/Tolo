import type { CourseCatalogView } from '@/types/domain/mappers';

/** Catalog view shape is owned by the domain mapper layer. */
export type CourseSummary = CourseCatalogView;

export type CourseLevel = CourseCatalogView['level'];

export type SortOption =
  | 'newest'
  | 'popular'
  | 'rated'
  | 'price-low'
  | 'price-high'
  | 'duration-short'
  | 'duration-long';

export type CourseCategory = {
  id: string;
  name: string;
};

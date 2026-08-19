import type { CourseItem, NormalizedCourse } from './types';

/**
 * Flattens an API course into the shape the card expects.
 * `ratingAvg` stays null when the course has no rating, so the UI can hide the
 * stars instead of showing an invented score.
 */
export function normalizeCourse(c: CourseItem): NormalizedCourse {
  return {
    id: c.id,
    title: c.nameAr || c.name || c.title || 'دورة تدريبية',
    slug: c.slug,
    thumbnail: c.thumbnailUrl || c.thumbnail || '',
    price: c.price ?? 0,
    ratingAvg: c.rating ?? null,
    reviewsCount: c.reviewsCount ?? 0,
    studentsCount: c.enrolledCount || c.studentsCount || 0,
    instructorName: c.instructorName,
    level: c.level,
    discountPrice: c.discountPrice,
    categoryName: c.categoryId,
  };
}

/** Picks a representative emoji for a category from its Arabic or English name. */
export function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('برمج') || lower.includes('progr')) return '💻';
  if (lower.includes('تصميم') || lower.includes('design')) return '🎨';
  if (lower.includes('بيانات') || lower.includes('data')) return '📊';
  if (lower.includes('ذكاء') || lower.includes('ai') || lower.includes('machine')) return '🤖';
  if (lower.includes('لغ') || lower.includes('lang') || lower.includes('english') || lower.includes('arabic')) return '🌍';
  if (lower.includes('أعمال') || lower.includes('business')) return '💼';
  if (lower.includes('تسويق') || lower.includes('market')) return '📢';
  if (lower.includes('علم') || lower.includes('science')) return '🔬';
  if (lower.includes('رياضيات') || lower.includes('math')) return '📐';
  return '📚';
}

/** Formats a counter for display, e.g. 4500 → "+4,500". */
export function formatCount(value: number): string {
  return `+${value.toLocaleString('ar-EG')}`;
}

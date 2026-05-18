import type { CourseSummary, SortOption } from "./types";

export function formatPrice(price: number) {
  return price === 0 ? "مجانية" : `${(price || 0).toLocaleString("ar-EG")} ج.م`;
}

export function formatHours(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return "ساعة واحدة";
  }

  if (duration === 1) {
    return "ساعة واحدة";
  }

  return `${(duration || 0).toLocaleString("ar-EG")} ساعة`;
}

export function sortCourses(courses: CourseSummary[], sortBy: SortOption) {
  const sorted = [...courses];

  switch (sortBy) {
    case "popular":
      sorted.sort((left, right) => right.enrolledCount - left.enrolledCount);
      break;
    case "rated":
      sorted.sort((left, right) => right.rating - left.rating);
      break;
    case "price-low":
      sorted.sort((left, right) => left.price - right.price);
      break;
    case "price-high":
      sorted.sort((left, right) => right.price - left.price);
      break;
    case "duration-short":
      sorted.sort((left, right) => left.duration - right.duration);
      break;
    case "duration-long":
      sorted.sort((left, right) => right.duration - left.duration);
      break;
    case "newest":
    default:
      sorted.sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
      break;
  }

  return sorted;
}

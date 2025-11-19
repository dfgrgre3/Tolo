import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date with validation and error handling
 */
export function formatDate(date: Date | string | null | undefined): string {
  // Validate input
  if (!date) {
    return 'تاريخ غير صحيح';
  }

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    
    // Validate date object
    if (isNaN(dateObj.getTime())) {
      return 'تاريخ غير صحيح';
    }

    return dateObj.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return 'تاريخ غير صحيح';
  }
}

/**
 * Format date and time with validation and error handling
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  // Validate input
  if (!date) {
    return 'تاريخ غير صحيح';
  }

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    
    // Validate date object
    if (isNaN(dateObj.getTime())) {
      return 'تاريخ غير صحيح';
    }

    return dateObj.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return 'تاريخ غير صحيح';
  }
}

/**
 * Format relative time with validation and error handling
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  // Validate input
  if (!date) {
    return 'تاريخ غير صحيح';
  }

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    
    // Validate date object
    if (isNaN(dateObj.getTime())) {
      return 'تاريخ غير صحيح';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    // Handle future dates
    if (diffInSeconds < 0) {
      const futureDiffInSeconds = Math.abs(diffInSeconds);
      if (futureDiffInSeconds < 60) {
        return "قريباً";
      }
      const futureDiffInMinutes = Math.floor(futureDiffInSeconds / 60);
      if (futureDiffInMinutes < 60) {
        return `خلال ${futureDiffInMinutes} دقيقة`;
      }
      return "في المستقبل";
    }
    
    if (diffInSeconds < 60) {
      return "الآن";
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `منذ ${diffInMinutes} دقيقة`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `منذ ${diffInHours} ساعة`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `منذ ${diffInDays} يوم`;
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `منذ ${diffInWeeks} أسبوع`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `منذ ${diffInMonths} شهر`;
    }
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `منذ ${diffInYears} سنة`;
  } catch (error) {
    return 'تاريخ غير صحيح';
  }
}

/**
 * Truncate text with validation
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  // Validate input
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Validate maxLength
  if (typeof maxLength !== 'number' || maxLength < 0) {
    return text;
  }

  if (text.length <= maxLength) {
    return text;
  }
  
  // Ensure we don't cut in the middle of a word if possible
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + "...";
  }
  
  return truncated + "...";
}

/**
 * Generate unique ID with validation
 */
export function generateId(): string {
  try {
    const part1 = Math.random().toString(36).substring(2, 15);
    const part2 = Math.random().toString(36).substring(2, 15);
    return part1 + part2;
  } catch (error) {
    // Fallback to timestamp-based ID if Math.random fails
    return `id-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
}

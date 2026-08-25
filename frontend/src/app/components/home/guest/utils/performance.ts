/**
 * Performance Utilities for Homepage
 * تحسينات الأداء والـOptimization
 */

/**
 * Debounce function to limit function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Preload image for better performance
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Prefetch link for faster navigation
 */
export function prefetchLink(href: string): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Measure performance metrics
 */
export class PerformanceMetrics {
  private static marks: Map<string, number> = new Map();

  static mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  static measure(name: string, markName: string): number {
    const startTime = this.marks.get(markName);
    if (!startTime) {
      console.warn(`Mark "${markName}" not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }
    return duration;
  }

  static clearMarks(): void {
    this.marks.clear();
  }
}

/**
 * Request animation frame wrapper for smooth animations
 */
export function requestAnimationFramePromise(): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}

/**
 * Get viewport dimensions
 */
export function getViewportDimensions(): {
  width: number;
  height: number;
} {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  return {
    width: Math.max(
      document.documentElement.clientWidth,
      window.innerWidth || 0
    ),
    height: Math.max(
      document.documentElement.clientHeight,
      window.innerHeight || 0
    ),
  };
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Optimize image for different screen sizes
 */
export function getOptimizedImageSize(width: number): number {
  if (width <= 360) return 360;
  if (width <= 640) return 640;
  if (width <= 1024) return 1024;
  if (width <= 1440) return 1440;
  return 1920;
}

/**
 * Cache data with TTL
 */
export class Cache<T> {
  private data: Map<string, { value: T; timestamp: number }> = new Map();
  private ttl: number;

  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.ttl = ttlMs;
  }

  set(key: string, value: T): void {
    this.data.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  get(key: string): T | null {
    const item = this.data.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.data.delete(key);
      return null;
    }

    return item.value;
  }

  clear(): void {
    this.data.clear();
  }
}

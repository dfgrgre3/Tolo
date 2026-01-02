/**
 * Performance optimization utilities for authentication
 * Provides memoization, debouncing, and throttling helpers
 */

import React, { useCallback, useMemo, useRef } from 'react';

/**
 * Debounce function for delaying execution
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for limiting execution frequency
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * React hook for debounced callback
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

/**
 * React hook for throttled callback
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Memoize expensive computations
 */
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps);
}

/**
 * Create a stable reference that doesn't change between renders
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: Parameters<T>) => {
      return callbackRef.current(...args);
    }) as T,
    []
  );
}

/**
 * Batch state updates to reduce re-renders
 */
export function useBatchedUpdates() {
  const updatesRef = useRef<Array<() => void>>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const batchUpdate = useCallback((update: () => void) => {
    updatesRef.current.push(update);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const updates = updatesRef.current;
      updatesRef.current = [];
      updates.forEach((updateFn) => updateFn());
    }, 0);
  }, []);

  return { batchUpdate };
}

/**
 * Lazy load component
 */
export function lazyLoad<T extends React.ComponentType<unknown>>(
  importFunc: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(importFunc);
}


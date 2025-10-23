import { useState, useCallback, useRef, useEffect } from 'react';
import { useClientEffect, useClientEffectSafe } from './use-client-effect';

interface ProgressiveLoadingOptions {
  priority?: boolean;
  lazyLoad?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number) => void;
}

interface ProgressiveLoadingState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isHydrated: boolean;
  attemptCount: number;
}

/**
 * Enhanced hook for progressive loading with client-server compatibility
 * Provides better SSR support and hydration-safe loading
 */
export function useProgressiveLoading<T>(
  loadFunction: () => Promise<T>,
  options: ProgressiveLoadingOptions = {}
) {
  const {
    priority = false,
    lazyLoad = true,
    retryAttempts = 3,
    retryDelay = 1000,
    timeout = 10000,
    onLoadStart,
    onLoadComplete,
    onError,
    onRetry
  } = options;

  const [state, setState] = useState<ProgressiveLoadingState<T>>({
    data: null,
    isLoading: false,
    error: null,
    isHydrated: false,
    attemptCount: 0
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();
  const hasLoadedRef = useRef(false);

  // Mark as hydrated on client with better error handling
  useEffect(() => {
    setState(prev => ({ ...prev, isHydrated: true }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  const executeLoad = useCallback(async (attempt: number = 1): Promise<void> => {
    // Create abort controller for this load attempt
    abortControllerRef.current = new AbortController();

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        attemptCount: attempt
      }));

      onLoadStart?.();

      // Set timeout
      timeoutRef.current = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, timeout);

      // Execute load function
      const result = await loadFunction();

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setState(prev => ({
        ...prev,
        data: result,
        isLoading: false,
        error: null
      }));

      onLoadComplete?.();

    } catch (error) {
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const err = error instanceof Error ? error : new Error('Unknown error occurred');

      // Check if we should retry
      if (attempt < retryAttempts && !abortControllerRef.current?.signal.aborted) {
        onRetry?.(attempt);

        retryTimeoutRef.current = setTimeout(() => {
          executeLoad(attempt + 1);
        }, retryDelay * attempt); // Exponential backoff

        return;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err
      }));

      onError?.(err);
    }
  }, [loadFunction, retryAttempts, retryDelay, timeout, onLoadStart, onLoadComplete, onError, onRetry]);

  const load = useCallback(() => {
    if (!state.isLoading && state.attemptCount < retryAttempts) {
      executeLoad(state.attemptCount + 1);
    }
  }, [state.isLoading, state.attemptCount, retryAttempts, executeLoad]);

  const retry = useCallback(() => {
    setState(prev => ({ ...prev, error: null, attemptCount: 0 }));
    load();
  }, [load]);

  // Auto-load for priority or non-lazy loading (client-side only)
  useClientEffect(() => {
    if ((priority || !lazyLoad) && !state.data && !state.isLoading && !state.error) {
      load();
    }
  }, [priority, lazyLoad, state.data, state.isLoading, state.error, load]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    ...state,
    load,
    retry,
    canRetry: state.error !== null && state.attemptCount < retryAttempts
  };
}

/**
 * Hook for progressive component loading with dynamic imports
 */
export function useProgressiveComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: ProgressiveLoadingOptions = {}
) {
  const loadFunction = useCallback(async () => {
    const module = await importFunc();
    return module.default;
  }, [importFunc]);

  return useProgressiveLoading(loadFunction, options);
}

/**
 * Hook for progressive data loading with caching
 */
export function useProgressiveData<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  options: ProgressiveLoadingOptions & {
    cacheTime?: number;
    staleWhileRevalidate?: boolean;
  } = {}
) {
  const { cacheTime = 5 * 60 * 1000, staleWhileRevalidate = true, ...loadingOptions } = options;

  const loadFunction = useCallback(async () => {
    // Check cache first (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`progressive_cache_${key}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const isExpired = Date.now() - timestamp > cacheTime;

          if (!isExpired) {
            return data;
          }

          // If stale-while-revalidate is enabled, return cached data and refresh in background
          if (staleWhileRevalidate) {
            fetchFunction().then(freshData => {
              localStorage.setItem(`progressive_cache_${key}`, JSON.stringify({
                data: freshData,
                timestamp: Date.now()
              }));
            }).catch(() => {
              // Silently fail background refresh
            });

            return data;
          }
        }
      } catch (error) {
        // Ignore cache errors
      }
    }

    // Fetch fresh data
    const data = await fetchFunction();

    // Cache the result (client-side only)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`progressive_cache_${key}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch (error) {
        // Ignore cache write errors
      }
    }

    return data;
  }, [key, fetchFunction, cacheTime, staleWhileRevalidate]);

  return useProgressiveLoading(loadFunction, loadingOptions);
}

/**
 * Hook for progressive image loading
 */
export function useProgressiveImage(
  src: string,
  options: {
    priority?: boolean;
    lazyLoad?: boolean;
    placeholder?: string;
    onLoad?: () => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { priority = false, lazyLoad = true, placeholder, onLoad, onError } = options;

  const [state, setState] = useState({
    currentSrc: placeholder || '',
    isLoading: false,
    error: null as Error | null,
    isHydrated: false
  });

  // Mark as hydrated
  useEffect(() => {
    setState(prev => ({ ...prev, isHydrated: true }));
  }, []);

  const loadImage = useCallback(() => {
    if (!src) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const img = new Image();

    img.onload = () => {
      setState(prev => ({
        ...prev,
        currentSrc: src,
        isLoading: false
      }));
      onLoad?.();
    };

    img.onerror = () => {
      const error = new Error(`Failed to load image: ${src}`);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error
      }));
      onError?.(error);
    };

    img.src = src;
  }, [src, onLoad, onError]);

  // Auto-load for priority or non-lazy loading (client-side only)
  useClientEffect(() => {
    if ((priority || !lazyLoad) && state.isHydrated && !state.currentSrc) {
      loadImage();
    }
  }, [priority, lazyLoad, state.isHydrated, state.currentSrc, loadImage]);

  return {
    ...state,
    load: loadImage,
    src: state.currentSrc
  };
}

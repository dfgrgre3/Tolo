import { useState, useCallback, useRef, useEffect } from 'react';
import { useClientEffect } from './use-client-effect';

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
  // Ensure options is an object to prevent destructuring errors
  const safeOptions = options || {};
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
  } = safeOptions;

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
    // Validate attempt number
    if (attempt < 1 || attempt > retryAttempts + 1) {
      return;
    }

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

      // Set timeout with validation
      const validTimeout = Math.max(1000, Math.min(timeout, 60000)); // Between 1s and 60s
      timeoutRef.current = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, validTimeout);

      // Execute load function with timeout protection
      const loadPromise = loadFunction();
      const timeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => {
          reject(new Error(`Load operation timed out after ${validTimeout}ms`));
        }, validTimeout);
      });

      const result = await Promise.race([loadPromise, timeoutPromise]);

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }

      // Validate result
      if (result === null || result === undefined) {
        throw new Error('Load function returned null or undefined');
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
        timeoutRef.current = undefined;
      }

      const err = error instanceof Error ? error : new Error('Unknown error occurred');

      // Check if we should retry
      const shouldRetry = attempt < retryAttempts && 
                         !abortControllerRef.current?.signal.aborted &&
                         !err.message.includes('aborted');

      if (shouldRetry) {
        onRetry?.(attempt);

        // Calculate retry delay with exponential backoff and jitter
        const baseDelay = retryDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
        const finalDelay = Math.min(baseDelay + jitter, 30000); // Max 30 seconds

        retryTimeoutRef.current = setTimeout(() => {
          executeLoad(attempt + 1);
        }, finalDelay);

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
    // Validate state before loading
    if (state.isLoading) {
      return; // Already loading
    }

    if (state.attemptCount >= retryAttempts) {
      return; // Max attempts reached
    }

    // Validate loadFunction
    if (typeof loadFunction !== 'function') {
      const error = new Error('Load function is not a function');
      setState(prev => ({
        ...prev,
        error,
        isLoading: false
      }));
      onError?.(error);
      return;
    }

    executeLoad(state.attemptCount + 1);
  }, [state.isLoading, state.attemptCount, retryAttempts, executeLoad, loadFunction, onError]);

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
  // Ensure options is an object to prevent destructuring errors
  const safeOptions = options || {};
  const { cacheTime = 5 * 60 * 1000, staleWhileRevalidate = true, ...loadingOptions } = safeOptions;

  const loadFunction = useCallback(async () => {
    const { safeGetItem, safeSetItem, isBrowser } = require('@/lib/safe-client-utils');
    
    // Check cache first (client-side only)
    if (isBrowser()) {
      try {
        const cached = safeGetItem(`progressive_cache_${key}`, { fallback: null });
        if (cached) {
          const cacheData = typeof cached === 'string' ? JSON.parse(cached) : cached;
          const { data, timestamp } = cacheData;
          const isExpired = Date.now() - timestamp > cacheTime;

          if (!isExpired) {
            return data;
          }

          // If stale-while-revalidate is enabled, return cached data and refresh in background
          if (staleWhileRevalidate) {
            fetchFunction().then(freshData => {
              safeSetItem(`progressive_cache_${key}`, {
                data: freshData,
                timestamp: Date.now()
              });
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
    if (isBrowser()) {
      try {
        safeSetItem(`progressive_cache_${key}`, {
          data,
          timestamp: Date.now()
        });
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
  // Ensure options is an object to prevent destructuring errors
  const safeOptions = options || {};
  const { priority = false, lazyLoad = true, placeholder, onLoad, onError } = safeOptions;

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
    // Validate src
    if (!src || typeof src !== 'string' || src.trim().length === 0) {
      const error = new Error('Invalid image source');
      setState(prev => ({
        ...prev,
        isLoading: false,
        error
      }));
      onError?.(error);
      return;
    }

    // Validate URL format
    try {
      new URL(src);
    } catch {
      // If not a valid URL, it might be a relative path - that's okay
      if (!src.startsWith('/') && !src.startsWith('./') && !src.startsWith('../')) {
        const error = new Error(`Invalid image source format: ${src}`);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error
        }));
        onError?.(error);
        return;
      }
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const img = new Image();
    let loadTimeout: NodeJS.Timeout | undefined;

    // Set timeout for image loading (30 seconds)
    loadTimeout = setTimeout(() => {
      const error = new Error(`Image load timeout: ${src}`);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error
      }));
      onError?.(error);
      img.src = ''; // Cancel loading
    }, 30000);

    img.onload = () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
      setState(prev => ({
        ...prev,
        currentSrc: src,
        isLoading: false
      }));
      onLoad?.();
    };

    img.onerror = () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
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

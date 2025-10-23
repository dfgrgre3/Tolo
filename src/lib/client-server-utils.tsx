/**
 * Client-Server Compatibility Utilities
 *
 * This module provides utilities for handling client-server compatibility issues
 * in Next.js applications, including hydration safety, progressive loading,
 * and error recovery.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useClientEffect } from '@/hooks/use-client-effect';

/**
 * Check if code is running on the client side
 */
export const isClient = (): boolean => typeof window !== 'undefined';

/**
 * Check if code is running on the server side
 */
export const isServer = (): boolean => typeof window === 'undefined';

/**
 * Safe wrapper for accessing window object
 */
export function safeWindow(): Window | null {
  return isClient() ? window : null;
}

/**
 * Safe wrapper for accessing document object
 */
export function safeDocument(): Document | null {
  return isClient() ? document : null;
}

/**
 * Safe wrapper for accessing localStorage
 */
export function safeLocalStorage(): Storage | null {
  return isClient() ? localStorage : null;
}

/**
 * Safe wrapper for accessing sessionStorage
 */
export function safeSessionStorage(): Storage | null {
  return isClient() ? sessionStorage : null;
}

/**
 * Hook for safe access to browser APIs with hydration safety
 */
export function useBrowserAPI<T>(
  apiGetter: () => T,
  defaultValue: T,
  options?: {
    skipHydration?: boolean;
  }
): T {
  const [value, setValue] = useState<T>(defaultValue);
  const [isReady, setIsReady] = useState(false);

  useClientEffect(() => {
    try {
      const apiValue = apiGetter();
      setValue(apiValue);
      setIsReady(true);
    } catch (error) {
      console.warn('Failed to access browser API:', error);
      setIsReady(true);
    }
  }, [], options);

  return isReady ? value : defaultValue;
}

/**
 * Hook for managing hydration-safe state
 */
export function useHydrationSafeState<T>(
  initialValue: T,
  options?: {
    onHydrationMismatch?: (serverValue: T, clientValue: T) => void;
  }
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [state, setState] = useState(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);
  const serverValueRef = useRef(initialValue);

  useEffect(() => {
    setIsHydrated(true);

    // Check for hydration mismatch
    if (options?.onHydrationMismatch && serverValueRef.current !== state) {
      options.onHydrationMismatch(serverValueRef.current, state);
    }
  }, []);

  const setHydrationSafeState: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (value) => {
      if (isHydrated) {
        setState(value);
      } else {
        // Store the server value for comparison
        if (typeof value === 'function') {
          serverValueRef.current = (value as Function)(serverValueRef.current);
        } else {
          serverValueRef.current = value;
        }
        setState(value);
      }
    },
    [isHydrated]
  );

  return [state, setHydrationSafeState, isHydrated];
}

/**
 * Hook for progressive enhancement
 * Allows components to work with reduced functionality on server,
 * then enhance on client
 */
export function useProgressiveEnhancement<T>(
  serverValue: T,
  clientEnhancer: () => T | Promise<T>,
  options?: {
    onError?: (error: Error) => void;
  }
): T {
  const [value, setValue] = useState(serverValue);
  const [isEnhanced, setIsEnhanced] = useState(false);

  useClientEffect(async () => {
    try {
      const enhancedValue = await clientEnhancer();
      setValue(enhancedValue);
      setIsEnhanced(true);
    } catch (error) {
      console.error('Progressive enhancement failed:', error);
      options?.onError?.(error as Error);
    }
  }, []);

  return value;
}

/**
 * Utility for creating hydration-safe event handlers
 */
export function createHydrationSafeHandler<T extends (...args: any[]) => any>(
  handler: T,
  options?: {
    skipServer?: boolean;
  }
): T {
  return ((...args: Parameters<T>) => {
    if (options?.skipServer && isServer()) {
      return;
    }

    if (isClient()) {
      return handler(...args);
    }
  }) as T;
}

/**
 * Hook for managing client-only side effects with cleanup
 */
export function useClientOnlyEffect(
  effect: () => (() => void) | void,
  deps?: React.DependencyArray,
  options?: {
    onError?: (error: Error) => void;
  }
) {
  const cleanupRef = useRef<(() => void) | void>();

  useClientEffect(() => {
    try {
      cleanupRef.current = effect();
    } catch (error) {
      console.error('Client-only effect failed:', error);
      options?.onError?.(error as Error);
    }

    return () => {
      if (cleanupRef.current && typeof cleanupRef.current === 'function') {
        try {
          cleanupRef.current();
        } catch (error) {
          console.error('Client-only effect cleanup failed:', error);
        }
        cleanupRef.current = undefined;
      }
    };
  }, deps);
}

/**
 * Utility for safe dynamic imports with error handling
 */
export async function safeDynamicImport<T>(
  importFn: () => Promise<T>,
  fallback?: T,
  options?: {
    onError?: (error: Error) => void;
    retries?: number;
    retryDelay?: number;
  }
): Promise<T | undefined> {
  const { retries = 3, retryDelay = 1000, onError } = options || {};

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await importFn();
    } catch (error) {
      console.warn(`Dynamic import failed (attempt ${attempt}/${retries}):`, error);

      if (attempt === retries) {
        onError?.(error as Error);
        return fallback;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

  return fallback;
}

/**
 * Hook for safe dynamic imports
 */
export function useSafeDynamicImport<T>(
  importFn: () => Promise<T>,
  options?: {
    fallback?: T;
    onError?: (error: Error) => void;
    retries?: number;
    retryDelay?: number;
  }
) {
  const [module, setModule] = useState<T | undefined>(options?.fallback);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await safeDynamicImport(importFn, options?.fallback, options);
      setModule(result);
    } catch (err) {
      const error = err as Error;
      setError(error);
      options?.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [importFn, options]);

  useClientEffect(() => {
    load();
  }, [load]);

  return { module, isLoading, error, reload: load };
}

/**
 * Utility for detecting hydration mismatches
 */
export function detectHydrationMismatch(
  serverValue: any,
  clientValue: any,
  tolerance?: {
    ignoreFunctions?: boolean;
    ignoreUndefined?: boolean;
  }
): boolean {
  const { ignoreFunctions = true, ignoreUndefined = true } = tolerance || {};

  // Ignore functions if specified
  if (ignoreFunctions && (typeof serverValue === 'function' || typeof clientValue === 'function')) {
    return false;
  }

  // Ignore undefined values if specified
  if (ignoreUndefined && (serverValue === undefined || clientValue === undefined)) {
    return false;
  }

  // Deep comparison for objects
  if (typeof serverValue === 'object' && typeof clientValue === 'object' &&
      serverValue !== null && clientValue !== null) {
    const serverKeys = Object.keys(serverValue);
    const clientKeys = Object.keys(clientValue);

    if (serverKeys.length !== clientKeys.length) {
      return true;
    }

    for (const key of serverKeys) {
      if (!(key in clientValue)) {
        return true;
      }

      if (detectHydrationMismatch(serverValue[key], clientValue[key], tolerance)) {
        return true;
      }
    }

    return false;
  }

  return serverValue !== clientValue;
}

/**
 * Hook for monitoring hydration status
 */
export function useHydrationStatus() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hydrationTime, setHydrationTime] = useState<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();
    setIsHydrated(true);
    setHydrationTime(performance.now() - startTime);
  }, []);

  return { isHydrated, hydrationTime };
}

/**
 * Utility for creating SSR-safe components
 */
export function createSSRSafeComponent<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ComponentType<P>;
    loadingComponent?: React.ComponentType;
  }
) {
  const SSRSafeComponent = (props: P & { ssr?: boolean }) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
    }, []);

    // Force server-side rendering if specified
    if (props.ssr === false && !isClient) {
      const { loadingComponent: Loading } = options || {};
      return Loading ? <Loading /> : null;
    }

    // Use fallback component during SSR
    if (!isClient && options?.fallback) {
      const FallbackComponent = options.fallback;
      return <FallbackComponent {...props} />;
    }

    return <Component {...props} />;
  };

  SSRSafeComponent.displayName = `SSRSafe(${Component.displayName || Component.name})`;
  return SSRSafeComponent;
}

/**
 * Performance monitoring for client-server operations
 */
export const clientServerPerf = {
  mark: (name: string) => {
    if (isClient() && 'performance' in window) {
      performance.mark(`client-server:${name}`);
    }
  },

  measure: (name: string, startMark?: string, endMark?: string) => {
    if (isClient() && 'performance' in window) {
      try {
        performance.measure(`client-server:${name}`, startMark, endMark);
        const measure = performance.getEntriesByName(`client-server:${name}`, 'measure')[0];
        return measure?.duration;
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
    return null;
  },

  clearMarks: (name?: string) => {
    if (isClient() && 'performance' in window) {
      if (name) {
        performance.clearMarks(`client-server:${name}`);
        performance.clearMeasures(`client-server:${name}`);
      } else {
        // Clear all client-server marks and measures
        const entries = performance.getEntries();
        entries.forEach(entry => {
          if (entry.name.startsWith('client-server:')) {
            if (entry.entryType === 'mark') {
              performance.clearMarks(entry.name);
            } else if (entry.entryType === 'measure') {
              performance.clearMeasures(entry.name);
            }
          }
        });
      }
    }
  }
};

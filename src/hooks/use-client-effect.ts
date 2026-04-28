"use client";

import { useEffect, useLayoutEffect, useRef, useState, DependencyList } from 'react';

import { logger } from '@/lib/logger';

// Lazy load logger to prevent server-only bundling issues
let loggerInstance: unknown = null;
async function getLogger() {
  if (!loggerInstance) {
    try {
      const loggerModule = await import('@/lib/logger');
      loggerInstance = loggerModule.logger;
    } catch {
      // Fallback to console if logger fails to load
      loggerInstance = {
        info: (...args: unknown[]) => void 0,
        warn: (...args: unknown[]) => void 0,
        error: (...args: unknown[]) => void 0,
        debug: (...args: unknown[]) => void 0,
      };
    }
  }
  return loggerInstance as {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
  };
}

/**
 * Enhanced custom hook that runs an effect only on the client side.
 * This is useful for code that should not run during server-side rendering.
 * Includes better hydration safety and error handling.
 *
 * @param effect The effect function to run
 * @param deps Dependency array for the effect
 * @param options Configuration options
 */
function useClientEffect(
  effect: () => void | (() => void),
  deps?: DependencyList,
  options?: {
    priority?: 'low' | 'normal' | 'high';
    skipHydration?: boolean;
    errorBoundary?: boolean;
  }
) {
  const hasRunRef = useRef(false);
  const isHydratedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | void | undefined>(undefined);

  // Mark as hydrated on first client-side render
  useEffect(() => {
    isHydratedRef.current = true;
  }, []);

  useEffect(() => {
    // Only run the effect on the client side
    if (typeof window === 'undefined') {
      return;
    }

    // Skip if hydration safety is enabled and not yet hydrated
    if (options?.skipHydration && !isHydratedRef.current) {
      return;
    }

    // Skip if already run and hydration safety is enabled
    if (options?.skipHydration && hasRunRef.current) {
      return;
    }

    try {
      hasRunRef.current = true;
      if (typeof effect === 'function') {
        cleanupRef.current = effect();
      }
    } catch (error) {
      getLogger().then(logger => {
        logger.error('useClientEffect: Error in effect function:', error);
      }).catch(() => {
        logger.error('useClientEffect: Error in effect function:', error);
      });
      if (options?.errorBoundary) {
        // Could integrate with error reporting service here
      }
    }

    // Cleanup function
    return () => {
      if (cleanupRef.current && typeof cleanupRef.current === 'function') {
        try {
          cleanupRef.current();
        } catch (error) {
          getLogger().then(logger => {
            logger.error('useClientEffect: Error in cleanup function:', error);
          }).catch(() => {
            logger.error('useClientEffect: Error in cleanup function:', error);
          });
        }
        cleanupRef.current = undefined;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { isHydrated: isHydratedRef.current, hasRun: hasRunRef.current };
}

/**
 * Enhanced client effect that provides better SSR compatibility
 * Includes hydration-safe state management
 */
function useClientEffectSafe(
  effect: () => void | (() => void),
  deps?: DependencyList,
  options?: {
    skipHydration?: boolean;
    priority?: 'low' | 'normal' | 'high';
  }
) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const hasRunRef = useRef(false);

  // Mark as hydrated on client
  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => setIsHydrated(true), 0);
    return () => window.clearTimeout(hydrateTimer);
  }, []);

  useEffect(() => {
    // Only run the effect on the client side
    if (typeof window === 'undefined') {
      return;
    }

    // Skip if not hydrated and hydration safety is enabled
    if (options?.skipHydration && !isHydrated) {
      return;
    }

    // Skip if already run and hydration safety is enabled
    if (options?.skipHydration && hasRunRef.current) {
      return;
    }

    hasRunRef.current = true;
    const runTimer = window.setTimeout(() => setHasRun(true), 0);
    if (typeof effect === 'function') {
      const cleanup = effect();
      return () => {
        window.clearTimeout(runTimer);
        if (typeof cleanup === 'function') cleanup();
      };
    }
    return () => window.clearTimeout(runTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, ...(deps || [])]);

  return { isHydrated, hasRun };
}

/**
 * Custom hook that runs an effect only on the client side with layout effect priority.
 * This ensures the effect runs before the browser repaints, useful for DOM measurements.
 *
 * @param effect The effect function to run
 * @param deps Dependency array for the effect
 */
function useClientLayoutEffect(effect: () => void | (() => void), deps?: DependencyList) {
  useLayoutEffect(() => {
    // Only run the effect on the client side
    if (typeof window !== 'undefined' && typeof effect === 'function') {
      return effect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook that provides a safe way to access window object and other browser APIs
 * Returns null during SSR and the actual object on client
 */
function useWindow() {
  const [windowObj, setWindowObj] = useState<Window | null>(null);

  useClientEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowObj(window);
    }
  }, []);

  return windowObj;
}

/**
 * Hook that provides a safe way to access localStorage
 * Returns null during SSR and the actual localStorage on client
 */
function useRawLocalStorage() {
  const [storage, setStorage] = useState<Storage | null>(null);

  useClientEffect(() => {
    if (typeof window !== 'undefined') {
      setStorage(localStorage);
    }
  }, []);

  return storage;
}

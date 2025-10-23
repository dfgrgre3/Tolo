import React, { useEffect, useLayoutEffect, useRef, useCallback } from 'react';

/**
 * Enhanced custom hook that runs an effect only on the client side.
 * This is useful for code that should not run during server-side rendering.
 * Includes better hydration safety and error handling.
 *
 * @param effect The effect function to run
 * @param deps Dependency array for the effect
 * @param options Configuration options
 */
export function useClientEffect(
  effect: () => void | (() => void),
  deps?: React.DependencyArray,
  options?: {
    priority?: 'low' | 'normal' | 'high';
    skipHydration?: boolean;
    errorBoundary?: boolean;
  }
) {
  const hasRunRef = useRef(false);
  const isHydratedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | void>();

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
      console.error('useClientEffect: Error in effect function:', error);
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
          console.error('useClientEffect: Error in cleanup function:', error);
        }
        cleanupRef.current = undefined;
      }
    };
  }, deps);

  return { isHydrated: isHydratedRef.current, hasRun: hasRunRef.current };
}

/**
 * Enhanced client effect that provides better SSR compatibility
 * Includes hydration-safe state management
 */
export function useClientEffectSafe(
  effect: () => void | (() => void),
  deps?: React.DependencyArray,
  options?: {
    skipHydration?: boolean;
    priority?: 'low' | 'normal' | 'high';
  }
) {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [hasRun, setHasRun] = React.useState(false);

  // Mark as hydrated on client
  useEffect(() => {
    setIsHydrated(true);
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
    if (options?.skipHydration && hasRun) {
      return;
    }

    setHasRun(true);
    if (typeof effect === 'function') {
      return effect();
    }
  }, [isHydrated, hasRun, ...(deps || [])]);

  return { isHydrated, hasRun };
}

/**
 * Custom hook that runs an effect only on the client side with layout effect priority.
 * This ensures the effect runs before the browser repaints, useful for DOM measurements.
 *
 * @param effect The effect function to run
 * @param deps Dependency array for the effect
 */
export function useClientLayoutEffect(effect: () => void | (() => void), deps?: React.DependencyArray) {
  useLayoutEffect(() => {
    // Only run the effect on the client side
    if (typeof window !== 'undefined' && typeof effect === 'function') {
      return effect();
    }
  }, deps);
}

/**
 * Hook that provides a safe way to access window object and other browser APIs
 * Returns null during SSR and the actual object on client
 */
export function useWindow() {
  const [windowObj, setWindowObj] = React.useState<Window | null>(null);

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
export function useLocalStorage() {
  const [storage, setStorage] = React.useState<Storage | null>(null);

  useClientEffect(() => {
    if (typeof window !== 'undefined') {
      setStorage(localStorage);
    }
  }, []);

  return storage;
}

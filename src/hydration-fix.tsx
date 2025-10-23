"use client";

import React, { useEffect, useState } from 'react';

/**
 * دالة لإصلاح مشاكل الترطيب (hydration) في Next.js
 * تضمن أن المكون يعمل بشكل متسق بين الخادم والعميل
 */
export function useHydrationFix(): boolean {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Use requestIdleCallback for better performance if available
    if ('requestIdleCallback' in window) {
      const idleCallbackId = window.requestIdleCallback(() => {
        setIsHydrated(true);
      }, { timeout: 100 });

      return () => {
        if (idleCallbackId && 'cancelIdleCallback' in window) {
          window.cancelIdleCallback(idleCallbackId);
        }
      };
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      const timeoutId = setTimeout(() => setIsHydrated(true), 1);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  return isHydrated;
}

/**
 * Hook to safely access localStorage with hydration protection
 */
export function useLocalStorage(key: string, initialValue: any = null) {
  const isHydrated = useHydrationFix();
  const [value, setValue] = useState(() => {
    // Initialize with server-safe default value
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setLocalStorageValue = (newValue: any) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(newValue));
      }
      setValue(newValue);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [isHydrated ? value : initialValue, setLocalStorageValue];
}

/**
 * Hook to safely access sessionStorage with hydration protection
 */
export function useSessionStorage(key: string, initialValue: any = null) {
  const isHydrated = useHydrationFix();
  const [value, setValue] = useState(() => {
    // Initialize with server-safe default value
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setSessionStorageValue = (newValue: any) => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, JSON.stringify(newValue));
      }
      setValue(newValue);
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error);
    }
  };

  return [isHydrated ? value : initialValue, setSessionStorageValue];
}

/**
 * Hook to safely use browser-only APIs with hydration protection
 */
export function useBrowserOnlyValue<T>(getValue: () => T, defaultValue: T): T {
  const isHydrated = useHydrationFix();
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    if (isHydrated) {
      try {
        setValue(getValue());
      } catch (error) {
        console.error('Error getting browser-only value:', error);
        setValue(defaultValue);
      }
    }
  }, [isHydrated, getValue, defaultValue]);

  return isHydrated ? value : defaultValue;
}

/**
 * Component wrapper that prevents hydration mismatches by only rendering after hydration
 */
export function HydrationSafeWrapper({
  children,
  fallback = null
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isHydrated = useHydrationFix();

  if (!isHydrated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook to safely use window dimensions with hydration protection
 */
export function useWindowDimensions() {
  return useBrowserOnlyValue(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }), { width: 1024, height: 768 });
}

/**
 * Hook to safely use media queries with hydration protection
 */
export function useMediaQuery(query: string): boolean {
  return useBrowserOnlyValue(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  }, false);
}

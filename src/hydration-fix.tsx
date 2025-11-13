"use client";

import React, { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

/**
 * دالة لإصلاح مشاكل الترطيب (hydration) في Next.js
 * تضمن أن المكون يعمل بشكل متسق بين الخادم والعميل
 */
export function useHydrationFix(): boolean {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Set hydrated immediately on client side
    setIsHydrated(true);

    // Fix hydration issues by removing problematic attributes
    if (typeof window !== "undefined") {
      // Remove bis_skin_checked attributes
      const elements = document.querySelectorAll("[bis_skin_checked]");
      elements.forEach((el) => {
        el.removeAttribute("bis_skin_checked");
      });

      // Remove __processed_* attributes
      const allElements = document.querySelectorAll("*");
      allElements.forEach((el) => {
        Array.from(el.attributes)
          .filter((attr) => attr.name.startsWith("__processed_"))
          .forEach((attr) => el.removeAttribute(attr.name));
      });

      // Remove bis_register attributes
      const registerElements = document.querySelectorAll("[bis_register]");
      registerElements.forEach((el) => {
        el.removeAttribute("bis_register");
      });
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
      logger.error(`Error reading localStorage key "${key}":`, error);
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
      logger.error(`Error setting localStorage key "${key}":`, error);
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
      logger.error(`Error reading sessionStorage key "${key}":`, error);
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
      logger.error(`Error setting sessionStorage key "${key}":`, error);
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
        logger.error('Error getting browser-only value:', error);
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

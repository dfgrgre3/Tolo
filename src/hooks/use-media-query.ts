import { useSyncExternalStore, useCallback } from 'react';

/**
 * Hook للاستجابة لحجم الشاشة (Media Query)
 * 
 * يتيح استخدام media queries في React بشكل سهل
 * 
 * @param {string} query - استعلام الوسائط (media query)
 * @returns {boolean} true إذا كان الاستعلام متطابقاً
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) {
        return () => {};
      }
      const mediaQuery = window.matchMedia(query);
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', callback);
      } else {
        mediaQuery.addListener(callback);
      }
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', callback);
        } else {
          mediaQuery.removeListener(callback);
        }
      };
    },
    [query]
  );

  const getSnapshot = () => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hook للحصول على نوع الجهاز الحالي
 * 
 * @returns {Object} معلومات عن نوع الجهاز
 */
export function useDeviceType() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  return {
    isMobile,
    isTablet,
    isDesktop,
    /** true إذا كان الجهاز محمولاً أو لوحياً */
    isTouchDevice: isMobile || isTablet,
  };
}

/**
 * Hook للحصول على اتجاه الشاشة
 * 
 * @returns {'portrait' | 'landscape'} اتجاه الشاشة
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  return isPortrait ? 'portrait' : 'landscape';
}

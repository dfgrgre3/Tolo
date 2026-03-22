import { useState, useEffect } from 'react';

/**
 * Hook للاستجابة لحجم الشاشة (Media Query)
 * 
 * يتيح استخدام media queries في React بشكل سهل
 * 
 * @param {string} query - استعلام الوسائط (media query)
 * @returns {boolean} true إذا كان الاستعلام متطابقاً
 * 
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const isMobile = useMediaQuery('(max-width: 768px)');
 *   const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
 *   const isDesktop = useMediaQuery('(min-width: 1025px)');
 *   const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
 * 
 *   return (
 *     <div>
 *       {isMobile && <MobileLayout />}
 *       {isTablet && <TabletLayout />}
 *       {isDesktop && <DesktopLayout />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // التحقق من دعم المتصفح
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    
    // تعيين القيمة الأولية
    setMatches(mediaQuery.matches);

    // معالج التغيير
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // الاستماع للتغييرات
    // استخدام addEventListener للمتصفحات الحديثة
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // fallback للمتصفحات القديمة
      mediaQuery.addListener(handler);
    }

    // التنظيف
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Hook للحصول على نوع الجهاز الحالي
 * 
 * @returns {Object} معلومات عن نوع الجهاز
 * 
 * @example
 * ```tsx
 * function Component() {
 *   const { isMobile, isTablet, isDesktop } = useDeviceType();
 * 
 *   return (
 *     <div>
 *       {isMobile && <p>أنت تستخدم هاتفاً محمولاً</p>}
 *       {isTablet && <p>أنت تستخدم جهازاً لوحياً</p>}
 *       {isDesktop && <p>أنت تستخدم حاسوباً مكتبياً</p>}
 *     </div>
 *   );
 * }
 * ```
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
 * 
 * @example
 * ```tsx
 * function Component() {
 *   const orientation = useOrientation();
 * 
 *   return (
 *     <div>
 *       الشاشة في وضع: {orientation === 'portrait' ? 'عمودي' : 'أفقي'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  return isPortrait ? 'portrait' : 'landscape';
}

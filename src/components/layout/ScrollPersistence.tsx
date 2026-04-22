'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ScrollPersistence - يحفظ موضع التمرير لكل صفحة في localStorage
 * ويعيد تطبيقه عند العودة للصفحة.
 */
export function ScrollPersistence() {
  const pathname = usePathname();
  const scrollPositions = useRef<Record<string, number>>({});

  // استعادة موضع التمرير عند تغيير المسار
  useEffect(() => {
    const savedPositions = localStorage.getItem('scroll-positions');
    if (savedPositions) {
      try {
        scrollPositions.current = JSON.parse(savedPositions);
        const savedY = scrollPositions.current[pathname];
        
        if (typeof savedY === 'number') {
          // ننتظر قليلاً للتأكد من تحميل المحتوى (خاصة في Next.js)
          const timer = setTimeout(() => {
            window.scrollTo({
              top: savedY,
              behavior: 'auto'
            });
          }, 100);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.error('Failed to parse scroll positions', e);
      }
    }
  }, [pathname]);

  // حفظ موضع التمرير عند التمرير أو مغادرة الصفحة
  useEffect(() => {
    const handleScroll = () => {
      scrollPositions.current[pathname] = window.scrollY;
    };

    const handleBeforeUnload = () => {
      localStorage.setItem('scroll-positions', JSON.stringify(scrollPositions.current));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // حفظ دوري للتأكد من عدم ضياع البيانات في حال الخروج المفاجئ
    const interval = setInterval(handleBeforeUnload, 2000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);
      handleBeforeUnload(); // حفظ أخير عند تدمير المكون
    };
  }, [pathname]);

  return null;
}

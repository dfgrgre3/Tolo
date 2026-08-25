'use client';

import { useEffect, useRef, useState, RefObject } from 'react';

interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
}

/**
 * Hook للـ Lazy Loading باستخدام Intersection Observer
 * يساعد في تحسين الأداء بتأخير تحميل الأقسام البعيدة
 */
export function useLazyLoad(
  ref: RefObject<HTMLElement>,
  options: UseLazyLoadOptions = {}
): boolean {
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observerOptions: IntersectionObserverInit = {
      threshold: options.threshold ?? 0.1,
      rootMargin: options.rootMargin ?? '50px',
    };

    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry && entry.isIntersecting) {
        setIsVisible(true);
        // Stop observing after first intersection
        if (observerRef.current) {
          observerRef.current.unobserve(element);
        }
      }
    }, observerOptions);

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.unobserve(element);
      }
    };
  }, [ref, options]);

  return isVisible;
}

/**
 * Hook لمراقبة العناصر المرئية في الشاشة
 */
export function useInViewport(
  ref: RefObject<HTMLElement>,
  options: UseLazyLoadOptions = {}
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) {
        setInView(entry.isIntersecting);
      }
    }, {
      threshold: options.threshold ?? 0.25,
      rootMargin: options.rootMargin ?? '0px',
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return inView;
}

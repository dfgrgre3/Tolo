"use client";

import React, { useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { perfConfig } from "@/lib/perf-config";
import { useClientEffect, useClientLayoutEffect } from "@/hooks/use-client-effect";

interface LazyLoadSectionProps {
  children: ReactNode;
  threshold?: number;
  rootMargin?: string;
  fallback?: ReactNode;
  onVisible?: () => void;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  priority?: boolean;
  className?: string;
}

export function LazyLoadSection({
  children,
  threshold = perfConfig.lazyLoading.intersectionObserver.threshold,
  rootMargin = perfConfig.lazyLoading.intersectionObserver.rootMargin,
  fallback,
  onVisible,
  onLoadStart,
  onLoadComplete,
  priority = false,
  className = ""
}: LazyLoadSectionProps) {
  const [isVisible, setIsVisible] = useState<boolean>(priority);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadStartTime = useRef<number>(0);

  // Performance monitoring
  const reportPerformance = useCallback((action: string, duration?: number) => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      try {
        // Report to performance monitoring if available
        if (duration !== undefined) {
          console.debug(`LazyLoadSection: ${action} took ${duration}ms`);
        }
      } catch (error) {
        // Silently fail performance reporting
      }
    }
  }, []);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;

    if (entry.isIntersecting && !isVisible) {
      const intersectionTime = performance.now();
      loadStartTime.current = intersectionTime;

      setIsVisible(true);
      setIsLoading(true);
      onVisible?.();
      onLoadStart?.();

      reportPerformance('intersection detected');

      // Disconnect observer after first intersection
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    }
  }, [isVisible, onVisible, onLoadStart, reportPerformance]);

  // Initialize intersection observer with better error handling and SSR safety
  useClientLayoutEffect(() => {
    // Skip if already visible (priority loading) or no window
    if (priority || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      if (!priority) {
        setIsVisible(true);
      }
      return;
    }

    try {
      observerRef.current = new IntersectionObserver(handleIntersection, {
        threshold,
        rootMargin,
        // Add root option for better performance
        root: null,
      });

      const currentRef = ref.current;
      if (currentRef) {
        observerRef.current.observe(currentRef);
        reportPerformance('observer attached');
      }
    } catch (error) {
      console.warn('LazyLoadSection: Failed to create IntersectionObserver, falling back to immediate load', error);
      setIsVisible(true);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [threshold, rootMargin, priority, handleIntersection, reportPerformance]);

  // Handle loading completion
  useEffect(() => {
    if (isVisible && isLoading) {
      // Simulate loading completion (in real app, this would be based on actual content loading)
      const timer = setTimeout(() => {
        setIsLoading(false);
        onLoadComplete?.();

        const loadDuration = performance.now() - loadStartTime.current;
        reportPerformance('content loaded', loadDuration);
      }, 100); // Small delay to ensure DOM updates

      return () => clearTimeout(timer);
    }
  }, [isVisible, isLoading, onLoadComplete, reportPerformance]);

  // Enhanced fallback with better loading states
  const defaultFallback = (
    <div className="flex items-center justify-center h-48 bg-gradient-to-r from-gray-100 to-gray-200 animate-pulse rounded-lg">
      <div className="space-y-3 w-full max-w-xs">
        <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
        <div className="h-4 bg-gray-300 rounded w-2/3 mx-auto"></div>
      </div>
    </div>
  );

  const errorFallback = (
    <div className="flex items-center justify-center h-48 bg-red-50 border border-red-200 rounded-lg">
      <div className="text-center text-red-600">
        <div className="text-sm">فشل في تحميل المحتوى</div>
        <button
          onClick={() => {
            setHasError(false);
            setIsVisible(false);
            // Re-trigger intersection observer
            if (ref.current && observerRef.current) {
              observerRef.current.observe(ref.current);
            }
          }}
          className="mt-2 text-xs underline hover:no-underline"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );

  // For server-side rendering, show the same fallback as client initial state
  if (typeof window === 'undefined') {
    return (
      <div
        className={`lazy-load-section ${className}`}
        data-visible={priority}
        data-loading={false}
        data-error={false}
      >
        {priority ? children : fallback || defaultFallback}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`lazy-load-section ${className}`}
      data-visible={isVisible}
      data-loading={isLoading}
      data-error={hasError}
    >
      {hasError ? (
        errorFallback
      ) : isVisible ? (
        <React.Suspense fallback={fallback || defaultFallback}>
          {children}
        </React.Suspense>
      ) : (
        fallback || defaultFallback
      )}
    </div>
  );
}

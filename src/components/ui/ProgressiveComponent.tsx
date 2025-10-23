"use client";

import React, { ComponentType, ReactNode, useState, useCallback, useEffect, useRef } from 'react';
import { LazyLoadSection } from './LazyLoadSection';
import { SkeletonLoader } from './SkeletonLoader';
import { useClientEffect, useClientEffectSafe } from '@/hooks/use-client-effect';
import { useProgressiveComponent } from '@/hooks/use-progressive-loading';

interface ProgressiveComponentProps<T = any> {
  importFunc: () => Promise<{ default: ComponentType<T> }>;
  componentProps?: T;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  priority?: boolean;
  lazyLoad?: boolean;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

export function ProgressiveComponent<T = any>({
  importFunc,
  componentProps,
  fallback,
  errorFallback,
  priority = false,
  lazyLoad = true,
  onLoadStart,
  onLoadComplete,
  onError,
  className = ""
}: ProgressiveComponentProps<T>) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);

  // Use the enhanced progressive component hook
  const {
    data: Component,
    isLoading,
    error: hookError,
    isHydrated,
    load,
    retry,
    canRetry
  } = useProgressiveComponent(importFunc, {
    priority,
    lazyLoad,
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 10000,
    onLoadStart,
    onLoadComplete: () => {
      setHasError(false);
      setError(null);
      retryCountRef.current = 0;
      onLoadComplete?.();
    },
    onError: (err) => {
      setHasError(true);
      setError(err);
      onError?.(err);
    },
    onRetry: (attempt) => {
      retryCountRef.current = attempt;
    }
  });

  const handleRetry = useCallback(() => {
    setHasError(false);
    setError(null);
    retry();
  }, [retry]);

  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <SkeletonLoader className="w-full h-32" />
    </div>
  );

  const defaultErrorFallback = (
    <div className="flex items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
      <div className="text-center">
        <div className="text-red-600 font-medium mb-2">فشل في تحميل المكون</div>
        <div className="text-sm text-red-500 mb-4">
          {error?.message || hookError?.message || 'حدث خطأ غير متوقع'}
        </div>
        {canRetry && (
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            إعادة المحاولة {retryCountRef.current > 0 && `(${retryCountRef.current})`}
          </button>
        )}
      </div>
    </div>
  );

  const componentContent = (
    <div className={className}>
      {hasError ? (
        errorFallback || defaultErrorFallback
      ) : Component ? (
        <Component {...(componentProps as T)} />
      ) : isLoading ? (
        fallback || defaultFallback
      ) : null}
    </div>
  );

  // If priority loading is enabled, load immediately (client-side only)
  useClientEffect(() => {
    if (priority && !Component && !isLoading && !hasError) {
      load();
    }
  }, [priority, Component, isLoading, hasError, load]);

  // If lazy loading is disabled, load immediately (client-side only)
  useClientEffect(() => {
    if (!lazyLoad && !Component && !isLoading && !hasError) {
      load();
    }
  }, [lazyLoad, Component, isLoading, hasError, load]);

  if (lazyLoad && !priority) {
    return (
      <LazyLoadSection
        onVisible={load}
        fallback={fallback || defaultFallback}
        priority={false}
        className={className}
      >
        {componentContent}
      </LazyLoadSection>
    );
  }

  return componentContent;
}

// Higher-order component for easier usage
export function withProgressiveLoading<T extends object>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  options: Omit<ProgressiveComponentProps<T>, 'importFunc' | 'componentProps'> = {}
) {
  return React.forwardRef<any, T>((props, ref) => (
    <ProgressiveComponent
      importFunc={importFunc}
      componentProps={{ ...props, ref }}
      {...options}
    />
  ));
}

// Utility function for creating progressive sections
export function createProgressiveSection<T = any>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  displayName: string
) {
  const ProgressiveSection = React.forwardRef<any, ProgressiveComponentProps<T>>((props, ref) => (
    <ProgressiveComponent
      importFunc={importFunc}
      {...props}
      ref={ref}
    />
  ));

  ProgressiveSection.displayName = `ProgressiveSection(${displayName})`;
  return ProgressiveSection;
}

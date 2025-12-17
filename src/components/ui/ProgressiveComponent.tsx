"use client";

import React, { ComponentType, ReactNode, useState, useCallback, useRef } from 'react';
import { LazyLoadSection } from './LazyLoadSection';
import { SkeletonLoader } from './SkeletonLoader';
import { useClientEffect } from '@/hooks/use-client-effect';
import { useProgressiveComponent } from '@/hooks/use-progressive-loading';

interface ProgressiveComponentProps<P = unknown> {
  importFunc: () => Promise<{ default: ComponentType<P> }>;
  componentProps?: P;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  priority?: boolean;
  lazyLoad?: boolean;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

export function ProgressiveComponent<P = unknown>({
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
}: ProgressiveComponentProps<P>) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);

  // Use the enhanced progressive component hook
  const {
    data: Component,
    isLoading,
    error: hookError,
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
        <Component {...(componentProps as P & React.JSX.IntrinsicAttributes)} />
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
export function withProgressiveLoading<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: Omit<ProgressiveComponentProps<P>, 'importFunc' | 'componentProps'> & { displayName?: string; componentName?: string } = {}
) {
  const Component = React.forwardRef<unknown, P>((props, ref) => (
    <ProgressiveComponent
      importFunc={importFunc}
      componentProps={{ ...props, ref } as P}
      {...options}
    />
  ));
  Component.displayName = `withProgressiveLoading(${options.displayName || options.componentName || 'Component'})`;
  return Component;
}

// Utility function for creating progressive sections
export function createProgressiveSection<P = unknown>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  displayName: string
) {
  const ProgressiveSection = React.forwardRef<unknown, Omit<ProgressiveComponentProps<P>, 'importFunc'>>((props, ref) => {
    return (
      <ProgressiveComponent
        importFunc={importFunc}
        {...props}
        // ref is not passed to ProgressiveComponent as it doesn't accept it, 
        // but we could wrap it if needed. For now, we ignore ref to avoid type issues.
      />
    );
  });

  ProgressiveSection.displayName = `ProgressiveSection(${displayName})`;
  return ProgressiveSection;
}

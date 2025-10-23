"use client";

import React, { Component, ReactNode, useState, useEffect } from 'react';
import { useClientEffect } from '@/hooks/use-client-effect';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isHydrated: boolean;
}

/**
 * Enhanced Error Boundary with client-server compatibility
 * Handles hydration mismatches and provides better error recovery
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isHydrated: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if this is a hydration mismatch
    const isHydrationError = error.message.includes('hydration') ||
                           error.message.includes('server') ||
                           error.message.includes('client');

    this.setState({
      errorInfo,
      isHydrated: !isHydrationError
    });

    // Call error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log hydration errors differently
    if (isHydrationError) {
      console.warn('Hydration mismatch detected:', error.message);
    } else {
      console.error('Error boundary caught an error:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state when children change (useful for route changes)
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: 0
      });
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;

    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));

      // Clear any pending retry
      if (this.retryTimeoutId) {
        clearTimeout(this.retryTimeoutId);
      }
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  render() {
    const { hasError, error, retryCount, isHydrated } = this.state;
    const { children, fallback, enableRetry = true, maxRetries = 3, className = "" } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI with client-server awareness
      const isHydrationError = error?.message.includes('hydration') ||
                             error?.message.includes('server') ||
                             error?.message.includes('client');

      return (
        <div className={`error-boundary ${className}`}>
          <div className="flex items-center justify-center min-h-[200px] p-8">
            <div className="text-center max-w-md">
              <div className={`text-lg font-medium mb-4 ${
                isHydrationError ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {isHydrationError ? 'خطأ في التزامن' : 'حدث خطأ غير متوقع'}
              </div>

              <div className="text-sm text-gray-600 mb-6">
                {isHydrationError
                  ? 'كان هناك عدم تطابق بين الخادم والعميل. جاري إعادة المحاولة...'
                  : error?.message || 'حدث خطأ غير متوقع في التطبيق.'
                }
              </div>

              {enableRetry && retryCount < maxRetries && (
                <div className="space-y-3">
                  <button
                    onClick={this.handleRetry}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    إعادة المحاولة {retryCount > 0 && `(${retryCount}/${maxRetries})`}
                  </button>

                  <div className="text-xs text-gray-500">
                    {isHydrationError && !isHydrated
                      ? 'جاري إعادة تحميل المحتوى...'
                      : 'سيتم إعادة تحميل المكون'
                    }
                  </div>
                </div>
              )}

              {retryCount >= maxRetries && (
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                >
                  إعادة تعيين
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook-based error boundary for functional components
 * Provides a simpler API for handling errors in hooks
 */
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);
  const [hasError, setHasError] = useState(false);

  const resetError = useCallback(() => {
    setError(null);
    setHasError(false);
  }, []);

  const captureError = useCallback((err: Error) => {
    setError(err);
    setHasError(true);
  }, []);

  // Auto-reset on hydration (client-side only)
  useClientEffect(() => {
    if (hasError) {
      // Small delay to allow for re-rendering
      const timeoutId = setTimeout(() => {
        resetError();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [hasError, resetError]);

  return {
    error,
    hasError,
    resetError,
    captureError
  };
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Suspense-compatible error boundary
 */
export function SuspenseErrorBoundary({
  children,
  fallback
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={fallback}
      enableRetry={true}
      maxRetries={2}
    >
      {children}
    </ErrorBoundary>
  );
}

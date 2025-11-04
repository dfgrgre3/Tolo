"use client";

import React, { useEffect } from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

/**
 * Error fallback component for ErrorBoundary
 * Displays user-friendly error message
 */
const ErrorFallback = React.memo(function ErrorFallback({ 
  error, 
  resetErrorBoundary 
}: FallbackProps) {
  if (!error) {
    return (
      <div className="p-4 text-red-500" role="alert">
        <h2 className="text-xl font-bold mb-2">حدث خطأ غير معروف</h2>
        <button
          onClick={resetErrorBoundary}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 text-red-500" role="alert">
      <h2 className="text-xl font-bold mb-2">حدث خطأ في تحميل التطبيق</h2>
      <pre className="whitespace-pre-wrap break-words mb-4">
        {error?.message || 'خطأ غير معروف'}
      </pre>
      {error?.stack && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm">تفاصيل الخطأ</summary>
          <pre className="mt-2 text-xs overflow-auto max-h-64 bg-red-50 p-2 rounded">
            {error.stack}
          </pre>
        </details>
      )}
      <button
        onClick={resetErrorBoundary}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        إعادة المحاولة
      </button>
    </div>
  );
});

/**
 * Hook to handle webpack module loading errors
 * Automatically reloads the page on certain errors
 */
function useWebpackErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);
      if (
        error.message.includes('Cannot read properties of undefined') ||
        error.message.includes('call') ||
        error.message.includes('is not a function') ||
        error.message.includes('Component is not a function')
      ) {
        console.error('Webpack module loading error detected:', error);
        setTimeout(() => window.location.reload(), 1000);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (
        error?.message?.includes('is not a function') ||
        error?.message?.includes('Component is not a function')
      ) {
        console.error('Unhandled promise rejection:', error);
        setTimeout(() => window.location.reload(), 1000);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}

/**
 * ClientLayoutWrapper component
 * Wraps the application with error boundary and error handling
 * 
 * @optimized - Uses ErrorBoundary for better error handling
 */
export function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useWebpackErrorHandler();

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
      )}
      onError={(error: Error, info: { componentStack: string }) => {
        console.error('Layout Error:', error, info.componentStack);
        // Log to error tracking service if needed
        if (process.env.NODE_ENV === 'production') {
          // TODO: Send to error tracking service
        }
      }}
      onReset={() => {
        // Reset any state that might have caused the error
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}


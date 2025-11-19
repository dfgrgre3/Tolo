"use client";

import React, { useEffect } from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

// Lazy load logger to prevent server-only bundling issues
let loggerInstance: any = null;
async function getLogger() {
  if (!loggerInstance) {
    try {
      const loggerModule = await import('@/lib/logger');
      loggerInstance = loggerModule.logger;
    } catch (error) {
      // Fallback to console if logger fails to load
      loggerInstance = {
        info: (...args: any[]) => console.info(...args),
        warn: (...args: any[]) => console.warn(...args),
        error: (...args: any[]) => console.error(...args),
        debug: (...args: any[]) => console.debug(...args),
      };
    }
  }
  return loggerInstance;
}

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
 * Hook to handle webpack/turbopack module loading errors
 * Automatically reloads the page on certain errors including HMR issues
 */
function useWebpackErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);
      const errorMessage = error.message || event.message || '';
      
      // Check for various module loading errors including HMR issues
      if (
        errorMessage.includes('Cannot read properties of undefined') ||
        errorMessage.includes('call') ||
        errorMessage.includes('is not a function') ||
        errorMessage.includes('Component is not a function') ||
        errorMessage.includes('module factory is not available') ||
        errorMessage.includes('was instantiated because it was required') ||
        errorMessage.includes('next-auth') ||
        errorMessage.includes('HMR update')
      ) {
        getLogger().then(logger => {
          logger.error('Module loading error detected:', error);
        }).catch(() => {
          console.error('Module loading error detected:', error);
        });
        // Clear any cached module references and reload
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const errorMessage = error?.message || '';
      
      if (
        errorMessage.includes('is not a function') ||
        errorMessage.includes('Component is not a function') ||
        errorMessage.includes('module factory is not available') ||
        errorMessage.includes('next-auth') ||
        errorMessage.includes('HMR update')
      ) {
        getLogger().then(logger => {
          logger.error('Unhandled promise rejection (module error):', error);
        }).catch(() => {
          console.error('Unhandled promise rejection (module error):', error);
        });
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
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
      onError={(error: Error, info: React.ErrorInfo) => {
        // Log error - in production, this should be sent to error tracking service
        if (process.env.NODE_ENV === 'production') {
          // Error tracking service integration would go here
          // Example: errorTracker.captureException(error, { extra: info });
        } else {
          getLogger().then(logger => {
            logger.error('Layout Error:', error, info.componentStack);
          }).catch(() => {
            console.error('Layout Error:', error, info.componentStack);
          });
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


import React, { Component, ErrorInfo, ReactNode, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react';
import { errorService as errorManager } from '@/lib/logging/error-service';
import ErrorPage, { ErrorType } from './error-pages';
import { logger } from '@/lib/logger';

/**
 * خصائص مكون ErrorBoundary
 */
interface Props {
  /** المكونات الفرعية */
  children: ReactNode;
  /** مكون بديل يُعرض عند حدوث خطأ */
  fallback?: ReactNode;
  /** دالة callback تُستدعى عند حدوث خطأ */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** نوع الخطأ لتخصيص صفحة الخطأ */
  errorType?: ErrorType;
  /** هل يتم عرض صفحة خطأ مخصصة؟ */
  showErrorPage?: boolean;
  /** هل يتم عرض تفاصيل الخطأ؟ */
  showDetails?: boolean;
  /** تمكين إعادة المحاولة التلقائية */
  enableRetry?: boolean;
  /** أقصى عدد لمحاولات إعادة المحاولة */
  maxRetries?: number;
  /** فئة CSS إضافية */
  className?: string;
  /** نوع العرض: 'global' للخطأ الكامل في الصفحة، أو 'component' للخطأ المحلي في المكون */
  variant?: 'global' | 'component';
}

/**
 * حالة مكون ErrorBoundary
 */
interface State {
  /** هل حدث خطأ؟ */
  hasError: boolean;
  /** كائن الخطأ */
  error: Error | null;
  /** معلومات إضافية عن الخطأ */
  errorInfo: ErrorInfo | null;
  /** معرف فريد للخطأ */
  errorId: string | null;
  /** عدد محاولات إعادة المحاولة */
  retryCount: number;
  /** هل تم ترطيب المكون (Hydrated)؟ */
  isHydrated: boolean;
}

/**
 * ErrorBoundary - مكون معالجة الأخطاء الموحد
 * يوفر واجهة مستخدم غنية، معالجة أخطاء الترطيب (Hydration)، ومنطق إعادة المحاولة.
 */
class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isHydrated: false
    };
  }

  componentDidMount() {
    // Register this boundary with the error manager
    errorManager.registerBoundaryCallback(this.handleBoundaryError);

    // Set hydrated state on client
    this.setState({ isHydrated: true });
  }

  componentWillUnmount() {
    // Unregister when unmounting
    errorManager.registerBoundaryCallback(() => {});

    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleBoundaryError = (error: Error, errorId: string) => {
    // This is called from the error manager
    this.setState({
      hasError: true,
      error,
      errorId
    });
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Check if this is a hydration mismatch
    const isHydrationError = error.message.toLowerCase().includes('hydration') ||
    error.message.toLowerCase().includes('server') ||
    error.message.toLowerCase().includes('client');

    // Log error to console
    if (isHydrationError) {
      logger.warn('Hydration mismatch detected by ErrorBoundary:', error.message);
    } else {
      logger.error('Error caught by ErrorBoundary:', error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo,
      // If it's a hydration error, we might not be fully hydrated
      isHydrated: !isHydrationError
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to ErrorManager unless it's a simple hydration mismatch we can recover from
    if (!isHydrationError || this.state.retryCount > 0) {
      this.logErrorToService(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when children change (useful for route changes)
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.handleReset();
    }
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorId = errorManager.logError(error, {
        source: 'ErrorBoundary',
        severity: 'high',
        componentStack: errorInfo.componentStack,
        errorBoundaryId: this.state.errorId,
        retryCount: this.state.retryCount
      });

      this.setState({ errorId });
    } catch (e) {
      logger.error('Failed to log error to ErrorManager:', e);
    }
  };

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;

    if (this.state.retryCount < maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));

      if (this.retryTimeoutId) {
        clearTimeout(this.retryTimeoutId);
      }
    } else {
      // If max retries reached, just reload effectively
      this.handleReload();
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReportError = () => {
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      errorId: this.state.errorId
    };

    const subject = `Error Report: ${this.state.errorId}`;
    const body = `Error ID: ${this.state.errorId}\n\nError Message: ${errorDetails.message}\n\nStack Trace:\n${errorDetails.stack}\n\nComponent Stack:\n${errorDetails.componentStack}`;
    window.open(`mailto:support@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  render() {
    const { hasError, error, errorId, retryCount } = this.state;
    const { children, fallback, showErrorPage, errorType, showDetails, className = "", variant = "global" } = this.props;

    if (hasError) {
      // If custom fallback is provided, use it
      if (fallback) {
        return fallback;
      }

      // If variant is 'component' or it's localized
      if (variant === 'component') {
        return (
          <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-red-200 dark:border-red-900/30 rounded-xl bg-red-50/50 dark:bg-red-950/20 text-center animate-in fade-in zoom-in duration-300 ${className}`} dir="rtl">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-red-500/10 rounded-full blur-lg animate-pulse"></div>
              <AlertTriangle className="relative h-10 w-10 text-red-500" />
            </div>
            
            <h3 className="text-lg font-bold mb-1">حدث خطأ في هذا الجزء</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              واجهنا مشكلة في تحميل هذا المكون. يمكنك محاولة إعادة التحميل.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors"
                disabled={retryCount >= (this.props.maxRetries || 3)}>
                
                <RefreshCw className={`h-3 w-3 ${retryCount > 0 ? 'animate-spin' : ''}`} />
                {retryCount > 0 ? `محاولة (${retryCount})` : 'إعادة المحاولة'}
              </button>
              
              {showDetails &&
              <details className="mt-2 text-right">
                  <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-red-500 underline">
                    التفاصيل
                  </summary>
                  <div className="mt-2 p-2 bg-background border rounded text-[10px] text-red-600 font-mono overflow-auto max-w-[250px]">
                    {error?.message}
                  </div>
                </details>
              }
            </div>
          </div>);

      }

      // Use custom error page if enabled
      if (showErrorPage) {
        return (
          <ErrorPage
            type={errorType || 'generic'}
            errorId={errorId || undefined}
            error={error || undefined}
            showDetails={showDetails}
            onRetry={this.handleRetry}
            onGoHome={this.handleGoHome} />);


      }

      const isHydrationError = error?.message.toLowerCase().includes('hydration') ||
      error?.message.toLowerCase().includes('server') ||
      error?.message.toLowerCase().includes('client');

      // Default high-quality error UI (Global Variant)
      return (
        <div className={`min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 ${className}`} dir="rtl">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex justify-center">
              <div className={`flex items-center justify-center h-16 w-16 rounded-full ${isHydrationError ? 'bg-yellow-100' : 'bg-red-100'}`}>
                {isHydrationError ?
                <RefreshCw className="h-8 w-8 text-yellow-600 animate-spin-slow" aria-hidden="true" /> :

                <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
                }
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {isHydrationError ? 'خطأ في مزامنة البيانات' : 'حدث خطأ غير متوقع'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {isHydrationError ?
              'فشل التطبيق في المزامنة بين الخادم والمتصفح. جاري محاولة الإصلاح...' :
              'نعتذر عن هذا الإزعاج. فريقنا يعمل على حل المشكلة.'}
            </p>
            {errorId &&
            <p className="mt-1 text-center text-xs text-gray-500">
                رمز الخطأ: {errorId}
              </p>
            }
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="space-y-4">
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    
                    <RefreshCw className={`ml-2 h-4 w-4 ${retryCount > 0 ? 'animate-spin' : ''}`} />
                    إعادة المحاولة {retryCount > 0 && `(${retryCount})`}
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    
                    <Home className="ml-2 h-4 w-4" />
                    العودة للصفحة الرئيسية
                  </button>

                  {!isHydrationError &&
                  <button
                    onClick={this.handleReportError}
                    className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    
                      <MessageCircle className="ml-2 h-4 w-4" />
                      إبلاغ عن المشكلة
                    </button>
                  }
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    تفاصيل الخطأ (للمطورين)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded-md text-xs text-gray-800 overflow-auto max-h-40">
                    <p className="font-semibold">{error?.toString()}</p>
                    <pre className="whitespace-pre-wrap mt-2">{error?.stack}</pre>
                    {this.state.errorInfo &&
                    <pre className="whitespace-pre-wrap mt-2">{this.state.errorInfo.componentStack}</pre>
                    }
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>);

    }

    return children;
  }
}

/**
 * useErrorBoundary - هوك لاستخدام ErrorBoundary في المكونات الوظيفية
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

  return {
    error,
    hasError,
    resetError,
    captureError
  };
}

/**
 * withErrorBoundary - HOC لتغليف المكونات بـ ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
Component: React.ComponentType<P>,
errorBoundaryProps?: Omit<Props, 'children'>)
{
  const WrappedComponent = (props: P) =>
  <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>;


  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default ErrorBoundary;
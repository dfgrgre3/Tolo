import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react';
import errorLogger from '../services/ErrorLogger';
import errorManager from '../services/ErrorManager';
import ErrorPage, { ErrorType } from './ErrorPages';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  errorType?: ErrorType;
  showErrorPage?: boolean;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  componentDidMount() {
    // Register this boundary with the error manager
    errorManager.registerBoundaryCallback(this.handleBoundaryError);
  }

  componentWillUnmount() {
    // Unregister when unmounting
    errorManager.registerBoundaryCallback(null);
  }

  handleBoundaryError = (error: Error, errorId: string) => {
    // This is called from the error manager
    this.setState({
      hasError: true,
      error,
      errorId,
    });
  };

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('Error caught by ErrorBoundary:', error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to service (you can integrate with services like Sentry, LogRocket, etc.)
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Use the centralized ErrorLogger service
      const errorId = errorLogger.logError(error, {
        source: 'ErrorBoundary',
        severity: 'high',
        componentStack: errorInfo.componentStack,
        errorBoundaryId: this.state.errorId,
        userAgent: navigator.userAgent,
        url: window.location.href,
      });

      // Update state with the logger's error ID for consistency
      this.setState({ errorId });

      console.log('Error logged to ErrorLogger service with ID:', errorId);
    } catch (e) {
      console.error('Failed to log error to ErrorLogger service:', e);
      // Fallback to basic logging if ErrorLogger fails
      console.error('ErrorBoundary error:', error, errorInfo);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReportError = () => {
    // In a real app, this could open a support ticket or contact form
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      errorId: this.state.errorId,
    };

    // Create mailto link with error details
    const subject = `Error Report: ${this.state.errorId}`;
    const body = `Error ID: ${this.state.errorId}\n\nError Message: ${errorDetails.message}\n\nStack Trace:\n${errorDetails.stack}\n\nComponent Stack:\n${errorDetails.componentStack}`;
    window.open(`mailto:support@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  render() {
    if (this.state.hasError) {
      // If custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use custom error page if enabled
      if (this.props.showErrorPage) {
        return (
          <ErrorPage
            type={this.props.errorType || 'generic'}
            errorId={this.state.errorId || undefined}
            error={this.state.error || undefined}
            showDetails={this.props.showDetails}
            onRetry={this.handleReload}
            onGoHome={this.handleGoHome}
          />
        );
      }

      // Default error UI (legacy)
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" dir="rtl">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex justify-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              حدث خطأ غير متوقع
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              نعتذر عن هذا الإزعاج. فريقنا يعمل على حل المشكلة.
            </p>
            {this.state.errorId && (
              <p className="mt-1 text-center text-xs text-gray-500">
                رمز الخطأ: {this.state.errorId}
              </p>
            )}
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">ماذا يمكنك فعله؟</h3>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-gray-600">
                      يمكنك محاولة إعادة تحميل الصفحة أو العودة إلى الصفحة الرئيسية.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col space-y-3">
                  <button
                    onClick={this.handleReload}
                    className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <RefreshCw className="ml-2 h-4 w-4" />
                    إعادة تحميل الصفحة
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Home className="ml-2 h-4 w-4" />
                    العودة للصفحة الرئيسية
                  </button>

                  <button
                    onClick={this.handleReportError}
                    className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <MessageCircle className="ml-2 h-4 w-4" />
                    إبلاغ عن المشكلة
                  </button>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    تفاصيل الخطأ (للمطورين)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded-md text-xs text-gray-800 overflow-auto max-h-40">
                    <p className="font-semibold">{this.state.error?.toString()}</p>
                    <pre className="whitespace-pre-wrap mt-2">{this.state.error?.stack}</pre>
                    {this.state.errorInfo && (
                      <pre className="whitespace-pre-wrap mt-2">{this.state.errorInfo.componentStack}</pre>
                    )}
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

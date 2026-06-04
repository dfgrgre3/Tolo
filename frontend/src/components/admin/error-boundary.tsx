"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, Home, WifiOff } from "lucide-react";
import { AdminButton } from "./ui/admin-button";
import { cn } from "@/lib/utils";

interface AdminErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface AdminErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  isNetworkError: boolean;
}

class AdminErrorBoundary extends React.Component<
  AdminErrorBoundaryProps,
  AdminErrorBoundaryState
> {
  constructor(props: AdminErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isNetworkError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AdminErrorBoundaryState> {
    const isNetworkError =
      error.message.includes("Network") ||
      error.message.includes("fetch") ||
      error.message.includes("timeout") ||
      error.message.includes("Failed to fetch");

    return {
      hasError: true,
      error,
      isNetworkError,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log to monitoring service
    console.error("Admin Dashboard Error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isNetworkError: false,
    });
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/admin";
  };

  override render() {
    if (this.state.hasError) {
      const { error, isNetworkError } = this.state;

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={cn(
            "min-h-[400px] flex flex-col items-center justify-center p-8",
            "rounded-[2rem] border border-white/10 bg-card/50 backdrop-blur-xl"
          )}
          dir="rtl"
        >
          <div
            className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center mb-6",
              isNetworkError
                ? "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                : "bg-red-500/10 text-red-500 border border-red-500/20"
            )}
          >
            {isNetworkError ? (
              <WifiOff className="w-10 h-10" />
            ) : (
              <AlertTriangle className="w-10 h-10" />
            )}
          </div>

          <h2 className="text-2xl font-black mb-2 text-center">
            {isNetworkError ? "مشكلة في الاتصال" : "حدث خطأ غير متوقع"}
          </h2>

          <p className="text-muted-foreground text-center max-w-md mb-6 font-medium">
            {isNetworkError
              ? "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى."
              : "حدث خطأ أثناء تحميل لوحة التحكم. فريقنا تم إخطاره بالمشكلة."}
          </p>

          {error && (
            <div className="bg-muted/50 rounded-xl p-4 mb-6 max-w-md w-full overflow-hidden">
              <p className="text-xs font-mono text-muted-foreground truncate">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <AdminButton
              variant="premium"
              icon={RefreshCw}
              onClick={this.handleRetry}
            >
              إعادة المحاولة
            </AdminButton>

            <AdminButton variant="outline" icon={Home} onClick={this.handleGoHome}>
              العودة للرئيسية
            </AdminButton>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors gracefully
export function useAdminErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);
  const [isNetworkError, setIsNetworkError] = React.useState(false);

  const handleError = React.useCallback((err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    const isNetwork =
      error.message.includes("Network") ||
      error.message.includes("fetch") ||
      error.message.includes("timeout") ||
      error.message.includes("Failed to fetch");

    setError(error);
    setIsNetworkError(isNetwork);
    console.error("Admin Error:", error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
    setIsNetworkError(false);
  }, []);

  return {
    error,
    isNetworkError,
    handleError,
    clearError,
  };
}

// Network Error Card Component
export function NetworkErrorCard({
  onRetryAction,
  className,
}: {
  onRetryAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-[1.5rem]",
        "border border-orange-500/20 bg-orange-500/5",
        className
      )}
      dir="rtl"
    >
      <WifiOff className="w-12 h-12 text-orange-500 mb-4" />
      <h3 className="text-lg font-bold mb-2">فقدان الاتصال</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center">
        تعذر الاتصال بالخادم. يرجى التحقق من الإنترنت.
      </p>
      {onRetryAction && (
        <AdminButton variant="outline" size="sm" icon={RefreshCw} onClick={onRetryAction}>
          إعادة المحاولة
        </AdminButton>
      )}
    </div>
  );
}

export default AdminErrorBoundary;

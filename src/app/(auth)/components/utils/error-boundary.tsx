/**
 * Error Boundary for Authentication Components
 * Catches and handles errors in auth components gracefully
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component for authentication flows
 * 
 * @example
 * ```tsx
 * <AuthErrorBoundary>
 *   <LoginForm />
 * </AuthErrorBoundary>
 * ```
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring service
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth Error Boundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>حدث خطأ</CardTitle>
            </div>
            <CardDescription>
              حدث خطأ غير متوقع في نظام المصادقة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm">
                <p className="font-mono text-xs text-destructive">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="default">
                إعادة المحاولة
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                إعادة تحميل الصفحة
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for error handling in functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((err: unknown) => {
    if (err instanceof Error) {
      setError(err);
    } else if (typeof err === 'string') {
      setError(new Error(err));
    } else {
      setError(new Error('حدث خطأ غير متوقع'));
    }
  }, []);

  return {
    error,
    resetError,
    handleError,
  };
}


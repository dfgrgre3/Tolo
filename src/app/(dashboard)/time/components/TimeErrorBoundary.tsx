'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class TimeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Time management error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center rtl" dir="rtl">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
            <AlertTriangle className="relative h-16 w-16 text-red-500" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">حدث خطأ غير متوقع</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            واجهنا مشكلة في تحميل هذه الصفحة. يرجى المحاولة مرة أخرى أو تحديث الصفحة.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 max-w-lg overflow-auto text-right">
              <p className="text-sm font-mono text-red-600 dark:text-red-400">
                {this.state.error.message}
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button onClick={this.handleReset} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              تحديث الصفحة
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

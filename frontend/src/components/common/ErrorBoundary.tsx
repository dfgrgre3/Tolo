"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center backdrop-blur-xl">
          <div className="mb-4 rounded-full bg-red-500/10 p-4 text-red-500 border border-red-500/20">
            <AlertTriangle className="h-8 w-8 animate-pulse" />
          </div>
          <h3 className="mb-2 text-xl font-black text-white">حدث خطأ في عرض هذا الجزء</h3>
          <p className="mb-6 max-w-md text-sm text-gray-400 leading-relaxed">
            عذراً، واجه النظام مشكلة أثناء تحميل المحتوى. يمكنك المحاولة مرة أخرى أو تحديث الصفحة.
          </p>
          {this.state.error && (
            <div className="mb-6 max-w-full overflow-x-auto rounded-xl bg-black/40 p-4 text-right dir-ltr text-xs font-mono text-red-400 border border-white/5 max-w-lg">
              {this.state.error.message}
            </div>
          )}
          <Button
            onClick={this.handleReset}
            className="bg-red-500 hover:bg-red-600 text-white font-black px-6 h-12 rounded-xl flex items-center gap-2 border-b-4 border-black/20 transition-all hover:scale-105 active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة تحميل الصفحة
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

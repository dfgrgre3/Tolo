/**
 * Centralized Error Management System
 * Connects ErrorBoundary, ErrorToast, and ErrorLogger for unified error handling
 */

import errorLogger, { ErrorLogEntry } from './ErrorLogger';

export interface ErrorConfig {
  showToast: boolean;
  showBoundary: boolean;
  logError: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export interface ErrorDisplayOptions {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

class ErrorManager {
  private toastCallback: ((options: ErrorDisplayOptions & { variant: 'destructive' | 'warning' | 'info' }) => void) | null = null;
  private boundaryCallback: ((error: Error, errorId: string) => void) | null = null;

  /**
   * Register toast display callback
   */
  registerToastCallback(callback: (options: ErrorDisplayOptions & { variant: 'destructive' | 'warning' | 'info' }) => void) {
    this.toastCallback = callback;
  }

  /**
   * Register error boundary callback
   */
  registerBoundaryCallback(callback: (error: Error, errorId: string) => void) {
    this.boundaryCallback = callback;
  }

  /**
   * Handle error with centralized logic
   */
  handleError(
    error: Error | string,
    config: Partial<ErrorConfig> = {},
    displayOptions: ErrorDisplayOptions = {}
  ): string {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    // Default configuration
    const finalConfig: ErrorConfig = {
      showToast: true,
      showBoundary: false,
      logError: true,
      severity: 'medium',
      ...config,
    };

    let errorId = '';

    // Log error if enabled
    if (finalConfig.logError) {
      errorId = errorLogger.logError(errorObj, {
        source: finalConfig.context?.source || 'ErrorManager',
        severity: finalConfig.severity,
        ...finalConfig.context,
      });
    }

    // Show toast if enabled
    if (finalConfig.showToast && this.toastCallback && typeof this.toastCallback === 'function') {
      const variant = this.getToastVariant(finalConfig.severity);
      this.toastCallback({
        title: displayOptions.title || this.getDefaultTitle(finalConfig.severity),
        description: displayOptions.description || errorObj.message,
        action: displayOptions.action,
        duration: displayOptions.duration,
        variant,
      });
    }

    // Trigger error boundary if enabled
    if (finalConfig.showBoundary && this.boundaryCallback && typeof this.boundaryCallback === 'function') {
      this.boundaryCallback(errorObj, errorId);
    }

    return errorId;
  }

  /**
   * Handle async operation errors
   */
  handleAsyncError(
    error: Error | string,
    operation: string,
    config: Partial<ErrorConfig> = {},
    displayOptions: ErrorDisplayOptions = {}
  ): string {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    return this.handleError(errorObj, {
      context: {
        operation,
        type: 'async',
        ...config.context,
      },
      ...config,
    }, displayOptions);
  }

  /**
   * Handle network errors
   */
  handleNetworkError(
    error: Error | string,
    endpoint: string,
    config: Partial<ErrorConfig> = {},
    displayOptions: ErrorDisplayOptions = {}
  ): string {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    // Check if it's a connection error
    const isConnectionError = 
      errorObj.message.includes('fetch') ||
      errorObj.message.includes('network') ||
      errorObj.message.includes('Failed to fetch') ||
      errorObj.message.includes('NetworkError') ||
      errorObj.message.includes('Connection') ||
      errorObj.name === 'TypeError';

    return this.handleError(errorObj, {
      severity: 'high',
      context: {
        endpoint,
        type: 'network',
        ...config.context,
      },
      ...config,
    }, {
      title: displayOptions.title || 'خطأ في الاتصال',
      description: displayOptions.description || (isConnectionError 
        ? 'حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.'
        : 'فشل في الاتصال بالخادم. يرجى المحاولة مرة أخرى.'),
      ...displayOptions,
    });
  }

  /**
   * Handle validation errors
   */
  handleValidationError(
    errors: Record<string, string> | string,
    config: Partial<ErrorConfig> = {},
    displayOptions: ErrorDisplayOptions = {}
  ): string {
    const errorMessage = typeof errors === 'string' ? errors : Object.values(errors).join(', ');
    const errorObj = new Error(errorMessage);

    return this.handleError(errorObj, {
      severity: 'low',
      context: {
        type: 'validation',
        validationErrors: errors,
        ...config.context,
      },
      ...config,
    }, {
      title: displayOptions.title || 'خطأ في التحقق',
      description: displayOptions.description || errorMessage,
      ...displayOptions,
    });
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(
    error: Error | string,
    config: Partial<ErrorConfig> = {},
    displayOptions: ErrorDisplayOptions = {}
  ): string {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    return this.handleError(errorObj, {
      severity: 'high',
      context: {
        type: 'authentication',
        ...config.context,
      },
      ...config,
    }, {
      title: displayOptions.title || 'خطأ في المصادقة',
      description: displayOptions.description || 'انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.',
      action: displayOptions.action || {
        label: 'تسجيل الدخول',
        onClick: () => window.location.href = '/login',
      },
      ...displayOptions,
    });
  }

  /**
   * Handle permission errors
   */
  handlePermissionError(
    resource: string,
    config: Partial<ErrorConfig> = {},
    displayOptions: ErrorDisplayOptions = {}
  ): string {
    const errorObj = new Error(`غير مصرح للوصول إلى ${resource}`);

    return this.handleError(errorObj, {
      severity: 'medium',
      context: {
        type: 'permission',
        resource,
        ...config.context,
      },
      ...config,
    }, {
      title: displayOptions.title || 'خطأ في الصلاحيات',
      description: displayOptions.description || `ليس لديك صلاحية للوصول إلى ${resource}`,
      ...displayOptions,
    });
  }

  /**
   * Get toast variant based on severity
   */
  private getToastVariant(severity: ErrorConfig['severity']): 'destructive' | 'warning' | 'info' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      case 'low':
      default:
        return 'info';
    }
  }

  /**
   * Get default title based on severity
   */
  private getDefaultTitle(severity: ErrorConfig['severity']): string {
    switch (severity) {
      case 'critical':
        return 'خطأ حرج';
      case 'high':
        return 'خطأ خطير';
      case 'medium':
        return 'تحذير';
      case 'low':
      default:
        return 'تنبيه';
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    unresolved: number;
    bySeverity: Record<ErrorLogEntry['severity'], number>;
    recent: ErrorLogEntry[];
  } {
    const logs = errorLogger.getLogs();
    const unresolved = errorLogger.getUnresolvedLogs();
    const recent = logs.slice(-10);

    const bySeverity = logs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorLogEntry['severity'], number>);

    return {
      total: logs.length,
      unresolved: unresolved.length,
      bySeverity,
      recent,
    };
  }

  /**
   * Clear error logs
   */
  clearLogs(): void {
    errorLogger.clearLogs();
  }

  /**
   * Export error logs
   */
  exportLogs(): string {
    return errorLogger.exportLogs();
  }
}

// Create singleton instance
const errorManager = new ErrorManager();

export default errorManager;
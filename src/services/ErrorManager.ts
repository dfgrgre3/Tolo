/**
 * Centralized Error Management System
 * Unified single source of truth for error handling, logging, formatting and toasts.
 */

// Use console internally to avoid circular dependencies with the unified logger
const logger = console;
import { safeGetItem, safeSetItem } from '@/lib/safe-client-utils';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sessionId: string;
  userAgent: string;
  url: string;
  additionalData?: Record<string, any>;
  resolved: boolean;
}

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
  private logs: ErrorLogEntry[] = [];
  private sessionId: string;
  private readonly maxLogs = 100;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.setupGlobalErrorHandlers();
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';
    const stored = safeGetItem('errorLoggerSessionId', { storageType: 'session', fallback: '' }) as string;
    if (stored) return stored;
    const newId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    safeSetItem('errorLoggerSessionId', newId, { storageType: 'session' });
    return newId;
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;
    try {
      window.addEventListener('error', (event) => {
        if (event.filename && event.filename.includes('next-devtools')) return;
        this.logError(event.error || new Error(event.message || 'Unknown error'), { source: 'Global Error Handler' });
      });

      window.addEventListener('unhandledrejection', (event) => {
        if (!event.reason) return;
        this.logError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), { source: 'Unhandled Promise Rejection' });
      });
    } catch (e) {
      logger.warn('Failed to setup global error handlers', e);
    }
  }

  public registerToastCallback(callback: (options: ErrorDisplayOptions & { variant: 'destructive' | 'warning' | 'info' }) => void) {
    this.toastCallback = callback;
  }

  public registerBoundaryCallback(callback: (error: Error, errorId: string) => void) {
    this.boundaryCallback = callback;
  }

  public logError(error: Error | string, context: Record<string, any> = {}): string {
    const errorObj = typeof error === 'string' ? new Error(error || 'Unknown error') : error;

    const logEntry: ErrorLogEntry = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message: errorObj.message || 'Unknown error',
      stack: errorObj.stack,
      source: context.source || 'Unknown',
      severity: context.severity || 'medium',
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Server-side',
      additionalData: context,
      resolved: false,
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) this.logs.shift();

    if (process.env.NODE_ENV === 'development') {
      logger.error(`[${logEntry.severity.toUpperCase()}] ${logEntry.message}`, logEntry);
    }

    return logEntry.id;
  }

  public handleError(
    error: Error | string,
    config: Partial<ErrorConfig> = {},
    displayOptions: ErrorDisplayOptions = {}
  ): string {
    const errorObj = typeof error === 'string' ? new Error(error || 'Unknown error') : error;

    const finalConfig: ErrorConfig = {
      showToast: true,
      showBoundary: false,
      logError: true,
      severity: 'medium',
      ...config,
    };

    let errorId = '';

    if (finalConfig.logError) {
      errorId = this.logError(errorObj, {
        source: finalConfig.context?.source || 'ErrorManager',
        severity: finalConfig.severity,
        ...finalConfig.context,
      });
    }

    if (finalConfig.showToast && this.toastCallback) {
      const variant = finalConfig.severity === 'critical' || finalConfig.severity === 'high' ? 'destructive' :
        finalConfig.severity === 'medium' ? 'warning' : 'info';

      this.toastCallback({
        title: displayOptions.title,
        description: displayOptions.description || errorObj.message,
        action: displayOptions.action,
        duration: displayOptions.duration,
        variant,
      });
    }

    if (finalConfig.showBoundary && this.boundaryCallback) {
      this.boundaryCallback(errorObj, errorId);
    }

    return errorId;
  }

  public handleNetworkError(error: any, endpoint: string, config: Partial<ErrorConfig> = {}, displayOptions: ErrorDisplayOptions = {}): string {
    return this.handleError(error, {
      severity: 'high',
      context: { type: 'network', endpoint, ...config.context },
      ...config,
    }, {
      title: displayOptions.title || 'خطأ في الاتصال',
      description: displayOptions.description || error.message || 'فشل في الاتصال بالخادم. يرجى المحاولة مرة أخرى.',
      ...displayOptions
    });
  }

  public handleAuthError(error: any, config: Partial<ErrorConfig> = {}, displayOptions: ErrorDisplayOptions = {}): string {
    return this.handleError(error, {
      severity: 'high',
      context: { type: 'authentication', ...config.context },
      ...config,
    }, {
      title: displayOptions.title || 'خطأ في المصادقة',
      description: displayOptions.description || 'انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.',
      ...displayOptions
    });
  }

  public getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }
}

const errorManager = new ErrorManager();
export default errorManager;
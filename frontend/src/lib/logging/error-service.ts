/**
 * Consolidated Error Management & Logging Service
 * Unified single source of truth for error handling, logging, formatting, toasts and persistence.
 */

import { toast } from 'sonner';
import { safeGetItem, safeSetItem } from '@/lib/safe-client-utils';

import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  source: string;
  severity: ErrorSeverity;
  userId?: string;
  sessionId: string;
  userAgent: string;
  url: string;
  additionalData?: Record<string, any>;
  resolved: boolean;
}

export interface ErrorConfig {
  showToast: boolean;
  showBoundary: boolean;
  logToConsole: boolean;
  logToStorage: boolean;
  logToRemote: boolean;
  severity: ErrorSeverity;
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

class ErrorService {
  private logs: ErrorLogEntry[] = [];
  private sessionId: string;
  private readonly maxLogs = 100;
  private boundaryCallback: ((error: Error, errorId: string) => void) | null = null;
  private initialized = false;
  private cleanupFns: Array<() => void> = [];

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    if (typeof window !== 'undefined') {
      this.loadLogsFromStorage();
      this.setupGlobalErrorHandlers();
      this.initialized = true;
    }
  }

  public destroy(): void {
    for (const cleanup of this.cleanupFns) {
      try {
        cleanup();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.cleanupFns = [];
    this.logs = [];
    this.initialized = false;
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';
    try {
      let sessionId = safeGetItem('errorLoggerSessionId', { storageType: 'session', fallback: null }) as string | null;
      if (!sessionId) {
        sessionId = `session-${generateId()}`;
        safeSetItem('errorLoggerSessionId', sessionId, { storageType: 'session' });
      }
      return sessionId;
    } catch {
      return `session-fallback-${Date.now()}`;
    }
  }

  private loadLogsFromStorage(): void {
    try {
      const storedLogs = safeGetItem<ErrorLogEntry[]>('errorLogs', { fallback: [] });
      if (Array.isArray(storedLogs)) {
        this.logs = storedLogs.slice(-this.maxLogs);
      } else {
        this.logs = [];
      }
    } catch {
      this.logs = [];
    }
  }

  private saveLogsToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      safeSetItem('errorLogs', this.logs);
    } catch {
      // Silent fail
    }
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    const handleError = (event: ErrorEvent) => {
      if (event.filename?.includes('next-devtools')) return;
      if (event.error?.stack?.includes('next-devtools')) return;

      this.logError(event.error || new Error(event.message || 'Unknown error'), { 
        source: 'Global Error Handler',
        severity: 'high' 
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (!event.reason) return;
      if (String(event.reason.stack || '').includes('next-devtools')) return;

      this.logError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), { 
        source: 'Unhandled Promise Rejection',
        severity: 'high'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    this.cleanupFns.push(() => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    });
  }

  public registerBoundaryCallback(callback: (error: Error, errorId: string) => void) {
    this.boundaryCallback = callback;
  }

  /**
   * Core logging method
   */
  public logError(error: Error | string | unknown, context: Record<string, any> = {}): string {
    const errorObj = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
    
    const logEntry: ErrorLogEntry = {
      id: `error-${generateId()}`,
      timestamp: new Date().toISOString(),
      message: errorObj.message || 'Unknown error',
      stack: errorObj.stack,
      source: context.source || 'Unknown',
      severity: (context.severity || 'medium') as ErrorSeverity,
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Server-side',
      additionalData: context,
      resolved: false,
    };

    // Add to in-memory logs
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) this.logs.shift();

    // Persist to localStorage if on client
    if (typeof window !== 'undefined') {
      this.saveLogsToStorage();
      
      // Console logging in dev
      if (process.env.NODE_ENV === 'development') {
        const style = logEntry.severity === 'critical' || logEntry.severity === 'high' 
          ? 'color: white; background: red; font-weight: bold; padding: 2px 5px;'
          : 'color: orange; font-weight: bold;';
        console.group(`%c ERROR [${logEntry.severity.toUpperCase()}] %c ${logEntry.message}`, style, 'font-weight: normal;');
        logger.info('Source:', logEntry.source);
        logger.info('Context:', context);
        logger.info('Stack:', logEntry.stack);
        console.groupEnd();
      }
    }

    return logEntry.id;
  }

  /**
   * High-level error handler with UI feedback
   */
  public handleError(
    error: Error | string | unknown,
    config: Partial<ErrorConfig> = {},
    displayOptions: ErrorDisplayOptions = {}
  ): string {
    const finalConfig: ErrorConfig = {
      showToast: true,
      showBoundary: false,
      logToConsole: true,
      logToStorage: true,
      logToRemote: false,
      severity: 'medium',
      ...config,
    };

    const errorId = this.logError(error, {
      source: finalConfig.context?.source || 'ErrorService',
      severity: finalConfig.severity,
      ...finalConfig.context,
    });

    if (finalConfig.showToast && typeof window !== 'undefined') {
      const isSerious = finalConfig.severity === 'critical' || finalConfig.severity === 'high';
      const toastFn = isSerious ? toast.error : (finalConfig.severity === 'medium' ? toast.warning : toast.info);
      
      const errorObj = error instanceof Error ? error : new Error(String(error));

      toastFn(displayOptions.title || (isSerious ? 'خطأ' : 'تنبيه'), {
        description: displayOptions.description || errorObj.message,
        duration: displayOptions.duration || 5000,
        action: displayOptions.action ? {
          label: displayOptions.action.label,
          onClick: displayOptions.action.onClick
        } : undefined,
      });
    }

    if (finalConfig.showBoundary && this.boundaryCallback && error instanceof Error) {
      this.boundaryCallback(error, errorId);
    }

    return errorId;
  }

  // Convenience methods
  public handleNetworkError(
    error: any, 
    endpoint: string, 
    config: Partial<ErrorConfig> = {},
    displayOptions: ErrorDisplayOptions = {}
  ): string {
    return this.handleError(error, { 
      severity: 'high', 
      context: { type: 'network', endpoint, ...config.context },
      ...config 
    }, {
      title: 'خطأ في الاتصال',
      description: 'فشل في الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.',
      ...displayOptions
    });
  }

  public handleAuthError(error: any, config: Partial<ErrorConfig> = {}): string {
    return this.handleError(error, { 
      severity: 'high', 
      context: { type: 'auth', ...config.context },
      ...config 
    }, {
      title: 'خطأ في المصادقة',
      description: 'فشل في التحقق من هويتك. يرجى تسجيل الدخول مرة أخرى.'
    });
  }

  public getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    this.saveLogsToStorage();
  }
}

export const errorService = new ErrorService();
export default errorService;

/**
 * Advanced Error Logging Service
 * Provides comprehensive error tracking and reporting capabilities
 */

import { safeGetItem, safeSetItem } from '../lib/safe-client-utils';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId: string;
  userAgent: string;
  url: string;
  additionalData?: Record<string, any>;
  resolved: boolean;
}

export interface ErrorLoggerConfig {
  maxLogs: number;
  enableConsoleLog: boolean;
  enableLocalStorage: boolean;
  enableRemoteLogging: boolean;
  remoteEndpoint?: string;
  apiKey?: string;
}

class ErrorLogger {
  private config: ErrorLoggerConfig;
  private logs: ErrorLogEntry[] = [];
  private sessionId: string;

  constructor(config: Partial<ErrorLoggerConfig> = {}) {
    // Default configuration
    this.config = {
      maxLogs: 100,
      enableConsoleLog: true,
      enableLocalStorage: true,
      enableRemoteLogging: false,
      ...config,
    };

    // Generate or retrieve session ID
    this.sessionId = this.getOrCreateSessionId();

    // Load existing logs from localStorage
    this.loadLogsFromStorage();

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  /**
   * Get existing session ID or create a new one
   */
  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('errorLoggerSessionId');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('errorLoggerSessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Load logs from localStorage
   */
  private loadLogsFromStorage(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const storedLogs = safeGetItem('errorLogs', { fallback: null });
      if (storedLogs) {
        this.logs = typeof storedLogs === 'string' ? JSON.parse(storedLogs) : storedLogs;
        // Ensure we don't exceed max logs
        if (this.logs.length > this.config.maxLogs) {
          this.logs = this.logs.slice(-this.config.maxLogs);
        }
      }
    } catch (error) {
      console.error('Failed to load logs from localStorage:', error);
    }
  }

  /**
   * Save logs to localStorage
   */
  private saveLogsToStorage(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      safeSetItem('errorLogs', this.logs);
    } catch (error) {
      console.error('Failed to save logs to localStorage:', error);
    }
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError(event.error || new Error(event.message), {
        source: 'Global Error Handler',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
        source: 'Unhandled Promise Rejection',
      });
    });
  }

  /**
   * Log an error with additional context
   */
  public logError(error: Error | string, context: Record<string, any> = {}): string {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    const logEntry: ErrorLogEntry = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message: errorMessage,
      stack: errorStack,
      source: context.source || 'Unknown',
      severity: context.severity || 'medium',
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      additionalData: context,
      resolved: false,
    };

    // Add to logs array
    this.logs.push(logEntry);

    // Ensure we don't exceed max logs
    if (this.logs.length > this.config.maxLogs) {
      this.logs.shift();
    }

    // Log to console if enabled
    if (this.config.enableConsoleLog) {
      console.error('Error logged:', {
        message: logEntry.message,
        source: logEntry.source,
        severity: logEntry.severity,
        stack: logEntry.stack,
        ...(logEntry.additionalData && { additionalData: logEntry.additionalData })
      });
    }

    // Save to localStorage if enabled
    if (this.config.enableLocalStorage) {
      this.saveLogsToStorage();
    }

    // Send to remote endpoint if enabled
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      this.sendToRemote(logEntry);
    }

    return logEntry.id;
  }

  /**
   * Send error log to remote endpoint
   */
  private async sendToRemote(logEntry: ErrorLogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key if provided
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(logEntry),
      });
    } catch (error) {
      console.error('Failed to send error to remote endpoint:', error);
    }
  }

  /**
   * Get all logs
   */
  public getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs by severity
   */
  public getLogsBySeverity(severity: ErrorLogEntry['severity']): ErrorLogEntry[] {
    return this.logs.filter(log => log.severity === severity);
  }

  /**
   * Get unresolved logs
   */
  public getUnresolvedLogs(): ErrorLogEntry[] {
    return this.logs.filter(log => !log.resolved);
  }

  /**
   * Get logs from current session
   */
  public getCurrentSessionLogs(): ErrorLogEntry[] {
    return this.logs.filter(log => log.sessionId === this.sessionId);
  }

  /**
   * Mark a log as resolved
   */
  public markAsResolved(errorId: string): boolean {
    const logIndex = this.logs.findIndex(log => log.id === errorId);
    if (logIndex !== -1) {
      this.logs[logIndex].resolved = true;
      this.saveLogsToStorage();
      return true;
    }
    return false;
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.logs = [];
    this.saveLogsToStorage();
  }

  /**
   * Export logs as JSON
   */
  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ErrorLoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create singleton instance
const errorLogger = new ErrorLogger();

export default errorLogger;

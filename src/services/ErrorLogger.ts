/**
 * Advanced Error Logging Service
 * Provides comprehensive error tracking and reporting capabilities
 */

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
    const { safeGetItem, safeSetItem } = require('@/lib/safe-client-utils');
    
    let sessionId = safeGetItem('errorLoggerSessionId', { storageType: 'session', fallback: null });
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      safeSetItem('errorLoggerSessionId', sessionId, { storageType: 'session' });
    }
    return sessionId as string;
  }

  /**
   * Load logs from localStorage
   */
  private loadLogsFromStorage(): void {
    if (!this.config.enableLocalStorage) return;
    
    const { safeGetItem } = require('@/lib/safe-client-utils');
    
    try {
      const storedLogs = safeGetItem('errorLogs', { fallback: null });
      if (storedLogs) {
        const logs = Array.isArray(storedLogs) ? storedLogs : JSON.parse(String(storedLogs));
        this.logs = logs;
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
    
    const { safeSetItem } = require('@/lib/safe-client-utils');
    
    // Use safe wrapper that handles errors automatically
    safeSetItem('errorLogs', this.logs);
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    try {
      if (typeof window !== 'undefined') {
        // Catch unhandled JavaScript errors
        window.addEventListener('error', (event) => {
          // Skip errors from Next.js devtools to prevent infinite loops
          const filename = event.filename || '';
          const errorStack = event.error?.stack || '';
          const errorMessage = event.message || '';
          
          // Check filename first
          if (filename && (
            filename.includes('next-devtools') ||
            filename.includes('console-error.ts') ||
            filename.includes('intercept-console-error') ||
            filename.includes('createConsoleError') ||
            filename.includes('handleConsoleError')
          )) {
            return;
          }

          // Also check error stack trace
          if (errorStack && (
            errorStack.includes('next-devtools') ||
            errorStack.includes('console-error.ts') ||
            errorStack.includes('intercept-console-error') ||
            errorStack.includes('createConsoleError') ||
            errorStack.includes('handleConsoleError') ||
            errorStack.includes('ErrorLogger.logError')
          )) {
            return;
          }

          // Skip if error message is empty or just an empty object representation
          if (!errorMessage || !errorMessage.trim() || errorMessage.trim() === '{}') {
            return;
          }

          // Skip if error object is empty or has no meaningful content
          if (event.error && typeof event.error === 'object') {
            const errorKeys = Object.keys(event.error);
            if (errorKeys.length === 0 || (errorKeys.length === 1 && errorKeys[0] === 'message' && !event.error.message)) {
              return;
            }
          }

          this.logError(event.error || new Error(errorMessage), {
            source: 'Global Error Handler',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          });
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
          // Skip if reason is empty or from devtools
          if (!event.reason) {
            return;
          }

          const reasonString = String(event.reason);
          if (!reasonString || reasonString.trim() === '' || reasonString.trim() === '{}') {
            return;
          }

          // Check stack trace for devtools
          if (event.reason instanceof Error && event.reason.stack) {
            const stack = event.reason.stack;
            if (stack.includes('next-devtools') ||
                stack.includes('console-error.ts') ||
                stack.includes('intercept-console-error') ||
                stack.includes('createConsoleError') ||
                stack.includes('handleConsoleError') ||
                stack.includes('ErrorLogger.logError')) {
              return;
            }
          }

          // Skip if error message is from ErrorLogger to prevent recursion
          if (event.reason instanceof Error && event.reason.message) {
            if (event.reason.message.includes('ErrorLogger') || 
                event.reason.message.includes('Error logged: {}')) {
              return;
            }
          }

          this.logError(event.reason instanceof Error ? event.reason : new Error(reasonString), {
            source: 'Unhandled Promise Rejection',
          });
        });
      }
    } catch (error) {
      // Silently fail if error handlers cannot be set up
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to setup global error handlers:', error);
      }
    }
  }

  /**
   * Log an error with additional context
   */
  public logError(error: Error | string, context: Record<string, any> = {}): string {
    let logEntry: ErrorLogEntry;
    
    try {
      // Extract error message with proper fallbacks
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message || error.name || 'Unknown error';
      } else if (typeof error === 'string') {
        errorMessage = error.trim() || 'Unknown error';
      } else {
        errorMessage = 'Unknown error';
      }

      // Ensure message is never empty
      if (!errorMessage || errorMessage.length === 0) {
        errorMessage = 'Unknown error';
      }

      const errorStack = error instanceof Error ? error.stack : undefined;

      // Clean context data to remove undefined/null values and ensure serializability
      const cleanContext: Record<string, any> = {};
      if (context && typeof context === 'object') {
        Object.entries(context).forEach(([key, value]) => {
          // Skip undefined and null values
          if (value !== undefined && value !== null) {
            // Skip circular references and functions
            if (typeof value !== 'function') {
              try {
                // Test if value is serializable
                JSON.stringify(value);
                cleanContext[key] = value;
              } catch {
                // If not serializable, convert to string
                cleanContext[key] = String(value);
              }
            }
          }
        });
      }

      logEntry = {
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        message: errorMessage,
        stack: errorStack,
        source: context?.source || 'Unknown',
        severity: (context?.severity || 'medium') as 'low' | 'medium' | 'high' | 'critical',
        sessionId: this.sessionId,
        userAgent: typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'Unknown',
        url: typeof window !== 'undefined' && window.location ? window.location.href : 'Server-side',
        additionalData: Object.keys(cleanContext).length > 0 ? cleanContext : undefined,
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
        try {
          // Skip logging if this is from Next.js devtools console interception to prevent infinite loops
          const stackTrace = error instanceof Error ? error.stack : '';
          const errorMessageStr = error instanceof Error ? error.message : String(error || '');
          
          // Check if error is from Next.js devtools or is an empty/meaningless error
          if (stackTrace && (
            stackTrace.includes('next-devtools') || 
            stackTrace.includes('intercept-console-error') ||
            stackTrace.includes('console-error.ts') ||
            stackTrace.includes('createConsoleError') ||
            stackTrace.includes('handleConsoleError')
          )) {
            // Silently skip to prevent infinite loops from console.error interception
            return logEntry.id;
          }
          
          // Skip if error message is empty or just an empty object representation
          if (!errorMessageStr || errorMessageStr.trim() === '' || errorMessageStr.trim() === '{}') {
            return logEntry.id;
          }

          // Ensure logEntry exists and has required properties
          if (!logEntry || !logEntry.message || !logEntry.timestamp) {
            return logEntry.id;
          }

          // Build console log data with guaranteed values
          const consoleLogData: Record<string, any> = {};
          
          // Always include message (guaranteed to exist from earlier validation)
          const safeMessage = String(logEntry.message || errorMessage || 'Unknown error').trim();
          if (!safeMessage || safeMessage === 'Unknown error') {
            // Skip if no meaningful message
            return logEntry.id;
          }
          consoleLogData.message = safeMessage;
          
          // Always include source
          const safeSource = String(logEntry.source || context?.source || 'Unknown').trim();
          if (safeSource && safeSource !== 'Unknown') {
            consoleLogData.source = safeSource;
          }
          
          // Always include severity
          const safeSeverity = String(logEntry.severity || context?.severity || 'medium').trim();
          if (safeSeverity) {
            consoleLogData.severity = safeSeverity;
          }

          // Include timestamp (logEntry is guaranteed to exist at this point)
          if (logEntry.timestamp) {
            consoleLogData.timestamp = logEntry.timestamp;
          }

          // Include error ID
          if (logEntry.id) {
            consoleLogData.id = logEntry.id;
          }

          // Include stack if available
          if (logEntry.stack && typeof logEntry.stack === 'string' && logEntry.stack.trim()) {
            // Filter out Next.js devtools from stack to prevent recursion
            const cleanStack = logEntry.stack
              .split('\n')
              .filter(line => !line.includes('next-devtools') && 
                           !line.includes('intercept-console-error') &&
                           !line.includes('console-error.ts') &&
                           !line.includes('createConsoleError'))
              .join('\n');
            
            if (cleanStack.trim()) {
              consoleLogData.stack = cleanStack.substring(0, 500); // Limit stack length
            }
          }

          // Include additional data if available
          if (logEntry.additionalData && typeof logEntry.additionalData === 'object') {
            const cleanAdditionalData: Record<string, any> = {};
            try {
              Object.entries(logEntry.additionalData).forEach(([key, value]) => {
                if (value !== undefined && value !== null && key !== 'source' && key !== 'severity') {
                  try {
                    // Test serializability
                    JSON.stringify(value);
                    cleanAdditionalData[key] = value;
                  } catch {
                    // Convert non-serializable values to string
                    try {
                      cleanAdditionalData[key] = String(value);
                    } catch {
                      // Skip if even string conversion fails
                    }
                  }
                }
              });
              
              if (Object.keys(cleanAdditionalData).length > 0) {
                consoleLogData.additionalData = cleanAdditionalData;
              }
            } catch (additionalDataError) {
              // Skip additional data if it causes issues
            }
          }

          // Final validation: ensure we have meaningful data before logging
          // Must have at least a message and one other property
          const hasValidMessage = consoleLogData.message && 
            consoleLogData.message.trim() !== '' && 
            consoleLogData.message !== 'Unknown error';
          const hasOtherData = Object.keys(consoleLogData).length > 1; // More than just message
          const hasValidData = hasValidMessage && hasOtherData;
          
          if (hasValidData) {
            // Use a different console method or format to avoid Next.js interception
            // in development, or use a more structured log
            const logMessage = `[${consoleLogData.severity || 'MEDIUM'}] ${consoleLogData.message}`;
            const logDetails = { ...consoleLogData };
            delete logDetails.message; // Already in the message
            
            // Ensure logDetails is not empty before including it
            if (Object.keys(logDetails).length > 0) {
              // Use a try-catch around console.error to prevent recursion
              try {
                console.error(logMessage, logDetails);
              } catch (e) {
                // If console.error itself throws, skip silently
                return logEntry.id;
              }
            } else {
              try {
                console.error(logMessage);
              } catch (e) {
                // If console.error itself throws, skip silently
                return logEntry.id;
              }
            }
          } else {
            // If we don't have valid data, skip logging entirely to prevent empty object logs
            return logEntry.id;
          }
        } catch (consoleError) {
          // If console logging fails completely, just return the log entry ID
          // Don't try to log the error as that could cause recursion
          return logEntry.id;
        }
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
    } catch (logError) {
      // Fallback logging if the main logging fails
      console.error('Failed to log error:', logError);
      console.error('Original error:', error);
      return `error-fallback-${Date.now()}`;
    }
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

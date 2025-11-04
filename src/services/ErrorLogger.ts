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
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    try {
      let sessionId = sessionStorage.getItem('errorLoggerSessionId');
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('errorLoggerSessionId', sessionId);
      }
      return sessionId;
    } catch (error) {
      // Fallback if sessionStorage is not accessible
      return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Load logs from localStorage
   */
  private loadLogsFromStorage(): void {
    if (!this.config.enableLocalStorage) return;
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const storedLogs = localStorage.getItem('errorLogs');
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
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
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      localStorage.setItem('errorLogs', JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save logs to localStorage:', error);
    }
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    try {
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
          // Build console log data with guaranteed values
          const consoleLogData: Record<string, any> = {};
          
          // Always include message (guaranteed to exist from earlier validation)
          const safeMessage = String(logEntry.message || errorMessage || 'Unknown error').trim() || 'Unknown error';
          // Always set message - never empty
          consoleLogData.message = safeMessage;
          
          // Include source if available
          const safeSource = String(logEntry.source || 'Unknown').trim();
          if (safeSource && safeSource !== 'Unknown') {
            consoleLogData.source = safeSource;
          } else {
            // Always include source even if unknown
            consoleLogData.source = safeSource || 'Unknown';
          }
          
          // Include severity if available
          const safeSeverity = String(logEntry.severity || 'medium').trim();
          if (safeSeverity) {
            consoleLogData.severity = safeSeverity;
          } else {
            // Always include severity
            consoleLogData.severity = 'medium';
          }

          // Include stack if available
          if (logEntry.stack && typeof logEntry.stack === 'string' && logEntry.stack.trim()) {
            consoleLogData.stack = logEntry.stack;
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
              if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to process additional data:', additionalDataError);
              }
            }
          }

          // Always log - consoleLogData now guaranteed to have at least message, source, and severity
          console.error('Error logged:', consoleLogData);
        } catch (consoleError) {
          // Ultimate fallback if console logging completely fails
          try {
            console.error('Error logged:', errorMessage || (error instanceof Error ? error.message : String(error)) || 'Unknown error');
          } catch {
            // If even that fails, log a basic message
            console.error('Error occurred but logging failed');
          }
          if (process.env.NODE_ENV === 'development') {
            console.error('Console logging error:', consoleError);
          }
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

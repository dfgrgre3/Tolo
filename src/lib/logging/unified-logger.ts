/**
 * Unified Logging System
 * نظام تسجيل موحد للمشروع
 * 
 * هذا النظام يوحد جميع أنظمة التسجيل في المشروع ويوفر:
 * - دعم للتسجيل على الخادم والعميل
 * - تكامل مع ELK Stack
 * - تسجيل الأخطاء المتقدم
 * - تسجيل الأحداث الأمنية
 * - تسجيل أحداث المصادقة
 */

import type { Logger as WinstonLogger } from 'winston';

// Types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, any>;

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
  source?: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableELK: boolean;
  enableErrorLogger: boolean;
  enableAuthLogger: boolean;
  enableSecurityLogger: boolean;
  serviceName?: string;
  environment?: string;
}

// Check if we're on the server
const isServer = typeof window === 'undefined';

// Default configuration
const defaultConfig: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  enableConsole: true,
  enableELK: process.env.ELASTICSEARCH_ENABLED !== 'false' && isServer,
  enableErrorLogger: true,
  enableAuthLogger: true,
  enableSecurityLogger: true,
  serviceName: 'thanawy',
  environment: process.env.NODE_ENV || 'development',
};

class UnifiedLogger {
  private config: LoggerConfig;
  private elkLogger: WinstonLogger | null = null;
  private errorLogger: any = null;
  private authLogger: any = null;
  private securityLogger: any = null;
  private initialized = false;
  private initializing = false;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    // Initialize lazily on first use
  }

  /**
   * Initialize all logging systems (lazy initialization)
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized || this.initializing) return;
    
    this.initializing = true;
    
    try {
      // Initialize ELK logger (server-side only)
      if (this.config.enableELK && isServer) {
        try {
          const { elkLogger } = await import('./elk-logger');
          this.elkLogger = elkLogger;
        } catch (error) {
          // ELK logger initialization failed, continue without it
          this.config.enableELK = false;
        }
      }

      // Initialize Error Logger (client-side)
      if (this.config.enableErrorLogger && !isServer) {
        try {
          const errorLoggerModule = await import('@/services/ErrorLogger');
          this.errorLogger = errorLoggerModule.default;
        } catch (error) {
          // Error logger initialization failed, continue without it
          this.config.enableErrorLogger = false;
        }
      }

      // Initialize Auth Logger (server-side only)
      if (this.config.enableAuthLogger && isServer) {
        try {
          const { authLogger } = await import('./auth-logger');
          this.authLogger = authLogger;
        } catch (error) {
          // Auth logger initialization failed, continue without it
          this.config.enableAuthLogger = false;
        }
      }

      // Initialize Security Logger (server-side only)
      if (this.config.enableSecurityLogger && isServer) {
        try {
          const { securityLogger } = await import('@/lib/security-logger');
          this.securityLogger = securityLogger;
        } catch (error) {
          // Security logger initialization failed, continue without it
          this.config.enableSecurityLogger = false;
        }
      }
    } finally {
      this.initialized = true;
      this.initializing = false;
    }
  }

  /**
   * Format log message
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    context?: LogContext
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error !== undefined) {
      if (error instanceof Error) {
        entry.error = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };
      } else {
        entry.error = {
          message: String(error),
        };
      }
    }

    // Add context metadata
    if (context) {
      if (context.userId) entry.userId = String(context.userId);
      if (context.sessionId) entry.sessionId = String(context.sessionId);
      if (context.ip) entry.ip = String(context.ip);
      if (context.userAgent) entry.userAgent = String(context.userAgent);
      if (context.source) entry.source = String(context.source);
    }

    return entry;
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Log to console
   */
  private logToConsole(level: LogLevel, message: string, context?: LogContext, error?: Error | unknown): void {
    if (!this.config.enableConsole) return;

    const formattedMessage = this.formatMessage(level, message, context);
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const errorStr = error instanceof Error ? `\nError: ${error.message}${error.stack ? `\n${error.stack}` : ''}` : error ? `\nError: ${String(error)}` : '';

    switch (level) {
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(formattedMessage + contextStr + errorStr);
        }
        break;
      case 'info':
        console.info(formattedMessage + contextStr + errorStr);
        break;
      case 'warn':
        console.warn(formattedMessage + contextStr + errorStr);
        break;
      case 'error':
        console.error(formattedMessage + contextStr + errorStr);
        break;
    }
  }

  /**
   * Log to ELK
   */
  private async logToELK(level: LogLevel, message: string, context?: LogContext, error?: Error | unknown): Promise<void> {
    if (!this.config.enableELK) return;
    
    await this.ensureInitialized();
    
    if (!this.elkLogger) return;

    try {
      const logEntry = this.createLogEntry(level, message, error, context);
      const meta = {
        ...logEntry.context,
        ...(logEntry.error && { error: logEntry.error }),
        service: this.config.serviceName,
        environment: this.config.environment,
      };

      this.elkLogger.log(level, message, meta);
    } catch (err) {
      // If ELK logging fails, don't throw - just log to console
      this.logToConsole('warn', 'Failed to log to ELK', { error: String(err) });
    }
  }

  /**
   * Log to Error Logger (client-side)
   */
  private async logToErrorLogger(level: LogLevel, message: string, error?: Error | unknown, context?: LogContext): Promise<void> {
    if (!this.config.enableErrorLogger || isServer) return;
    
    await this.ensureInitialized();
    
    if (!this.errorLogger) return;

    try {
      if (level === 'error' && error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        this.errorLogger.logError(errorObj, {
          source: context?.source || 'UnifiedLogger',
          severity: context?.severity || 'medium',
          ...context,
        });
      }
    } catch (err) {
      // If error logger fails, don't throw
      this.logToConsole('warn', 'Failed to log to ErrorLogger', { error: String(err) });
    }
  }

  /**
   * Log to Auth Logger (server-side)
   */
  private async logToAuthLogger(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error | unknown
  ): Promise<void> {
    if (!this.config.enableAuthLogger || !isServer) return;
    
    await this.ensureInitialized();
    
    if (!this.authLogger) return;

    try {
      const userId = context?.userId || null;
      const ip = context?.ip || 'unknown';
      const metadata = { ...context, message };

      if (level === 'error') {
        await this.authLogger.error(message, userId, ip, String(error), metadata);
      } else if (level === 'warn') {
        await this.authLogger.warn(message, userId, ip, metadata);
      } else if (level === 'info') {
        await this.authLogger.info(message, userId, ip, metadata);
      } else if (level === 'debug') {
        await this.authLogger.debug(message, userId, ip, metadata);
      }
    } catch (err) {
      // If auth logger fails, don't throw
      this.logToConsole('warn', 'Failed to log to AuthLogger', { error: String(err) });
    }
  }

  /**
   * Log to Security Logger (server-side)
   */
  private async logToSecurityLogger(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): Promise<void> {
    if (!this.config.enableSecurityLogger || !isServer) return;
    if (level !== 'warn' && level !== 'error') return; // Security logger only for warnings and errors
    
    await this.ensureInitialized();
    
    if (!this.securityLogger) return;

    try {
      const userId = context?.userId || 'unknown';
      const ip = context?.ip || 'unknown';
      const userAgent = context?.userAgent || 'unknown';

      if (context?.eventType) {
        await this.securityLogger.logEvent({
          userId,
          eventType: context.eventType as any,
          ip,
          userAgent,
          metadata: context,
        });
      }
    } catch (err) {
      // If security logger fails, don't throw
      this.logToConsole('warn', 'Failed to log to SecurityLogger', { error: String(err) });
    }
  }

  /**
   * Main log method
   */
  private async log(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    context?: LogContext
  ): Promise<void> {
    if (!this.shouldLog(level)) return;

    const logEntry = this.createLogEntry(level, message, error, context);

    // Log to console
    this.logToConsole(level, message, context, error);

    // Log to ELK (server-side, async)
    this.logToELK(level, message, context, error).catch(() => {
      // Silently handle async errors
    });

    // Log to Error Logger (client-side, async)
    this.logToErrorLogger(level, message, error, context).catch(() => {
      // Silently handle async errors
    });

    // Log to Auth Logger (server-side, async)
    if (isServer) {
      await this.logToAuthLogger(level, message, context, error);
    }

    // Log to Security Logger (server-side, async)
    if (isServer) {
      await this.logToSecurityLogger(level, message, context);
    }
  }

  /**
   * Debug log
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, undefined, context).catch(() => {
      // Silently handle async errors
    });
  }

  /**
   * Info log
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, undefined, context).catch(() => {
      // Silently handle async errors
    });
  }

  /**
   * Warn log
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, undefined, context).catch(() => {
      // Silently handle async errors
    });
  }

  /**
   * Error log
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.log('error', message, error, context).catch(() => {
      // Silently handle async errors
    });
  }

  /**
   * HTTP request log
   */
  http(req: {
    method: string;
    url: string;
    statusCode?: number;
    duration?: number;
    ip?: string;
    userAgent?: string;
    userId?: string;
  }): void {
    this.info('HTTP Request', {
      type: 'http',
      method: req.method,
      url: req.url,
      statusCode: req.statusCode,
      duration: req.duration,
      ip: req.ip,
      userAgent: req.userAgent,
      userId: req.userId,
    });
  }

  /**
   * Database query log
   */
  db(query: {
    operation: string;
    table?: string;
    duration: number;
    success: boolean;
    error?: string;
  }): void {
    const level = query.success ? 'info' : 'error';
    this.log(level, 'Database Query', query.error ? new Error(query.error) : undefined, {
      type: 'database',
      operation: query.operation,
      table: query.table,
      duration: query.duration,
      success: query.success,
    }).catch(() => {
      // Silently handle async errors
    });
  }

  /**
   * Authentication event log
   */
  auth(event: {
    type: string;
    userId?: string;
    ip: string;
    success: boolean;
    method?: string;
    error?: string;
  }): void {
    const level = event.success ? 'info' : 'warn';
    this.log(level, 'Authentication Event', event.error ? new Error(event.error) : undefined, {
      type: 'authentication',
      eventType: event.type,
      userId: event.userId,
      ip: event.ip,
      success: event.success,
      method: event.method,
    }).catch(() => {
      // Silently handle async errors
    });
  }

  /**
   * Security event log
   */
  security(event: {
    eventType: string;
    userId?: string;
    ip: string;
    userAgent?: string;
    metadata?: LogContext;
  }): void {
    this.warn('Security Event', {
      type: 'security',
      eventType: event.eventType,
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      ...event.metadata,
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Create singleton instance
let loggerInstance: UnifiedLogger | null = null;

/**
 * Get the unified logger instance
 */
export function getLogger(): UnifiedLogger {
  if (!loggerInstance) {
    loggerInstance = new UnifiedLogger();
  }
  return loggerInstance;
}

// Export singleton instance
export const logger = getLogger();

// Export default
export default logger;


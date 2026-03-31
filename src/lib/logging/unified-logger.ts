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

import { getRequestContext } from './correlation';

// Types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, any>;
export type LoggableContext = LogContext | unknown;

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
  serviceName?: string;
  environment?: string;
}

// Check if we're on the server
const isServer = typeof window === 'undefined';

// Lazy load winston only on server-side
let winstonLoggerInstance: any = null;

async function getWinstonLogger() {
  if (!isServer) return null;

  if (!winstonLoggerInstance) {
    try {
      const winstonModule = await import('winston');
      // Winston can be imported as default or namespace
      const winston = (winstonModule as any).default || winstonModule;

      winstonLoggerInstance = winston.createLogger({
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }: any) => {
            const rid = meta.requestId || meta.context?.requestId || '';
            const ridStr = rid ? ` [RID:${rid.substring(0, 8)}]` : '';
            const metaToLink = { ...meta };
            delete metaToLink.requestId;
            if (metaToLink.context?.requestId) delete metaToLink.context.requestId;
            
            const metaString = Object.keys(metaToLink).length && JSON.stringify(metaToLink) !== "{}" 
                ? `\n${JSON.stringify(metaToLink, null, 2)}` 
                : '';
            
            return `${timestamp} ${level}${ridStr}: ${message}${metaString}`;
          })
        ),
        transports: [
          new winston.transports.Console({
            silent: !isServer,
          }),
        ],
      });
    } catch (err) {
      // If winston fails to load, return null
      return null;
    }
  }

  return winstonLoggerInstance;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  enableConsole: true,
  enableELK: process.env.ELASTICSEARCH_ENABLED !== 'false' && isServer,
  enableErrorLogger: true,
  serviceName: 'thanawy',
  environment: process.env.NODE_ENV || 'development',
};

class UnifiedLogger {
  private config: LoggerConfig;
  private elkLogger: any = null;
  private errorLogger: any = null;
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
      // Initialize ELK logger (server-side only, exclude Edge)
      if (this.config.enableELK && isServer && process.env.NEXT_RUNTIME !== 'edge') {
        try {
          const { elkLogger } = await import('./elk-logger');
          this.elkLogger = elkLogger;
        } catch (error) {
          // ELK logger initialization failed, continue without it
          this.config.enableELK = false;
        }
      }

      // Initialize Error Service (client-side)
      if (this.config.enableErrorLogger && !isServer) {
        try {
          const { errorService } = await import('./error-service');
          this.errorLogger = errorService;
        } catch (error) {
          // Error service initialization failed, continue without it
          this.config.enableErrorLogger = false;
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
    const contextStore = getRequestContext();
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        requestId: context?.requestId || contextStore?.requestId,
      },
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
  private async logToConsole(level: LogLevel, message: string, context?: LogContext, error?: Error | unknown): Promise<void> {
    if (!this.config.enableConsole) return;

    const formattedMessage = this.formatMessage(level, message, context);
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const errorStr = error instanceof Error ? `\nError: ${error.message}${error.stack ? `\n${error.stack}` : ''}` : error ? `\nError: ${String(error)}` : '';

    const fullMessage = formattedMessage + contextStr + errorStr;

    if (isServer) {
      // Use winston on server-side
      try {
        const winstonLogger = await getWinstonLogger();
        if (winstonLogger) {
          switch (level) {
            case 'debug':
              if (process.env.NODE_ENV === 'development') {
                winstonLogger.debug(fullMessage);
              }
              break;
            case 'info':
              winstonLogger.info(fullMessage);
              break;
            case 'warn':
              winstonLogger.warn(fullMessage);
              break;
            case 'error':
              winstonLogger.error(fullMessage);
              break;
          }
        }
      } catch (err) {
        // Fallback to console if winston fails
        switch (level) {
          case 'debug':
            if (process.env.NODE_ENV === 'development') console.debug(fullMessage);
            break;
          case 'info':
            console.info(fullMessage);
            break;
          case 'warn':
            console.warn(fullMessage);
            break;
          case 'error':
            console.error(fullMessage);
            break;
        }
      }
    } else {
      // Use console on client-side
      switch (level) {
        case 'debug':
          if (process.env.NODE_ENV === 'development') {
            console.debug(fullMessage);
          }
          break;
        case 'info':
          console.info(fullMessage);
          break;
        case 'warn':
          console.warn(fullMessage);
          break;
        case 'error':
          console.error(fullMessage);
          break;
      }
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
   * Main log method
   */
  private normalizeContext(context?: LoggableContext): LogContext | undefined {
    if (context === undefined || context === null) {
      return undefined;
    }

    if (context instanceof Error) {
      return {
        error: {
          message: context.message,
          stack: context.stack,
          name: context.name,
        },
      };
    }

    if (typeof context === 'object') {
      if (Array.isArray(context)) {
        return { data: context };
      }

      return context as LogContext;
    }

    return { value: context };
  }

  private async log(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    context?: LoggableContext
  ): Promise<void> {
    if (!this.shouldLog(level)) return;

    const normalizedContext = this.normalizeContext(context);

    const logEntry = this.createLogEntry(level, message, error, normalizedContext);

    // Log to console (async now)
    this.logToConsole(level, message, normalizedContext, error).catch(() => {
      // Silently handle async errors
    });

    // Log to ELK (server-side, async)
    this.logToELK(level, message, normalizedContext, error).catch(() => {
      // Silently handle async errors
    });

    // Log to Error Logger (client-side, async)
    this.logToErrorLogger(level, message, error, normalizedContext).catch(() => {
      // Silently handle async errors
    });
  }

  /**
   * Debug log
   */
  debug(message: string, context?: LoggableContext): void {
    this.log('debug', message, undefined, context).catch(() => {
      // Silently handle async errors
    });
  }

  /**
   * Info log
   */
  info(message: string, context?: LoggableContext): void {
    this.log('info', message, undefined, context).catch(() => {
      // Silently handle async errors
    });
  }

  /**
   * Warn log
   */
  warn(message: string, context?: LoggableContext): void {
    this.log('warn', message, undefined, context).catch(() => {
      // Silently handle async errors
    });
  }

  /**
   * Error log
   */
  error(message: string, error?: Error | unknown, context?: LoggableContext): void {
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
   * Audit log for security-critical actions
   */
  audit(action: string, actor: string, details: LogContext): void {
    this.info(`AUDIT: ${action}`, {
      type: 'audit',
      action,
      actor,
      ...details,
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
    this.log(level, `DB [${query.operation}] ${query.table || ''}`, query.error ? new Error(query.error) : undefined, {
      type: 'database',
      operation: query.operation,
      table: query.table,
      duration: `${query.duration}ms`,
      success: query.success,
    }).catch(() => {
      // Silently handle async errors
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


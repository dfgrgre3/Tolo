import { getRequestContext } from './correlation';
import { sanitizeLogContext, sanitizeErrorMessage, containsSensitiveData } from './sanitizer';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, any>;
type LoggableContext = LogContext | unknown;

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  serviceName?: string;
  environment?: string;
}

const defaultConfig: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  enableConsole: true,
  serviceName: 'thanawy',
  environment: process.env.NODE_ENV || 'development'
};

class UnifiedLogger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: any): string {
    const timestamp = new Date().toISOString();
    const contextStore = getRequestContext();
    const requestId = context?.requestId || contextStore?.requestId;
    const ridStr = requestId ? ` [RID:${requestId.substring(0, 8)}]` : '';
    
    // Sanitize context if sensitive
    let sanitizedContext = context;
    if (context && containsSensitiveData(message, context)) {
      sanitizedContext = sanitizeLogContext(context) as LogContext;
    }
    
    const contextStr = sanitizedContext && Object.keys(sanitizedContext).length > 0
      ? `\nContext: ${JSON.stringify(sanitizedContext, null, 2)}`
      : '';
      
    let errorStr = '';
    if (error !== undefined) {
      if (error instanceof Error) {
        errorStr = `\nError: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
      } else {
        errorStr = `\nError: ${JSON.stringify(error, null, 2)}`;
      }
    }

    return `${timestamp} [${level.toUpperCase()}]${ridStr}: ${message}${contextStr}${errorStr}`;
  }

  private log(level: LogLevel, message: string, error?: Error | unknown, context?: LoggableContext): void {
    if (!this.shouldLog(level)) return;

    let normalizedContext: LogContext | undefined;
    if (context instanceof Error) {
      normalizedContext = { error: { message: context.message, stack: context.stack, name: context.name } };
    } else if (typeof context === 'object' && context !== null) {
      normalizedContext = context as LogContext;
    } else if (context !== undefined) {
      normalizedContext = { value: context };
    }

    const fullMessage = this.formatMessage(level, message, normalizedContext, error);

    if (this.config.enableConsole) {
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
  }

  debug(message: string, context?: LoggableContext): void {
    this.log('debug', message, undefined, context);
  }

  info(message: string, context?: LoggableContext): void {
    this.log('info', message, undefined, context);
  }

  warn(message: string, context?: LoggableContext): void {
    this.log('warn', message, undefined, context);
  }

  error(message: string, error?: Error | unknown, context?: LoggableContext): void {
    this.log('error', message, error, context);
  }

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
      userId: req.userId
    });
  }

  audit(action: string, actor: string, details: LogContext): void {
    this.info(`AUDIT: ${action}`, {
      type: 'audit',
      action,
      actor,
      ...details
    });
  }

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
      success: query.success
    });
  }

  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Create singleton instance
let loggerInstance: UnifiedLogger | null = null;

function getLogger(): UnifiedLogger {
  if (!loggerInstance) {
    loggerInstance = new UnifiedLogger();
  }
  return loggerInstance;
}

const defaultLogger = getLogger();
export { defaultLogger as logger };

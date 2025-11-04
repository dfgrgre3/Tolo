/**
 * Logger utility for server-side logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    let errorMessage = message;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    if (error !== undefined) {
      const errorDetails = error instanceof Error ? error.message : String(error);
      errorMessage = `${message} ${errorDetails}`.trim();
    }
    
    const fullContext = {
      ...context,
      ...(errorStack && { stack: errorStack }),
    };
    
    console.error(this.formatMessage('error', errorMessage, fullContext));
    
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

export const logger = new Logger();
export default logger;


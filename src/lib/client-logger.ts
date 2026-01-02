/**
 * Client-Side Logger
 * مسجل خفيف للعميل (المتصفح) لتجنب استيراد dependecies الخادم
 * 
 * Supports basic logging levels and format
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, any>;

class ClientLogger {
    private level: LogLevel = (process.env.NODE_ENV === 'production' ? 'info' : 'debug') as LogLevel;

    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.level);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }

    private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }

    debug(message: string, context?: LogContext | unknown): void {
        if (!this.shouldLog('debug')) return;
        const msg = this.formatMessage('debug', message);
        if (context) console.debug(msg, context);
        else console.debug(msg);
    }

    info(message: string, context?: LogContext | unknown): void {
        if (!this.shouldLog('info')) return;
        const msg = this.formatMessage('info', message);
        if (context) console.info(msg, context);
        else console.info(msg);
    }

    warn(message: string, context?: LogContext | unknown): void {
        if (!this.shouldLog('warn')) return;
        const msg = this.formatMessage('warn', message);
        if (context) console.warn(msg, context);
        else console.warn(msg);
    }

    error(message: string, error?: Error | unknown, context?: LogContext | unknown): void {
        if (!this.shouldLog('error')) return;
        const msg = this.formatMessage('error', message);
        if (error && context) console.error(msg, error, context);
        else if (error) console.error(msg, error);
        else console.error(msg);
    }
}

export const clientLogger = new ClientLogger();
export default clientLogger;

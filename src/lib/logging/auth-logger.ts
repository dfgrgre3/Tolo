/**
 * Enhanced Authentication Logger
 * Provides structured logging for authentication events
 */

// Don't import auth-service directly to avoid server-only bundling issues
// Will be lazy-loaded when needed (server-side only)

import { elkLoggerHelper as elkLogger } from '@/lib/logging/elk-logger';

export enum AuthLogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
}

export interface AuthLogEntry {
  timestamp: Date;
  level: AuthLogLevel;
  event: string;
  userId?: string | null;
  ip: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  error?: string;
  duration?: number; // Duration in milliseconds
}

export class AuthLogger {
  private static instance: AuthLogger;
  private logs: AuthLogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  private constructor() {
    // Cleanup old logs periodically
    setInterval(() => this.cleanup(), 60 * 1000); // Every minute
  }

  public static getInstance(): AuthLogger {
    if (!AuthLogger.instance) {
      AuthLogger.instance = new AuthLogger();
    }
    return AuthLogger.instance;
  }

  /**
   * Log authentication event
   */
  async log(
    level: AuthLogLevel,
    event: string,
    userId: string | null,
    ip: string,
    metadata?: Record<string, any>,
    error?: string
  ): Promise<void> {
    const logEntry: AuthLogEntry = {
      timestamp: new Date(),
      level,
      event,
      userId,
      ip,
      userAgent: metadata?.userAgent,
      metadata,
      error,
    };

    // Store in memory
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest
    }

    // Also log to security log (database) - lazy load to avoid server-only bundling
    if (typeof window === 'undefined') {
      try {
        // Use string concatenation to prevent webpack from statically analyzing the import
        const authServiceModule = await import('../services/' + 'auth-service');
        await authServiceModule.authService.logSecurityEvent(userId, event, ip, {
          ...metadata,
          level,
          error,
        });
      } catch (dbError) {
        // Don't fail if DB logging fails, but log it
        elkLogger.error('Failed to log to database', dbError instanceof Error ? dbError : new Error(String(dbError)), {
          context: 'auth-logger',
          userId,
          event,
          ip,
        });
      }
    }

    // Log to ELK logger based on level
    const logMeta = {
      type: 'authentication',
      event,
      userId,
      ip,
      userAgent: metadata?.userAgent,
      ...metadata,
    };

    switch (level) {
      case AuthLogLevel.ERROR:
        elkLogger.error(
          `[Auth] ${event}${userId ? ` - User: ${userId}` : ''} - IP: ${ip}`,
          error ? new Error(error) : undefined,
          logMeta
        );
        break;
      case AuthLogLevel.WARN:
        elkLogger.warn(`[Auth] ${event}${userId ? ` - User: ${userId}` : ''} - IP: ${ip}`, logMeta);
        break;
      case AuthLogLevel.DEBUG:
        if (process.env.NODE_ENV === 'development') {
          elkLogger.debug(`[Auth] ${event}${userId ? ` - User: ${userId}` : ''} - IP: ${ip}`, logMeta);
        }
        break;
      default:
        elkLogger.info(`[Auth] ${event}${userId ? ` - User: ${userId}` : ''} - IP: ${ip}`, logMeta);
    }
  }

  /**
   * Log info event
   */
  async info(event: string, userId: string | null, ip: string, metadata?: Record<string, any>): Promise<void> {
    return this.log(AuthLogLevel.INFO, event, userId, ip, metadata);
  }

  /**
   * Log warning event
   */
  async warn(event: string, userId: string | null, ip: string, metadata?: Record<string, any>): Promise<void> {
    return this.log(AuthLogLevel.WARN, event, userId, ip, metadata);
  }

  /**
   * Log error event
   */
  async error(event: string, userId: string | null, ip: string, error: string, metadata?: Record<string, any>): Promise<void> {
    return this.log(AuthLogLevel.ERROR, event, userId, ip, metadata, error);
  }

  /**
   * Log debug event
   */
  async debug(event: string, userId: string | null, ip: string, metadata?: Record<string, any>): Promise<void> {
    return this.log(AuthLogLevel.DEBUG, event, userId, ip, metadata);
  }

  /**
   * Time an operation and log it
   */
  async time<T>(
    event: string,
    userId: string | null,
    ip: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      await this.log(
        AuthLogLevel.INFO,
        event,
        userId,
        ip,
        { ...metadata, duration },
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.log(
        AuthLogLevel.ERROR,
        `${event}_failed`,
        userId,
        ip,
        { ...metadata, duration },
        errorMessage
      );

      throw error;
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 100): AuthLogEntry[] {
    return this.logs.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Get logs by event type
   */
  getLogsByEvent(event: string, limit: number = 100): AuthLogEntry[] {
    return this.logs
      .filter(log => log.event === event)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get logs by user
   */
  getLogsByUser(userId: string, limit: number = 100): AuthLogEntry[] {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get logs by IP
   */
  getLogsByIP(ip: string, limit: number = 100): AuthLogEntry[] {
    return this.logs
      .filter(log => log.ip === ip)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get error logs
   */
  getErrorLogs(limit: number = 100): AuthLogEntry[] {
    return this.logs
      .filter(log => log.level === AuthLogLevel.ERROR)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byLevel: Record<AuthLogLevel, number>;
    byEvent: Record<string, number>;
    recentErrors: number;
  } {
    const byLevel: Record<AuthLogLevel, number> = {
      [AuthLogLevel.INFO]: 0,
      [AuthLogLevel.WARN]: 0,
      [AuthLogLevel.ERROR]: 0,
      [AuthLogLevel.DEBUG]: 0,
    };

    const byEvent: Record<string, number> = {};
    let recentErrors = 0;

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const log of this.logs) {
      byLevel[log.level]++;
      byEvent[log.event] = (byEvent[log.event] || 0) + 1;

      if (log.level === AuthLogLevel.ERROR && log.timestamp.getTime() > oneHourAgo) {
        recentErrors++;
      }
    }

    return {
      total: this.logs.length,
      byLevel,
      byEvent,
      recentErrors,
    };
  }

  /**
   * Cleanup old logs
   */
  private cleanup(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.logs = this.logs.filter(log => log.timestamp.getTime() > oneDayAgo);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }
}

// Export singleton instance
export const authLogger = AuthLogger.getInstance();


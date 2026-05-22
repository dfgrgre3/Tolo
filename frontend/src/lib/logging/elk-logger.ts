/**
 * ELK Stack Logger Service
 * 
 * هذا الملف يوفر تكامل مع Elasticsearch, Logstash, Kibana (ELK Stack)
 * جميع السجلات تُصدر بصيغة JSON متوافقة مع ELK
 * 
 * NOTE: This file uses server-only dependencies (winston)
 * It should only be imported dynamically on the server side
 */

import winston from 'winston';

// Fallback to console if needed to avoid circular dependencies with unified-logger
const fallbackLogger = console;

// تكوين Elasticsearch

// تنسيق JSON للسجلات
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      '@timestamp': timestamp,
      level,
      message,
      service: 'thanawy',
      environment: process.env.NODE_ENV || 'development',
      ...meta,
    });
  })
);

// Elasticsearch logging is handled by the Go backend.
// This logger is kept as a client-side fallback for structured logging.

// إنشاء Winston logger
const transports: winston.transport[] = [];

export const elkLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Helper functions للاستخدام السهل
// Note: This is elkLoggerHelper, NOT logger, to avoid conflict with unified-logger
const elkLoggerHelper = {
  info: (message: string, meta?: Record<string, any>) => {
    try {
      elkLogger.info(message, meta || {});
    } catch (error) {
      // Fallback to fallback logger if ELK logger fails
      fallbackLogger.info(`[ELK Logger Error] ${message}`, { ...meta, error });
    }
  },

  error: (message: string, error?: Error | unknown, meta?: Record<string, any>) => {
    try {
      const errorMeta = {
        ...meta,
        ...(error instanceof Error
          ? {
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
          }
          : error
            ? { error: String(error) }
            : {}),
      };
      elkLogger.error(message, errorMeta);
    } catch (err) {
      // Fallback to fallback logger if ELK logger fails
      fallbackLogger.error(`[ELK Logger Error] ${message}`, err, { ...meta, originalError: error });
    }
  },

  warn: (message: string, meta?: Record<string, any>) => {
    try {
      elkLogger.warn(message, meta || {});
    } catch (error) {
      // Fallback to fallback logger if ELK logger fails
      fallbackLogger.warn(`[ELK Logger Error] ${message}`, { ...meta, error });
    }
  },

  debug: (message: string, meta?: Record<string, any>) => {
    try {
      elkLogger.debug(message, meta || {});
    } catch (error) {
      // Fallback to fallback logger if ELK logger fails
      fallbackLogger.debug(`[ELK Logger Error] ${message}`, { ...meta, error });
    }
  },

  // Log HTTP requests
  http: (req: {
    method: string;
    url: string;
    statusCode?: number;
    duration?: number;
    ip?: string;
    userAgent?: string;
    userId?: string;
  }) => {
    try {
      elkLogger.info('HTTP Request', {
        type: 'http',
        method: req.method,
        url: req.url,
        statusCode: req.statusCode,
        duration: req.duration,
        ip: req.ip,
        userAgent: req.userAgent,
        userId: req.userId,
      });
    } catch (error) {
      // Fallback to fallback logger if ELK logger fails
      fallbackLogger.info(`[ELK Logger Error] HTTP Request`, { ...req, error });
    }
  },

  // Log database queries
  db: (query: {
    operation: string;
    table?: string;
    duration: number;
    success: boolean;
    error?: string;
  }) => {
    try {
      const level = query.success ? 'info' : 'error';
      elkLogger.log(level, 'Database Query', {
        type: 'database',
        operation: query.operation,
        table: query.table,
        duration: query.duration,
        success: query.success,
        error: query.error,
      });
    } catch (error) {
      // Fallback to fallback logger if ELK logger fails
      if (query.success) {
        fallbackLogger.info(`[ELK Logger Error] Database Query`, { ...query, error });
      } else {
        fallbackLogger.error(`[ELK Logger Error] Database Query`, error, query);
      }
    }
  },

  // Log authentication events
  auth: (event: {
    type: string;
    userId?: string;
    ip: string;
    success: boolean;
    method?: string;
    error?: string;
  }) => {
    try {
      const level = event.success ? 'info' : 'warn';
      elkLogger.log(level, 'Authentication Event', {
        type: 'authentication',
        eventType: event.type,
        userId: event.userId,
        ip: event.ip,
        success: event.success,
        method: event.method,
        error: event.error,
      });
    } catch (error) {
      // Fallback to fallback logger if ELK logger fails
      if (event.success) {
        fallbackLogger.info(`[ELK Logger Error] Authentication Event`, { ...event, error });
      } else {
        fallbackLogger.warn(`[ELK Logger Error] Authentication Event`, { ...event, error });
      }
    }
  },
};

// Note: Use elkLogger or elkLoggerHelper to avoid name conflicts with unified-logger
// For backward compatibility, import elkLoggerHelper directly
// IMPORTANT: This file does NOT export 'logger' to avoid conflicts with unified-logger.ts




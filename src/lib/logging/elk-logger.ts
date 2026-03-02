/**
 * ELK Stack Logger Service
 * 
 * هذا الملف يوفر تكامل مع Elasticsearch, Logstash, Kibana (ELK Stack)
 * جميع السجلات تُصدر بصيغة JSON متوافقة مع ELK
 * 
 * NOTE: This file uses server-only dependencies (winston, winston-elasticsearch)
 * It should only be imported dynamically on the server side
 */

import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { Client } from '@elastic/elasticsearch';

// Fallback to console if needed to avoid circular dependencies with unified-logger
const fallbackLogger = console;

// تكوين Elasticsearch
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
  auth: process.env.ELASTICSEARCH_AUTH
    ? {
      username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
      password: process.env.ELASTICSEARCH_PASSWORD || '',
    }
    : undefined,
  tls: process.env.ELASTICSEARCH_SSL === 'true'
    ? {
      rejectUnauthorized: false,
    }
    : undefined,
});

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

// Console transport للتطوير
const consoleTransport = new winston.transports.Console({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level}]: ${message}${metaString ? '\n' + metaString : ''}`;
    })
  ),
});

// Elasticsearch transport
let elasticsearchTransport: ElasticsearchTransport | null = null;

if (process.env.ELASTICSEARCH_ENABLED !== 'false') {
  try {
    elasticsearchTransport = new ElasticsearchTransport({
      client: esClient as any,
      index: `thanawy-logs-${process.env.NODE_ENV || 'development'}`,
      transformer: (logData) => {
        return {
          '@timestamp': logData.timestamp,
          level: logData.level,
          message: logData.message,
          service: 'thanawy',
          environment: process.env.NODE_ENV || 'development',
          ...logData.meta,
        };
      },
      bufferLimit: 100,
      flushInterval: 2000,
      apm: undefined as any,
    });
  } catch (error) {
    // Use fallback logger to avoid circular dependency
    fallbackLogger.error('Failed to initialize Elasticsearch transport:', error);
  }
}

// إنشاء Winston logger
const transports: winston.transport[] = [consoleTransport];

if (elasticsearchTransport) {
  transports.push(elasticsearchTransport);
}

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
export const elkLoggerHelper = {
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

export default elkLogger;


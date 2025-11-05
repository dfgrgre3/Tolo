/**
 * ELK Stack Logger Service
 * 
 * هذا الملف يوفر تكامل مع Elasticsearch, Logstash, Kibana (ELK Stack)
 * جميع السجلات تُصدر بصيغة JSON متوافقة مع ELK
 */

import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { Client } from '@elastic/elasticsearch';

// تكوين Elasticsearch
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
  auth: process.env.ELASTICSEARCH_AUTH
    ? {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || '',
      }
    : undefined,
  ssl: process.env.ELASTICSEARCH_SSL === 'true'
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
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
});

// Elasticsearch transport
let elasticsearchTransport: ElasticsearchTransport | null = null;

if (process.env.ELASTICSEARCH_ENABLED !== 'false') {
  try {
    elasticsearchTransport = new ElasticsearchTransport({
      client: esClient,
      index: `thanawy-logs-${process.env.NODE_ENV || 'development'}`,
      indexTemplate: {
        template: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
        },
      },
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
    });
  } catch (error) {
    console.error('Failed to initialize Elasticsearch transport:', error);
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
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    elkLogger.info(message, meta);
  },

  error: (message: string, error?: Error | unknown, meta?: Record<string, any>) => {
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
  },

  warn: (message: string, meta?: Record<string, any>) => {
    elkLogger.warn(message, meta);
  },

  debug: (message: string, meta?: Record<string, any>) => {
    elkLogger.debug(message, meta);
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
  },

  // Log database queries
  db: (query: {
    operation: string;
    table?: string;
    duration: number;
    success: boolean;
    error?: string;
  }) => {
    const level = query.success ? 'info' : 'error';
    elkLogger.log(level, 'Database Query', {
      type: 'database',
      operation: query.operation,
      table: query.table,
      duration: query.duration,
      success: query.success,
      error: query.error,
    });
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
  },
};

export default elkLogger;


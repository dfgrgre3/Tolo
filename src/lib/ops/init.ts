/**
 * Ops Initialization
 * 
 * تهيئة جميع خدمات Ops عند بدء التطبيق
 */

import { initializeTracer } from '@/lib/tracing/jaeger-tracer';
import { validateOpsConfig } from './config';

import { logger } from '@/lib/logger';

/**
 * تهيئة جميع خدمات Ops
 */
export function initializeOps(): void {
  // التحقق من التكوين
  const validation = validateOpsConfig();
  if (!validation.valid) {
    logger.warn('Ops configuration validation failed:', validation.errors);
    logger.warn('Some Ops features may not work correctly');
  }

  // تهيئة Jaeger Tracing
  if (process.env.JAEGER_ENABLED !== 'false') {
    initializeTracer()
      .then(() => {
        logger.info('✅ Jaeger tracing initialized');
      })
      .catch((error) => {
        logger.error('❌ Failed to initialize Jaeger tracing:', error);
      });
  } else {
    logger.info('ℹ️  Jaeger tracing is disabled');
  }

  // ELK logging يتم تهيئته تلقائياً عند استيراد elk-logger
  if (process.env.ELASTICSEARCH_ENABLED !== 'false') {
    logger.info('✅ ELK logging is enabled');
  } else {
    logger.info('ℹ️  ELK logging is disabled');
  }

  // Prometheus metrics يتم تهيئتها تلقائياً عند استيراد prometheus.ts
  if (process.env.PROMETHEUS_ENABLED !== 'false') {
    logger.info('✅ Prometheus metrics are enabled');
  } else {
    logger.info('ℹ️  Prometheus metrics are disabled');
  }

  logger.info('✅ Ops services initialized');
}

// تهيئة تلقائية عند تحميل الملف (server-side only)
if (typeof window === 'undefined') {
  initializeOps();
}


/**
 * Ops Initialization
 * 
 * تهيئة جميع خدمات Ops عند بدء التطبيق
 */

import { initializeTracer } from '@/lib/tracing/jaeger-tracer';
import { validateOpsConfig } from './config';

/**
 * تهيئة جميع خدمات Ops
 */
export function initializeOps(): void {
  // التحقق من التكوين
  const validation = validateOpsConfig();
  if (!validation.valid) {
    console.warn('Ops configuration validation failed:', validation.errors);
    console.warn('Some Ops features may not work correctly');
  }

  // تهيئة Jaeger Tracing
  if (process.env.JAEGER_ENABLED !== 'false') {
    try {
      initializeTracer();
      console.log('✅ Jaeger tracing initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Jaeger tracing:', error);
    }
  } else {
    console.log('ℹ️  Jaeger tracing is disabled');
  }

  // ELK logging يتم تهيئته تلقائياً عند استيراد elk-logger
  if (process.env.ELASTICSEARCH_ENABLED !== 'false') {
    console.log('✅ ELK logging is enabled');
  } else {
    console.log('ℹ️  ELK logging is disabled');
  }

  // Prometheus metrics يتم تهيئتها تلقائياً عند استيراد prometheus.ts
  if (process.env.PROMETHEUS_ENABLED !== 'false') {
    console.log('✅ Prometheus metrics are enabled');
  } else {
    console.log('ℹ️  Prometheus metrics are disabled');
  }

  console.log('✅ Ops services initialized');
}

// تهيئة تلقائية عند تحميل الملف (server-side only)
if (typeof window === 'undefined') {
  initializeOps();
}


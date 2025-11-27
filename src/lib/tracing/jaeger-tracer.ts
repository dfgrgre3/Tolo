/**
 * Jaeger Tracing Service
 * 
 * هذا الملف يوفر Distributed Tracing مع Jaeger
 * يستخدم OpenTelemetry API للتوافق مع Jaeger
 */

import { trace, Span, SpanStatusCode, context, propagation, Context } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
// JaegerExporter is imported dynamically to avoid loading issues
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PrismaInstrumentation } from '@prisma/instrumentation';

import { logger } from '@/lib/logger';

// متغيرات التكوين
const JAEGER_ENABLED = process.env.JAEGER_ENABLED !== 'false';
const JAEGER_AGENT_HOST = process.env.JAEGER_AGENT_HOST || 'jaeger';
const JAEGER_AGENT_PORT = parseInt(process.env.JAEGER_AGENT_PORT || '6831', 10);
const SERVICE_NAME = process.env.SERVICE_NAME || 'thanawy';

let tracer: ReturnType<typeof trace.getTracer> | null = null;
let provider: NodeTracerProvider | null = null;

// تهيئة Tracer
export async function initializeTracer(): Promise<void> {
  if (!JAEGER_ENABLED) {
    logger.info('Jaeger tracing is disabled');
    return;
  }

  try {
    // استيراد ديناميكي لـ JaegerExporter لتجنب مشاكل التحميل
    let JaegerExporter: any;
    try {
      const jaegerModule = await import('@opentelemetry/exporter-jaeger');
      JaegerExporter = jaegerModule.JaegerExporter;
    } catch (importError: any) {
      logger.warn('Jaeger exporter not available, disabling tracing:', importError?.message);
      return;
    }

    // إنشاء Resource
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });

    // إنشاء Tracer Provider
    provider = new NodeTracerProvider({
      resource,
    });

    // إنشاء Jaeger Exporter
    const jaegerExporter = new JaegerExporter({
      endpoint: `http://${JAEGER_AGENT_HOST}:14268/api/traces`,
      // أو استخدام UDP:
      // agentHost: JAEGER_AGENT_HOST,
      // agentPort: JAEGER_AGENT_PORT,
    });

    // إضافة Batch Span Processor
    provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));

    // تسجيل Tracer Provider
    provider.register();

    // تسجيل Instrumentations
    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation({
          enabled: true,
        }),
        new ExpressInstrumentation({
          enabled: true,
        }),
        new PrismaInstrumentation({
          enabled: true,
        }),
      ],
    });

    // الحصول على Tracer
    tracer = trace.getTracer(SERVICE_NAME);

    logger.info('Jaeger tracing initialized successfully');
  } catch (error: any) {
    logger.error('Failed to initialize Jaeger tracing:', error?.message || error);
    // لا نرمي خطأ حتى لا نؤثر على التطبيق
    // تعطيل Jaeger تلقائياً في حالة الفشل
    if (error?.code === 'ENOENT' || error?.message?.includes('jaeger') || error?.message?.includes('thrift')) {
      logger.warn('Jaeger dependencies missing, tracing will be disabled');
    }
  }
}

// الحصول على Tracer
export function getTracer() {
  if (!tracer) {
    // إنشاء tracer بسيط بدون Jaeger
    tracer = trace.getTracer(SERVICE_NAME);
  }
  return tracer;
}

// إنشاء Span جديد
export function startSpan(name: string, options?: { attributes?: Record<string, any> }): Span {
  const tracerInstance = getTracer();
  const span = tracerInstance.startSpan(name, {
    attributes: options?.attributes || {},
  });
  return span;
}

// إنشاء Span مع context
export function startSpanWithContext(
  name: string,
  parentContext: unknown,
  options?: { attributes?: Record<string, unknown> }
): Span {
  const tracerInstance = getTracer();
  const span = tracerInstance.startSpan(name, {
    attributes: (options?.attributes || {}) as unknown as import('@opentelemetry/api').SpanAttributes,
  }, parentContext as Context);
  return span;
}

// Helper function لتتبع async operations
export async function traceAsync<T>(
  name: string,
  operation: (span: Span) => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const tracerInstance = getTracer();
  return tracerInstance.startActiveSpan(name, {
    attributes: attributes || {},
  }, async (span) => {
    try {
      const result = await operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  });
}

// Helper function لتتبع synchronous operations
export function traceSync<T>(
  name: string,
  operation: (span: Span) => T,
  attributes?: Record<string, any>
): T {
  const tracerInstance = getTracer();
  return tracerInstance.startActiveSpan(name, {
    attributes: attributes || {},
  }, (span) => {
    try {
      const result = operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  });
}

// Extract context from headers (للـ HTTP requests)
export function extractContext(headers: Record<string, string | string[] | undefined>): any {
  const carrier: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      carrier[key] = Array.isArray(value) ? value[0] : value;
    }
  }
  
  return propagation.extract(context.active(), carrier);
}

// Inject context into headers (للـ HTTP requests)
export function injectContext(headers: Record<string, string>): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return { ...headers, ...carrier };
}

// Shutdown tracer
export async function shutdownTracer(): Promise<void> {
  if (provider) {
    await provider.shutdown();
    provider = null;
    tracer = null;
  }
}

// تهيئة تلقائية إذا كان التطبيق يعمل
if (typeof window === 'undefined') {
  // تهيئة غير متزامنة لتجنب مشاكل التحميل
  initializeTracer().catch((error) => {
    logger.error('Failed to auto-initialize tracer:', error);
  });
}


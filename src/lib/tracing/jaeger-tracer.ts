/**
 * Jaeger Tracing Service (Server-side only)
 * 
 * NOTE: All OpenTelemetry imports are fully dynamic at runtime.
 * This file uses 'any' types intentionally to avoid build errors
 * when optional OpenTelemetry packages are not installed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Server-side only guard
const isServer = typeof window === 'undefined';
const JAEGER_ENABLED = isServer && process.env.JAEGER_ENABLED === 'true';
const JAEGER_AGENT_HOST = process.env.JAEGER_AGENT_HOST || 'jaeger';
const SERVICE_NAME = process.env.SERVICE_NAME || 'thanawy';

// Stub span - used when tracing is disabled
const stubSpan: any = {
  setStatus: () => { },
  recordException: () => { },
  end: () => { },
  setAttribute: () => { },
  addEvent: () => { },
};

// Stub tracer
const stubTracer: any = {
  startSpan: () => stubSpan,
  startActiveSpan: (_name: string, _opts: any, fn?: any) => {
    const cb = typeof _opts === 'function' ? _opts : fn;
    if (typeof cb === 'function') return cb(stubSpan);
    return undefined;
  },
};

let _tracer: any = stubTracer;
let _provider: any = null;

/**
 * Initialize Jaeger tracing (server-side only, optional)
 */
export async function initializeTracer(): Promise<void> {
  if (!isServer || !JAEGER_ENABLED) return;

  try {
    // Fully dynamic imports - gracefully handle missing packages
    const apiModule = await import('@opentelemetry/api' as any).catch(() => null);
    const resourcesModule = await import('@opentelemetry/resources' as any).catch(() => null);
    const sdkNodeModule = await import('@opentelemetry/sdk-trace-node' as any).catch(() => null);
    const sdkBaseModule = await import('@opentelemetry/sdk-trace-base' as any).catch(() => null);

    if (!apiModule || !resourcesModule || !sdkNodeModule || !sdkBaseModule) {
      console.warn('[Tracing] OpenTelemetry packages not available, disabling tracing');
      return;
    }

    const jaegerModule = await import('@opentelemetry/exporter-jaeger' as any).catch(() => null);
    if (!jaegerModule) {
      console.warn('[Tracing] Jaeger exporter not available, disabling tracing');
      return;
    }

    const { trace } = apiModule;
    const { Resource } = resourcesModule;
    const { NodeTracerProvider } = sdkNodeModule;
    const { BatchSpanProcessor } = sdkBaseModule;
    const { JaegerExporter } = jaegerModule;

    const resource = new Resource({
      'service.name': SERVICE_NAME,
      'service.version': process.env.npm_package_version || '1.0.0',
      'deployment.environment': process.env.NODE_ENV || 'development',
    });

    _provider = new NodeTracerProvider({ resource });

    const jaegerExporter = new JaegerExporter({
      endpoint: `http://${JAEGER_AGENT_HOST}:14268/api/traces`,
    });

    _provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));
    _provider.register();

    // Optional instrumentations
    const instrModule = await import('@opentelemetry/instrumentation' as any).catch(() => null);
    if (instrModule) {
      const instrumentations: any[] = [];

      const httpModule = await import('@opentelemetry/instrumentation-http' as any).catch(() => null);
      if (httpModule?.HttpInstrumentation) {
        instrumentations.push(new httpModule.HttpInstrumentation({ enabled: true }));
      }

      const expressModule = await import('@opentelemetry/instrumentation-express' as any).catch(() => null);
      if (expressModule?.ExpressInstrumentation) {
        instrumentations.push(new expressModule.ExpressInstrumentation({ enabled: true }));
      }

      const prismaModule = await import('@prisma/instrumentation' as any).catch(() => null);
      if (prismaModule?.PrismaInstrumentation) {
        instrumentations.push(new prismaModule.PrismaInstrumentation({ enabled: true }));
      }

      if (instrumentations.length > 0) {
        instrModule.registerInstrumentations({ instrumentations });
      }
    }

    _tracer = trace.getTracer(SERVICE_NAME);
    console.info('[Tracing] Jaeger tracing initialized successfully');
  } catch (error: unknown) {
    console.warn('[Tracing] Failed to initialize Jaeger tracing:', (error as any)?.message || String(error));
  }
}

/** Get the active tracer (stub when disabled) */
export function getTracer() {
  return _tracer;
}

/** Start a new span */
export function startSpan(name: string, options?: { attributes?: Record<string, unknown> }): any {
  return _tracer.startSpan(name, { attributes: (options?.attributes || {}) as any });
}

/** Trace an async operation */
export async function traceAsync<T>(
  name: string,
  operation: (span: any) => Promise<T>,
  attributes?: Record<string, unknown>
): Promise<T> {
  if (!isServer || !JAEGER_ENABLED) {
    return operation(stubSpan);
  }
  return _tracer.startActiveSpan(name, { attributes: (attributes || {}) as any }, async (span: any) => {
    try {
      const result = await operation(span);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  });
}

/** Trace a synchronous operation */
export function traceSync<T>(
  name: string,
  operation: (span: any) => T,
  attributes?: Record<string, unknown>
): T {
  if (!isServer || !JAEGER_ENABLED) {
    return operation(stubSpan);
  }
  return _tracer.startActiveSpan(name, { attributes: (attributes || {}) as any }, (span: any) => {
    try {
      const result = operation(span);
      span.setStatus({ code: 1 });
      return result;
    } catch (error) {
      span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  });
}

/** Extract trace context from HTTP headers */
export function extractContext(_headers: Record<string, string | string[] | undefined>): any {
  return undefined;
}

/** Inject trace context into HTTP headers */
export function injectContext(headers: Record<string, string>): Record<string, string> {
  return headers;
}

/** Gracefully shut down the tracer */
export async function shutdownTracer(): Promise<void> {
  if (_provider) {
    try {
      await _provider.shutdown();
    } catch {
      // ignore shutdown errors
    }
    _provider = null;
    _tracer = stubTracer;
  }
}

// Auto-initialize only when explicitly enabled
if (isServer && JAEGER_ENABLED) {
  initializeTracer().catch((error) => {
    console.warn('[Tracing] Auto-init failed:', error);
  });
}

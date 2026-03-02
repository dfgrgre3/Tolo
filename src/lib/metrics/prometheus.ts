/**
 * Prometheus Metrics Service (Server-side only)
 * 
 * هذا الملف يوفر تصدير المقاييس (Metrics) لـ Prometheus
 * يدعم Next.js ويصدر المقاييس في صيغة Prometheus exposition format
 */

// This module is server-side only - never import on client
const isServer = typeof window === 'undefined';

// Lazy-loaded prom-client types
type Registry = any;
type Counter = any;
type Histogram = any;
type Gauge = any;

// Stub implementations for client-side (tree-shaken in production)
const createStub = () => ({
  inc: () => { },
  observe: () => { },
  set: () => { },
  metrics: async () => '',
  getMetricsAsJSON: async () => [],
  resetMetrics: () => { },
});

let _register: Registry = createStub();
let _httpRequestsTotal: Counter = createStub();
let _httpRequestDuration: Histogram = createStub();
let _httpRequestSize: Histogram = createStub();
let _httpResponseSize: Histogram = createStub();
let _dbQueriesTotal: Counter = createStub();
let _dbQueryDuration: Histogram = createStub();
let _dbConnectionsActive: Gauge = createStub();
let _redisOperationsTotal: Counter = createStub();
let _redisOperationDuration: Histogram = createStub();
let _authLoginsTotal: Counter = createStub();
let _authOperationsTotal: Counter = createStub();
let _activeUsers: Gauge = createStub();
let _errorsTotal: Counter = createStub();

// Initialize only on server
if (isServer) {
  try {
    // Dynamic require to prevent client bundling
    const promClient = require('prom-client');
    const { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } = promClient;

    _register = new Registry();
    collectDefaultMetrics({ register: _register });

    _httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [_register],
    });

    _httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [_register],
    });

    _httpRequestSize = new Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 5000, 10000, 50000, 100000],
      registers: [_register],
    });

    _httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 5000, 10000, 50000, 100000, 1000000],
      registers: [_register],
    });

    _dbQueriesTotal = new Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table', 'status'],
      registers: [_register],
    });

    _dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [_register],
    });

    _dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [_register],
    });

    _redisOperationsTotal = new Counter({
      name: 'redis_operations_total',
      help: 'Total number of Redis operations',
      labelNames: ['operation', 'status'],
      registers: [_register],
    });

    _redisOperationDuration = new Histogram({
      name: 'redis_operation_duration_seconds',
      help: 'Duration of Redis operations in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
      registers: [_register],
    });

    _authLoginsTotal = new Counter({
      name: 'auth_logins_total',
      help: 'Total number of login attempts',
      labelNames: ['status', 'method'],
      registers: [_register],
    });

    _authOperationsTotal = new Counter({
      name: 'auth_operations_total',
      help: 'Total number of authentication operations',
      labelNames: ['operation', 'status'],
      registers: [_register],
    });

    _activeUsers = new Gauge({
      name: 'active_users',
      help: 'Number of active users',
      registers: [_register],
    });

    _errorsTotal = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'route'],
      registers: [_register],
    });
  } catch {
    // prom-client not available, use stubs
  }
}

export const register = _register;
export const httpRequestsTotal = _httpRequestsTotal;
export const httpRequestDuration = _httpRequestDuration;
export const httpRequestSize = _httpRequestSize;
export const httpResponseSize = _httpResponseSize;
export const dbQueriesTotal = _dbQueriesTotal;
export const dbQueryDuration = _dbQueryDuration;
export const dbConnectionsActive = _dbConnectionsActive;
export const redisOperationsTotal = _redisOperationsTotal;
export const redisOperationDuration = _redisOperationDuration;
export const authLoginsTotal = _authLoginsTotal;
export const authOperationsTotal = _authOperationsTotal;
export const activeUsers = _activeUsers;
export const errorsTotal = _errorsTotal;

/**
 * تصدير المقاييس بصيغة Prometheus
 */
export async function getMetrics(): Promise<string> {
  if (!isServer) return '';
  return _register.metrics();
}

/**
 * الحصول على جميع المقاييس بصيغة JSON
 */
export async function getMetricsAsJSON() {
  if (!isServer) return [];
  return _register.getMetricsAsJSON();
}

/**
 * إعادة تعيين المقاييس
 */
export function resetMetrics(): void {
  if (!isServer) return;
  _register.resetMetrics();
}

/**
 * Middleware لتتبع الطلبات HTTP
 */
export function trackHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  duration: number,
  requestSize?: number,
  responseSize?: number
): void {
  if (!isServer) return;
  const routeLabel = normalizeRoute(route);

  _httpRequestsTotal.inc({ method, route: routeLabel, status_code: statusCode });
  _httpRequestDuration.observe({ method, route: routeLabel, status_code: statusCode }, duration / 1000);

  if (requestSize !== undefined) {
    _httpRequestSize.observe({ method, route: routeLabel }, requestSize);
  }

  if (responseSize !== undefined) {
    _httpResponseSize.observe({ method, route: routeLabel, status_code: statusCode }, responseSize);
  }

  if (statusCode >= 400) {
    const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
    _errorsTotal.inc({ type: errorType, route: routeLabel });
  }
}

/**
 * تتبع استعلامات قاعدة البيانات
 */
export function trackDbQuery(
  operation: string,
  table: string,
  duration: number,
  status: 'success' | 'error'
): void {
  if (!isServer) return;
  _dbQueriesTotal.inc({ operation, table, status });
  _dbQueryDuration.observe({ operation, table }, duration / 1000);

  if (status === 'error') {
    _errorsTotal.inc({ type: 'database_error', route: 'db' });
  }
}

/**
 * تتبع عمليات Redis
 */
export function trackRedisOperation(
  operation: string,
  duration: number,
  status: 'success' | 'error'
): void {
  if (!isServer) return;
  _redisOperationsTotal.inc({ operation, status });
  _redisOperationDuration.observe({ operation }, duration / 1000);

  if (status === 'error') {
    _errorsTotal.inc({ type: 'redis_error', route: 'redis' });
  }
}

/**
 * تحديث عدد اتصالات قاعدة البيانات النشطة
 */
export function setDbConnections(count: number): void {
  if (!isServer) return;
  _dbConnectionsActive.set(count);
}

/**
 * تحديث عدد المستخدمين النشطين
 */
export function setActiveUsers(count: number): void {
  if (!isServer) return;
  _activeUsers.set(count);
}

/**
 * تطبيع مسار الطلب لإزالة المعاملات الديناميكية
 */
function normalizeRoute(route: string): string {
  const path = route.split('?')[0];
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  let normalized = path.replace(uuidPattern, ':id');
  normalized = normalized.replace(/\/\d+/g, '/:id');
  return normalized;
}

/**
 * Prometheus Metrics Service
 * 
 * هذا الملف يوفر تصدير المقاييس (Metrics) لـ Prometheus
 * يدعم Next.js ويصدر المقاييس في صيغة Prometheus exposition format
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// إنشاء registry عام للمقاييس
const register = new Registry();

// جمع المقاييس الافتراضية (CPU, Memory, etc.)
collectDefaultMetrics({ register });

// ==================== HTTP Metrics ====================

// عداد الطلبات الإجمالية
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// زمن استجابة HTTP
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// حجم الطلبات
export const httpRequestSize = new Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 5000, 10000, 50000, 100000],
  registers: [register],
});

// حجم الاستجابات
export const httpResponseSize = new Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 1000000],
  registers: [register],
});

// ==================== Database Metrics ====================

// عدد استعلامات قاعدة البيانات
export const dbQueriesTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
  registers: [register],
});

// زمن استعلامات قاعدة البيانات
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// اتصالات قاعدة البيانات النشطة
export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

// ==================== Redis Metrics ====================

// عمليات Redis
export const redisOperationsTotal = new Counter({
  name: 'redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// زمن عمليات Redis
export const redisOperationDuration = new Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [register],
});

// ==================== Business Metrics ====================

// عدد تسجيلات الدخول
export const authLoginsTotal = new Counter({
  name: 'auth_logins_total',
  help: 'Total number of login attempts',
  labelNames: ['status', 'method'],
  registers: [register],
});

// عدد عمليات المصادقة
export const authOperationsTotal = new Counter({
  name: 'auth_operations_total',
  help: 'Total number of authentication operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// عدد المستخدمين النشطين
export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users',
  registers: [register],
});

// ==================== Error Metrics ====================

// عدد الأخطاء
export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'route'],
  registers: [register],
});

// ==================== Export Functions ====================

/**
 * تصدير المقاييس بصيغة Prometheus
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * الحصول على جميع المقاييس بصيغة JSON (للتطوير)
 */
export async function getMetricsAsJSON() {
  return register.getMetricsAsJSON();
}

/**
 * إعادة تعيين المقاييس (للتطوير فقط)
 */
export function resetMetrics(): void {
  register.resetMetrics();
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
  const routeLabel = normalizeRoute(route);
  
  httpRequestsTotal.inc({ method, route: routeLabel, status_code: statusCode });
  httpRequestDuration.observe({ method, route: routeLabel, status_code: statusCode }, duration / 1000);
  
  if (requestSize !== undefined) {
    httpRequestSize.observe({ method, route: routeLabel }, requestSize);
  }
  
  if (responseSize !== undefined) {
    httpResponseSize.observe({ method, route: routeLabel, status_code: statusCode }, responseSize);
  }
  
  // تتبع الأخطاء
  if (statusCode >= 400) {
    const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
    errorsTotal.inc({ type: errorType, route: routeLabel });
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
  dbQueriesTotal.inc({ operation, table, status });
  dbQueryDuration.observe({ operation, table }, duration / 1000);
  
  if (status === 'error') {
    errorsTotal.inc({ type: 'database_error', route: 'db' });
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
  redisOperationsTotal.inc({ operation, status });
  redisOperationDuration.observe({ operation }, duration / 1000);
  
  if (status === 'error') {
    errorsTotal.inc({ type: 'redis_error', route: 'redis' });
  }
}

/**
 * تحديث عدد اتصالات قاعدة البيانات النشطة
 */
export function setDbConnections(count: number): void {
  dbConnectionsActive.set(count);
}

/**
 * تحديث عدد المستخدمين النشطين
 */
export function setActiveUsers(count: number): void {
  activeUsers.set(count);
}

/**
 * تطبيع مسار الطلب لإزالة المعاملات الديناميكية
 * مثال: /api/users/123 -> /api/users/:id
 */
function normalizeRoute(route: string): string {
  // إزالة query parameters
  const path = route.split('?')[0];
  
  // استبدال UUIDs
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  let normalized = path.replace(uuidPattern, ':id');
  
  // استبدال الأرقام بمعاملات عامة
  normalized = normalized.replace(/\/\d+/g, '/:id');
  
  return normalized;
}

export { register };


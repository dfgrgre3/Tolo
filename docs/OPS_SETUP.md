# Ops Infrastructure Setup Guide

هذا الدليل يشرح كيفية تفعيل واستخدام البنية التحتية المتقدمة (Ops) في النظام.

## المكونات

### 1. Monitoring (Prometheus & Grafana)

#### التكوين
- **Endpoint**: `/api/metrics` - يقوم بتصدير المقاييس بصيغة Prometheus
- **Health Check**: `/api/healthz` - للـ Kubernetes liveness probe
- **Readiness Check**: `/api/readyz` - للـ Kubernetes readiness probe

#### المقاييس المتاحة
- **HTTP Metrics**: 
  - `http_requests_total` - عدد الطلبات الإجمالية
  - `http_request_duration_seconds` - زمن استجابة الطلبات
  - `http_request_size_bytes` - حجم الطلبات
  - `http_response_size_bytes` - حجم الاستجابات

- **Database Metrics**:
  - `db_queries_total` - عدد استعلامات قاعدة البيانات
  - `db_query_duration_seconds` - زمن استعلامات قاعدة البيانات
  - `db_connections_active` - عدد اتصالات قاعدة البيانات النشطة

- **Redis Metrics**:
  - `redis_operations_total` - عدد عمليات Redis
  - `redis_operation_duration_seconds` - زمن عمليات Redis

- **Business Metrics**:
  - `auth_logins_total` - عدد تسجيلات الدخول
  - `auth_operations_total` - عدد عمليات المصادقة
  - `active_users` - عدد المستخدمين النشطين
  - `errors_total` - عدد الأخطاء

#### الاستخدام في الكود
```typescript
import { trackHttpRequest, trackDbQuery, trackRedisOperation } from '@/lib/metrics/prometheus';

// تتبع HTTP request
trackHttpRequest('GET', '/api/tasks', 200, 150, 1024, 2048);

// تتبع DB query
trackDbQuery('SELECT', 'tasks', 50, 'success');

// تتبع Redis operation
trackRedisOperation('GET', 5, 'success');
```

### 2. Logging (ELK Stack)

#### التكوين
يتم تكوين ELK Stack عبر متغيرات البيئة:
- `ELASTICSEARCH_ENABLED=true` - تفعيل ELK logging
- `ELASTICSEARCH_URL=http://elasticsearch:9200` - عنوان Elasticsearch
- `ELASTICSEARCH_USERNAME=elastic` - اسم المستخدم
- `ELASTICSEARCH_PASSWORD=password` - كلمة المرور
- `LOG_LEVEL=info` - مستوى السجلات (debug, info, warn, error)

#### الاستخدام في الكود
```typescript
import { logger } from '@/lib/logging/elk-logger';

// Logging عادي
logger.info('User logged in', { userId: '123' });
logger.error('Database error', error, { query: 'SELECT * FROM users' });
logger.warn('Rate limit exceeded', { ip: '1.2.3.4' });
logger.debug('Cache hit', { key: 'user:123' });

// Logging HTTP requests
logger.http({
  method: 'GET',
  url: '/api/tasks',
  statusCode: 200,
  duration: 150,
  ip: '1.2.3.4',
  userId: '123'
});

// Logging database queries
logger.db({
  operation: 'SELECT',
  table: 'tasks',
  duration: 50,
  success: true
});

// Logging authentication events
logger.auth({
  type: 'login',
  userId: '123',
  ip: '1.2.3.4',
  success: true,
  method: 'email'
});
```

### 3. Distributed Tracing (Jaeger)

#### التكوين
- `JAEGER_ENABLED=true` - تفعيل Jaeger tracing
- `JAEGER_AGENT_HOST=jaeger` - عنوان Jaeger agent
- `JAEGER_AGENT_PORT=6831` - منفذ Jaeger agent (UDP)
- `JAEGER_ENDPOINT=http://jaeger:14268/api/traces` - عنوان HTTP endpoint
- `SERVICE_NAME=thanawy` - اسم الخدمة

#### الاستخدام في الكود
```typescript
import { traceAsync, traceSync, startSpan } from '@/lib/tracing/jaeger-tracer';

// تتبع async operation
const result = await traceAsync(
  'fetchUserData',
  async (span) => {
    span.setAttributes({ userId: '123' });
    // Your async code here
    return await fetchUserData('123');
  },
  { userId: '123' }
);

// تتبع sync operation
const result = traceSync(
  'processData',
  (span) => {
    span.setAttributes({ dataSize: data.length });
    // Your sync code here
    return processData(data);
  }
);

// إنشاء span يدوياً
const span = startSpan('customOperation', {
  attributes: { key: 'value' }
});
// ... do work ...
span.end();
```

### 4. Unified Middleware

يمكن استخدام middleware موحد يجمع كل شيء:

```typescript
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    // Your API logic here
    // Metrics, logging, and tracing are automatically handled
    return NextResponse.json({ data: 'result' });
  });
}
```

## التكوين في Kubernetes

### 1. Prometheus ServiceMonitor

يتم تكوين Prometheus لجمع المقاييس من `/api/metrics` كما هو موضح في `k8s/monitoring.yml`.

### 2. Health Checks

يتم تكوين Kubernetes probes كما يلي:
```yaml
livenessProbe:
  httpGet:
    path: /api/healthz
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/readyz
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### 3. Environment Variables

```yaml
env:
  - name: PROMETHEUS_ENABLED
    value: "true"
  - name: ELASTICSEARCH_ENABLED
    value: "true"
  - name: ELASTICSEARCH_URL
    value: "http://elasticsearch:9200"
  - name: JAEGER_ENABLED
    value: "true"
  - name: JAEGER_AGENT_HOST
    value: "jaeger"
  - name: LOG_LEVEL
    value: "info"
  - name: SERVICE_NAME
    value: "thanawy"
```

## Stateless Design

لضمان أن التطبيق يعمل بشكل صحيح مع HPA (Horizontal Pod Autoscaler):

### ✅ يجب أن يكون التطبيق:
- **Stateless**: لا يحفظ state محلي
- **Session Storage**: يستخدم Redis للجلسات
- **Database**: جميع البيانات في قاعدة البيانات
- **Cache**: يستخدم Redis للتخزين المؤقت

### ❌ يجب تجنب:
- تخزين state في memory (مثل maps أو arrays)
- استخدام file system للتخزين
- استخدام session storage محلي

## التكامل مع Services الموجودة

### Database Queries
يتم تتبع استعلامات قاعدة البيانات تلقائياً عبر Prisma instrumentation.

### Redis Operations
يتم تتبع عمليات Redis عبر wrapper functions في `src/lib/redis.ts`.

### HTTP Requests
يتم تتبع جميع الطلبات HTTP عبر middleware.

## Monitoring Dashboard

يمكن الوصول إلى:
- **Prometheus**: `http://prometheus:9090`
- **Grafana**: `http://grafana:3000`
- **Jaeger UI**: `http://jaeger:16686`
- **Kibana**: `http://kibana:5601`

## Troubleshooting

### المقاييس لا تظهر في Prometheus
1. تحقق من أن `/api/metrics` يعمل: `curl http://localhost:3000/api/metrics`
2. تحقق من أن Prometheus ServiceMonitor صحيح
3. تحقق من أن labels في deployment match مع ServiceMonitor

### السجلات لا تظهر في Elasticsearch
1. تحقق من اتصال Elasticsearch: `curl http://elasticsearch:9200`
2. تحقق من متغيرات البيئة
3. تحقق من logs التطبيق للأخطاء

### Traces لا تظهر في Jaeger
1. تحقق من أن Jaeger يعمل: `curl http://jaeger:16686`
2. تحقق من أن JAEGER_ENABLED=true
3. تحقق من أن Jaeger agent متاح على المنفذ الصحيح

## Next Steps

1. تثبيت المكتبات: `npm install`
2. تكوين متغيرات البيئة
3. تشغيل التطبيق: `npm run dev`
4. التحقق من endpoints:
   - `/api/metrics` - المقاييس
   - `/api/healthz` - Health check
   - `/api/readyz` - Readiness check


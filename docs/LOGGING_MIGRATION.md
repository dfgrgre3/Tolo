# دليل هجرة نظام التسجيل
# Logging System Migration Guide

## نظرة عامة / Overview

تم إنشاء نظام تسجيل موحد (`unified-logger`) لدمج جميع أنظمة التسجيل في المشروع واستبدال استخدامات `console.*` المباشرة.

A unified logging system (`unified-logger`) has been created to integrate all logging systems in the project and replace direct `console.*` usage.

## النظام الموحد / Unified System

النظام الموحد موجود في: `src/lib/logging/unified-logger.ts`

The unified system is located at: `src/lib/logging/unified-logger.ts`

### المميزات / Features

- ✅ دعم للتسجيل على الخادم والعميل (Server & Client support)
- ✅ تكامل مع ELK Stack (ELK Stack integration)
- ✅ تسجيل الأخطاء المتقدم (Advanced error logging)
- ✅ تسجيل الأحداث الأمنية (Security event logging)
- ✅ تسجيل أحداث المصادقة (Authentication event logging)
- ✅ تهيئة كسولة (Lazy initialization)
- ✅ دعم جميع مستويات التسجيل (All log levels support)

## الاستخدام / Usage

### الاستيراد / Import

```typescript
// الطريقة الموصى بها / Recommended way
import { logger } from '@/lib/logger';

// أو مباشرة من النظام الموحد / Or directly from unified system
import { logger } from '@/lib/logging/unified-logger';
```

### أمثلة الاستخدام / Usage Examples

```typescript
// تسجيل معلومات / Info logging
logger.info('User logged in', { userId: '123' });

// تسجيل تحذير / Warning logging
logger.warn('Rate limit approaching', { userId: '123', requests: 95 });

// تسجيل خطأ / Error logging
try {
  // some code
} catch (error) {
  logger.error('Failed to process request', error, { userId: '123' });
}

// تسجيل تصحيح / Debug logging
logger.debug('Processing data', { dataSize: 1000 });

// تسجيل طلب HTTP / HTTP request logging
logger.http({
  method: 'GET',
  url: '/api/users',
  statusCode: 200,
  duration: 150,
  ip: '127.0.0.1',
  userId: '123'
});

// تسجيل استعلام قاعدة البيانات / Database query logging
logger.db({
  operation: 'SELECT',
  table: 'users',
  duration: 50,
  success: true
});

// تسجيل حدث مصادقة / Authentication event logging
logger.auth({
  type: 'LOGIN_SUCCESS',
  userId: '123',
  ip: '127.0.0.1',
  success: true
});

// تسجيل حدث أمني / Security event logging
logger.security({
  eventType: 'SUSPICIOUS_ACTIVITY_DETECTED',
  userId: '123',
  ip: '127.0.0.1',
  userAgent: 'Mozilla/5.0...'
});
```

## استبدال console.* / Replacing console.*

### قبل / Before

```typescript
console.log('User logged in', userId);
console.error('Error occurred', error);
console.warn('Warning message');
console.debug('Debug info');
```

### بعد / After

```typescript
import { logger } from '@/lib/logger';

logger.info('User logged in', { userId });
logger.error('Error occurred', error);
logger.warn('Warning message');
logger.debug('Debug info');
```

## استخدام السكريبت / Using the Script

يمكن استخدام السكريبت لاستبدال تلقائي لاستخدامات `console.*`:

You can use the script for automatic replacement of `console.*` usage:

```bash
# Dry run (معاينة فقط) / Preview only
node scripts/replace-console-logs.js --dry-run

# استبدال في ملف محدد / Replace in specific file
node scripts/replace-console-logs.js src/lib/notification-service.ts

# استبدال في جميع الملفات / Replace in all files
node scripts/replace-console-logs.js
```

## التكوين / Configuration

يمكن تكوين النظام الموحد عبر متغيرات البيئة:

The unified system can be configured via environment variables:

```env
# مستوى التسجيل / Log level
LOG_LEVEL=info  # debug, info, warn, error

# تفعيل ELK Stack / Enable ELK Stack
ELASTICSEARCH_ENABLED=true
ELASTICSEARCH_URL=http://elasticsearch:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=password
```

## الأنظمة المدمجة / Integrated Systems

النظام الموحد يدمج الأنظمة التالية:

The unified system integrates the following systems:

1. **ELK Logger** (`src/lib/logging/elk-logger.ts`) - للتكامل مع Elasticsearch
2. **Auth Logger** (`src/lib/logging/auth-logger.ts`) - لتسجيل أحداث المصادقة
3. **Error Logger** (`src/services/ErrorLogger.ts`) - لتسجيل الأخطاء على العميل
4. **Security Logger** (`src/lib/security-logger.ts`) - لتسجيل الأحداث الأمنية

## ملاحظات مهمة / Important Notes

1. **لا تستخدم console.* مباشرة** - استخدم `logger` بدلاً منها
   **Don't use console.* directly** - Use `logger` instead

2. **النظام الموحد يعمل تلقائياً** - لا حاجة لتهيئة يدوية
   **Unified system works automatically** - No manual initialization needed

3. **التسجيل غير متزامن** - لا يؤثر على الأداء
   **Logging is asynchronous** - Doesn't affect performance

4. **في حالة فشل نظام فرعي** - النظام يستمر بالعمل مع الأنظمة الأخرى
   **If a subsystem fails** - System continues with other systems

## حالة الهجرة / Migration Status

- ✅ نظام التسجيل الموحد تم إنشاؤه
- ✅ سكريبت الاستبدال التلقائي جاهز
- ⏳ استبدال استخدامات console.* (جاري العمل)
- ⏳ تحديث الملفات التي تستخدم أنظمة التسجيل القديمة

- ✅ Unified logging system created
- ✅ Automatic replacement script ready
- ⏳ Replacing console.* usage (in progress)
- ⏳ Updating files using old logging systems

## المساعدة / Help

إذا واجهت مشاكل أثناء الهجرة، راجع:
- `src/lib/logging/unified-logger.ts` - كود النظام الموحد
- `src/lib/logger.ts` - نقطة الدخول الرئيسية

If you encounter issues during migration, check:
- `src/lib/logging/unified-logger.ts` - Unified system code
- `src/lib/logger.ts` - Main entry point


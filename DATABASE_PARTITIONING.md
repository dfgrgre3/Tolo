# نظام تقسيم البيانات - Data Partitioning System

## نظرة عامة (Overview)

تم تنفيذ نظام تقسيم البيانات في قاعدة البيانات للتعامل مع النمو الكبير في البيانات وتحسين الأداء. يستخدم النظام تقسيم الجداول الشهري (Monthly Partitioning) على أساس PostgreSQL للمساعدة في إدارة البيانات الضخمة.

## الجداول المقسمة (Partitioned Tables)

### StudySession (جلسات الدراسة)
- **طريقة التقسيم**: حسب تاريخ الإنشاء (`createdAt`)
- **فترة الاحتفاظ**: 2 سنة
- **الهدف**: تخزين سجلات جلسات الدراسة لكل مستخدم

### ProgressSnapshot (لقطات التقدم)
- **طريقة التقسيم**: حسب التاريخ (`date`)
- **فترة الاحتفاظ**: 1 سنة
- **الهدف**: تخزين لقطات يومية لتقدم المستخدمين

### SecurityLog (سجلات الأمان)
- **طريقة التقسيم**: حسب تاريخ الإنشاء (`createdAt`)
- **فترة الاحتفاظ**: 3 أشهر
- **الهدف**: تخزين سجلات الأمان والتدقيق

### Session (جلسات المستخدمين)
- **طريقة التقسيم**: حسب تاريخ الإنشاء (`createdAt`)
- **فترة الاحتفاظ**: 1 شهر
- **الهدف**: تخزين بيانات جلسات تسجيل الدخول

## مزايا التقسيم (Partitioning Benefits)

1. **تحسين الأداء**: استعلامات أسرع للبيانات الحديثة فقط
2. **صيانة أسهل**: حذف البيانات القديمة بسرعة
3. **استخدام ذاكرة أقل**: تحميل بيانات أقل في الذاكرة
4. **نسخ احتياطي أسرع**: نسخ احتياطي للأقسام المطلوبة فقط
5. **أرشفة ذكية**: نقل البيانات القديمة إلى أرشيف منفصل

## كيفية عمل النظام (How It Works)

### إنشاء الأقسام التلقائي
- يتم إنشاء أقسام شهرية مسبقاً للأشهر القادمة
- التقسيم يعتمد على `RANGE` partitioning باستخدام التاريخ
- يتم إنشاء قسم افتراضي للبيانات خارج النطاق المحدد

### الصيانة التلقائية
- **إنشاء أقسام جديدة**: قبل انتهاء الشهر الحالي
- **تنظيف الأقسام القديمة**: حسب سياسة الاحتفاظ
- **أرشفة البيانات**: حفظ البيانات التجميعية للتحليل

## الأدوات المتاحة (Available Tools)

### خدمة تقسيم البيانات (DataPartitioningService)

```typescript
import DataPartitioningService from '@/lib/data-partitioning-service'

// إنشاء أقسام شهرية
await DataPartitioningService.createMonthlyPartitions(
  'StudySession',
  new Date('2025-01-01'),
  new Date('2025-12-31')
)

// الحصول على معلومات الأقسام
const partitions = await DataPartitioningService.getPartitionInfo('StudySession')

// فحص حجم البيانات وتمديد الأقسام تلقائياً
const sizeCheck = await DataPartitioningService.checkAndExtendPartitionsIfNeeded()

// تنظيف الأقسام القديمة
const cleanup = await DataPartitioningService.cleanupOldPartitions()

// تقرير صحة الأقسام
const health = await DataPartitioningService.getPartitionHealthReport()
```

### API إدارة الأقسام (Partitions Management API)

#### الحصول على معلومات الصحة
```
GET /api/database-partitions?action=health
Authorization: Bearer <admin-token>
```

#### الحصول على معلومات الأقسام
```
GET /api/database-partitions?action=info
Authorization: Bearer <admin-token>
```

#### فحص كفاءة التقسيم
```
GET /api/database-partitions?action=efficiency
Authorization: Bearer <admin-token>
```

#### فحص حجم البيانات وتمديد الأقسام تلقائياً (جديد)
```
GET /api/database-partitions?action=check_size
Authorization: Bearer <admin-token>
```

#### إنشاء أقسام جديدة
```
POST /api/database-partitions
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "action": "create_partitions",
  "tableName": "StudySession",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.999Z"
}
```

#### تنظيف الأقسام القديمة
```
POST /api/database-partitions
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "action": "cleanup"
}
```

#### صيانة شاملة
```
POST /api/database-partitions
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "action": "maintain"
}
```

## سياسات الاحتفاظ بالبيانات (Data Retention Policies)

| الجدول | فترة الاحتفاظ | نوع البيانات | سبب الاحتفاظ |
|--------|---------------|---------------|----------------|
| StudySession | 2 سنة | تاريخية | تحليل السلوكيات وإحصائيات الدراسة |
| ProgressSnapshot | 1 سنة | تاريخية | تتبع التقدم طويل الأمد |
| SecurityLog | 3 أشهر | أمنية | تدقيق الأمان والامتثال |
| Session | 1 شهر | تشغيلية | جلسات نشطة حديثة فقط |

## خطوات التنفيذ (Implementation Steps)

### 1. إعداد قاعدة البيانات
```bash
# تشغيل المايقريشن الجديد
npx prisma migrate deploy

# أو في التطوير
npx prisma migrate dev
```

### 2. إنشاء أقسام أولية
```typescript
import DataPartitioningService from '@/lib/data-partitioning-service'

// إنشاء أقسام للأشهر القادمة
await DataPartitioningService.createMonthlyPartitions(
  'StudySession',
  new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3 أشهر مضت
  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)  // سنة قادمة
)

// تكرار للجداول الأخرى
const tables = ['ProgressSnapshot', 'SecurityLog', 'Session']
for (const table of tables) {
  // منطق إنشاء الأقسام حسب كل جدول
}
```

### 3. إعداد المهام المجدولة (Cron Jobs)
```typescript
// إضافة مهام مجدولة للصيانة الأسبوعية
import { scheduleJob } from 'node-cron'

// صيانة أسبوعية للأقسام
scheduleJob('0 2 * * 1', async () => { // كل يوم اثنين الساعة 2 صباحاً
  try {
    await DataPartitioningService.cleanupOldPartitions()

    // إنشاء أقسام للأشهر القادمة
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

    for (const table of ['StudySession', 'ProgressSnapshot', 'SecurityLog', 'Session']) {
      await DataPartitioningService.createMonthlyPartitions(
        table,
        new Date(),
        sixMonthsFromNow
      )
    }

    console.log('Weekly partition maintenance completed')
  } catch (error) {
    console.error('Partition maintenance failed:', error)
  }
})
```

## مراقبة واستكشاف الأخطاء (Monitoring & Troubleshooting)

### فحص صحة الأقسام
```typescript
const healthReport = await DataPartitioningService.getPartitionHealthReport()

console.log('Partition Health Report:')
for (const table of healthReport.tableHealth) {
  console.log(`Table: ${table.tableName}`)
  console.log(`  Partitions: ${table.partitionCount}`)
  console.log(`  Actions needed: ${table.recommendedActions.join(', ')}`)
}
```

### الأداء والاستعلامات (Performance Queries)

```sql
-- فحص حجم الأقسام
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE '%StudySession%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- فحص عدد الصفوف في كل قسم
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  (SELECT count(*) FROM ONLY (schemaname||'.'||tablename)::regclass) as row_count
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'StudySession_%'
ORDER BY tablename DESC;
```

## نصائح الأداء (Performance Tips)

1. **تحسين الاستعلامات**: استخدم شروط التاريخ في جميع الاستعلامات للاستفادة من التجزئة
2. **إنشاء المؤشرات**: المؤشرات المناسبة مفيدة لكل قسم
3. **جدولة الصيانة**: شغل مهام الصيانة خارج ساعات الذروة
4. **النسخ الاحتياطي**: اعمل نسخ احتياطية منتظمة للأقسام المهمة فقط

## الأمان والامتثال (Security & Compliance)

- **الوصول محدود**: API إدارة الأقسام محصور بالمسؤولين فقط
- **تدقيق العمليات**: جميع عمليات التنظيف مسجلة
- **أرشفة آمنة**: البيانات المؤرشفة مشفرة ومحمية
- **الامتثال**: الاحتفاظ يراعي قوانين حماية البيانات

## الدعم والصيانة (Support & Maintenance)

لأي مشاكل في نظام التقسيم:
1. تحقق من صحة الأقسام باستخدام API الصحة
2. فحص سجلات الأخطاء في التطبيق
3. التحقق من أداء قاعدة البيانات
4. التواصل مع فريق التطوير للمشاكل المعقدة

---

**ملاحظة**: هذا النظام مصمم للنمو والتوسع. مع زيادة حجم البيانات، يمكن تعديل سياسات التقسيم والاحتفاظ حسب الحاجة.

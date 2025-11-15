# دليل الانتقال من SQLite إلى PostgreSQL

## نظرة عامة

تم تحديث قاعدة البيانات من SQLite إلى PostgreSQL لدعم بيئات الإنتاج Serverless مثل Vercel. SQLite لا يصلح للإنتاج في بيئات Serverless لأنه ملف محلي سيتم مسحه مع كل عملية نشر.

## التغييرات المطبقة

### 1. تحديث Prisma Schema
- تم تغيير `provider` في `prisma/schema.prisma` من `sqlite` إلى `postgresql`
- جميع النماذج متوافقة مع PostgreSQL (Json, cuid(), indexes)

### 2. المكتبات المطلوبة
- `@prisma/adapter-pg` موجودة بالفعل في `package.json`
- `@prisma/client` محدث للإصدار 6.16.1

## خطوات الهجرة

### للمطورين المحليين

#### 1. إعداد قاعدة بيانات PostgreSQL محلية

**خيار أ: استخدام Docker**
```bash
docker run --name thanawy-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=thanawy \
  -p 5432:5432 \
  -d postgres:15
```

**خيار ب: تثبيت PostgreSQL محلياً**
- Windows: [PostgreSQL Windows Installer](https://www.postgresql.org/download/windows/)
- macOS: `brew install postgresql@15`
- Linux: `sudo apt-get install postgresql-15`

#### 2. إنشاء قاعدة البيانات
```sql
CREATE DATABASE thanawy;
```

#### 3. تحديث ملف `.env`
```env
# للتطوير المحلي
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/thanawy?schema=public"

# للإنتاج (Vercel/Neon/Supabase)
DATABASE_URL="postgresql://user:password@host:5432/thanawy?schema=public&sslmode=require"
```

#### 4. تشغيل Migrations
```bash
# إنشاء migration جديدة للانتقال
npx prisma migrate dev --name migrate_to_postgresql

# أو تطبيق migrations الموجودة
npx prisma migrate deploy
```

#### 5. توليد Prisma Client
```bash
npx prisma generate
```

### للإنتاج (Vercel)

#### خيار 1: استخدام Neon (موصى به)
1. إنشاء حساب على [Neon](https://neon.tech)
2. إنشاء مشروع جديد
3. نسخ `DATABASE_URL` من لوحة التحكم
4. إضافتها كمتغير بيئة في Vercel:
   ```
   Settings → Environment Variables → DATABASE_URL
   ```

#### خيار 2: استخدام Supabase
1. إنشاء حساب على [Supabase](https://supabase.com)
2. إنشاء مشروع جديد
3. نسخ `DATABASE_URL` من Settings → Database
4. إضافتها كمتغير بيئة في Vercel

#### خيار 3: استخدام قاعدة بيانات PostgreSQL مخصصة
- إعداد قاعدة بيانات PostgreSQL على AWS RDS, DigitalOcean, أو أي مزود آخر
- استخدام `DATABASE_URL` مع SSL

## نقل البيانات من SQLite إلى PostgreSQL

إذا كان لديك بيانات موجودة في SQLite:

### الطريقة 1: استخدام Prisma Migrate (موصى به)
```bash
# 1. تصدير البيانات من SQLite
npx prisma db pull --schema=./prisma/schema-sqlite.prisma

# 2. إنشاء migration جديدة
npx prisma migrate dev --name migrate_to_postgresql

# 3. استيراد البيانات (قد تحتاج script مخصص)
```

### الطريقة 2: استخدام SQL Dump
```bash
# تصدير من SQLite
sqlite3 dev.db .dump > dump.sql

# تحويل وتعديل dump.sql ليتوافق مع PostgreSQL
# ثم استيراده
psql -d thanawy -f dump.sql
```

### الطريقة 3: استخدام Script مخصص
راجع `scripts/migrate-sqlite-to-postgres.ts` (إن وجد)

## التحقق من الهجرة

### 1. اختبار الاتصال
```bash
npx prisma db pull
```

### 2. تشغيل التطبيق محلياً
```bash
npm run dev
```

### 3. التحقق من البيانات
```bash
npx prisma studio
```

## الفروقات بين SQLite و PostgreSQL

### 1. أنواع البيانات
- ✅ `Json` - مدعوم في كليهما
- ✅ `cuid()` - يعمل في كليهما
- ✅ `DateTime` - متوافق
- ✅ `String`, `Int`, `Boolean` - متوافق

### 2. الميزات الإضافية في PostgreSQL
- ✅ **Connection Pooling** - دعم أفضل للاتصالات المتزامنة
- ✅ **JSON Queries** - استعلامات JSON أقوى
- ✅ **Full-Text Search** - بحث نصي متقدم
- ✅ **Table Partitioning** - تقسيم الجداول (مفيد للجداول الكبيرة)
- ✅ **Transactions** - معاملات أقوى

### 3. الاختلافات في الأداء
- PostgreSQL أسرع في:
  - الاستعلامات المعقدة
  - الاتصالات المتزامنة
  - الجداول الكبيرة
- SQLite أسرع في:
  - القراءة البسيطة
  - التطبيقات الصغيرة

## استكشاف الأخطاء

### خطأ: "relation does not exist"
```bash
# تأكد من تشغيل migrations
npx prisma migrate deploy
```

### خطأ: "connection refused"
- تحقق من أن PostgreSQL يعمل
- تحقق من `DATABASE_URL`
- تحقق من firewall/network settings

### خطأ: "SSL required"
```env
DATABASE_URL="postgresql://...?sslmode=require"
```

### خطأ: "too many connections"
- قم بزيادة `maxPoolSize` في `database.ts`
- أو استخدم connection pooling من مزود قاعدة البيانات

## إعدادات الإنتاج الموصى بها

### Connection Pooling
```env
DB_MAX_POOL_SIZE=20
DB_MIN_POOL_SIZE=2
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

### SSL (مطلوب للإنتاج)
```env
DATABASE_URL="postgresql://...?sslmode=require"
```

### Monitoring
- استخدم Prisma Query Logging في التطوير
- راقب connection pool stats
- راقب slow queries

## المراجع

- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Neon Documentation](https://neon.tech/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Database Guide](https://vercel.com/docs/storage/vercel-postgres)

## الدعم

إذا واجهت مشاكل في الهجرة:
1. تحقق من logs في `src/lib/db-unified.ts`
2. راجع [Prisma Troubleshooting](https://www.prisma.io/docs/guides/performance-and-optimization/troubleshooting)
3. افتح issue في repository


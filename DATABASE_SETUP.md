# دليل إعداد قاعدة البيانات
# Database Setup Guide

## المشكلة
PostgreSQL غير قيد التشغيل على `localhost:5432`

## الحلول المتاحة

### الحل 1: استخدام Docker (موصى به للتطوير)

#### المتطلبات:
- Docker Desktop مثبت على Windows

#### الخطوات:

1. **تشغيل PostgreSQL باستخدام Docker:**
   ```powershell
   # استخدام السكريبت المرفق
   .\scripts\start-db.ps1
   
   # أو يدوياً
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **التحقق من حالة قاعدة البيانات:**
   ```powershell
   docker ps
   ```

3. **إعداد ملف `.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/thanawy?schema=public"
   ```

4. **تشغيل Migrations:**
   ```powershell
   npx prisma migrate dev --name comprehensive_database_optimization
   npx prisma generate
   ```

5. **إيقاف قاعدة البيانات (عند الحاجة):**
   ```powershell
   .\scripts\stop-db.ps1
   # أو
   docker-compose -f docker-compose.dev.yml down
   ```

---

### الحل 2: تثبيت PostgreSQL محلياً

#### الخطوات:

1. **تحميل وتثبيت PostgreSQL:**
   - تحميل من: https://www.postgresql.org/download/windows/
   - تثبيت PostgreSQL 15 أو أحدث
   - تذكر كلمة المرور التي ستضعها للمستخدم `postgres`

2. **إنشاء قاعدة البيانات:**
   ```sql
   -- فتح pgAdmin أو psql
   CREATE DATABASE thanawy;
   ```

3. **إعداد ملف `.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/thanawy?schema=public"
   ```

4. **تشغيل Migrations:**
   ```powershell
   npx prisma migrate dev --name comprehensive_database_optimization
   npx prisma generate
   ```

---

### الحل 3: استخدام قاعدة بيانات سحابية (للإنتاج)

#### الخيارات المتاحة:

1. **Neon (موصى به):**
   - الموقع: https://neon.tech
   - مجاني للتطوير
   - مناسب لـ Serverless

2. **Supabase:**
   - الموقع: https://supabase.com
   - مجاني للتطوير
   - واجهة إدارة سهلة

3. **Railway:**
   - الموقع: https://railway.app
   - سهل الإعداد
   - مجاني للتطوير

#### الخطوات:

1. **إنشاء قاعدة بيانات جديدة** على أحد المزودين أعلاه

2. **نسخ Connection String** من لوحة التحكم

3. **إعداد ملف `.env`:**
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/thanawy?schema=public&sslmode=require"
   ```

4. **تشغيل Migrations:**
   ```powershell
   npx prisma migrate deploy
   npx prisma generate
   ```

---

## التحقق من الاتصال

### اختبار الاتصال:
```powershell
# اختبار الاتصال باستخدام Prisma
npx prisma db pull

# أو اختبار مباشر
npx prisma studio
```

### فحص حالة قاعدة البيانات:
```powershell
# إذا كنت تستخدم Docker
docker ps

# أو فحص المنفذ
Test-NetConnection -ComputerName localhost -Port 5432
```

---

## استكشاف الأخطاء

### خطأ: "Can't reach database server"
- ✅ تأكد من أن PostgreSQL قيد التشغيل
- ✅ تحقق من أن المنفذ 5432 مفتوح
- ✅ تحقق من `DATABASE_URL` في ملف `.env`

### خطأ: "Authentication failed"
- ✅ تحقق من اسم المستخدم وكلمة المرور
- ✅ تأكد من أن قاعدة البيانات موجودة

### خطأ: "Database does not exist"
- ✅ أنشئ قاعدة البيانات يدوياً:
  ```sql
  CREATE DATABASE thanawy;
  ```

---

## الملفات المرفقة

1. **`docker-compose.dev.yml`** - إعداد Docker لـ PostgreSQL
2. **`scripts/start-db.ps1`** - سكريبت لتشغيل قاعدة البيانات
3. **`scripts/stop-db.ps1`** - سكريبت لإيقاف قاعدة البيانات

---

## نصائح إضافية

1. **للحفاظ على البيانات:**
   - Docker يستخدم Volume لحفظ البيانات
   - البيانات محفوظة حتى بعد إيقاف الحاوية

2. **لحذف البيانات:**
   ```powershell
   docker-compose -f docker-compose.dev.yml down -v
   ```

3. **لرؤية السجلات:**
   ```powershell
   docker-compose -f docker-compose.dev.yml logs postgres
   ```

---

**تاريخ الإنشاء**: 2025-01-01


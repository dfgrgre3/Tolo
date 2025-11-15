# دليل سريع لإعداد قاعدة البيانات
# Quick Database Setup Guide

## 🚀 الحل السريع (موصى به)

### استخدام قاعدة بيانات سحابية مجانية

**الخيار 1: Neon (الأسهل)**
1. اذهب إلى: https://neon.tech
2. سجّل حساب مجاني
3. أنشئ مشروع جديد
4. انسخ Connection String
5. ضعه في ملف `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@host/thanawy?sslmode=require"
   ```
6. شغّل:
   ```powershell
   npx prisma migrate deploy
   npx prisma generate
   ```

**الخيار 2: Supabase**
1. اذهب إلى: https://supabase.com
2. سجّل حساب مجاني
3. أنشئ مشروع جديد
4. من Settings > Database، انسخ Connection String
5. ضعه في ملف `.env`
6. شغّل:
   ```powershell
   npx prisma migrate deploy
   npx prisma generate
   ```

---

## 💻 الحل المحلي (للتطوير)

### الخيار A: تثبيت PostgreSQL على Windows

#### الخطوات السريعة:

1. **تحميل PostgreSQL:**
   - اذهب إلى: https://www.postgresql.org/download/windows/
   - حمّل PostgreSQL 15 أو 16 (64-bit)
   - شغّل المثبت

2. **أثناء التثبيت:**
   - ✅ اختر "PostgreSQL Server"
   - ✅ ضع كلمة مرور (مثلاً: `postgres123`)
   - ✅ اترك المنفذ 5432
   - ✅ اختر "Default locale"

3. **إنشاء قاعدة البيانات:**

   **الطريقة 1: استخدام السكريبت (أسهل)**
   ```powershell
   .\scripts\create-database.ps1
   ```
   سيطلب منك كلمة المرور التي وضعتها أثناء التثبيت.

   **الطريقة 2: استخدام pgAdmin (واجهة رسومية)**
   - افتح pgAdmin 4 من قائمة Start
   - أدخل كلمة المرور
   - انقر بزر الماوس الأيمن على "Databases" > "Create" > "Database"
   - أدخل الاسم: `thanawy`
   - انقر "Save"

   **الطريقة 3: استخدام PowerShell مباشرة**
   ```powershell
   # استبدل YOUR_PASSWORD بكلمة المرور
   $env:PGPASSWORD = "YOUR_PASSWORD"
   & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE thanawy;"
   ```

4. **تحديث ملف `.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/thanawy?schema=public"
   ```
   استبدل `YOUR_PASSWORD` بكلمة المرور التي وضعتها.

5. **تشغيل Migrations:**
   ```powershell
   npx prisma migrate dev --name comprehensive_database_optimization
   npx prisma generate
   ```

---

### الخيار B: استخدام Docker (إذا كان مثبتاً)

1. **تثبيت Docker Desktop:**
   - اذهب إلى: https://www.docker.com/products/docker-desktop
   - حمّل Docker Desktop for Windows
   - شغّل المثبت وأعد تشغيل الكمبيوتر

2. **تشغيل PostgreSQL:**
   ```powershell
   .\scripts\start-db.ps1
   ```

3. **تحديث ملف `.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/thanawy?schema=public"
   ```

4. **تشغيل Migrations:**
   ```powershell
   npx prisma migrate dev --name comprehensive_database_optimization
   npx prisma generate
   ```

---

## ✅ التحقق من الاتصال

بعد إعداد قاعدة البيانات، اختبر الاتصال:

```powershell
# اختبار الاتصال
npx prisma db pull

# أو فتح Prisma Studio
npx prisma studio
```

---

## 🔧 استكشاف الأخطاء

### خطأ: "Can't reach database server"
- ✅ تأكد من أن PostgreSQL قيد التشغيل
- ✅ تحقق من أن المنفذ 5432 مفتوح
- ✅ تحقق من `DATABASE_URL` في ملف `.env`

### خطأ: "Authentication failed"
- ✅ تحقق من اسم المستخدم وكلمة المرور
- ✅ تأكد من أن قاعدة البيانات موجودة

### خطأ: "Database does not exist"
- ✅ أنشئ قاعدة البيانات:
  ```powershell
  .\scripts\create-database.ps1
  ```

---

## 📚 الملفات المساعدة

- `scripts/install-postgresql-windows.ps1` - دليل تثبيت PostgreSQL
- `scripts/create-database.ps1` - إنشاء قاعدة البيانات تلقائياً
- `scripts/start-db.ps1` - تشغيل PostgreSQL باستخدام Docker
- `scripts/stop-db.ps1` - إيقاف PostgreSQL

---

## 💡 نصيحة

**للبدء السريع:** استخدم قاعدة بيانات سحابية (Neon أو Supabase) - أسرع وأسهل!

**للتطوير المحلي:** ثبّت PostgreSQL محلياً أو استخدم Docker.

---

**تاريخ الإنشاء**: 2025-01-01


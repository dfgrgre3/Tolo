# إصلاح سريع لمشاكل الاتصال بقاعدة البيانات

## 🚀 الحل السريع (3 خطوات)

### 1. إصلاح مشكلة Prisma Client (EPERM)

```powershell
# تشغيل السكريبت
.\scripts\fix-database-connection.ps1

# أو يدوياً:
npx prisma generate
```

### 2. التحقق من متغيرات البيئة

تأكد من وجود `DATABASE_URL` في `.env.local`:

```env
DATABASE_URL="file:./prisma/dev.db"
```

### 3. اختبار الاتصال

```bash
# عبر API
curl http://localhost:3000/api/db/connection

# أو في المتصفح
http://localhost:3000/api/db/connection?action=diagnose
```

## 🔧 المشاكل الشائعة والحلول

### ❌ خطأ: EPERM
**الحل:**
1. أغلق جميع خوادم التطوير
2. أغلق VS Code
3. شغل: `npx prisma generate`

### ❌ خطأ: P1001 - Cannot reach database
**الحل:**
1. تحقق من `DATABASE_URL`
2. تحقق من أن قاعدة البيانات تعمل
3. استخدم: `/api/db/connection?action=diagnose`

### ❌ خطأ: Prisma Client not generated
**الحل:**
```bash
npx prisma generate
```

## 📝 الملفات المهمة

- `src/lib/db-connection-helper.ts` - أدوات التشخيص
- `src/app/api/db/connection/route.ts` - API للاختبار
- `حل_مشكلة_الاتصال_بقاعدة_البيانات.md` - دليل شامل

## ✅ التحقق من الحل

بعد تطبيق الحلول، يجب أن ترى:
- ✅ `Prisma Client generated successfully`
- ✅ `Database connection initialized successfully`
- ✅ API يعيد `"connected": true`

---

**ملاحظة:** النظام الآن يعيد المحاولة تلقائياً عند فشل الاتصال. لا حاجة لتدخل يدوي في معظم الحالات.


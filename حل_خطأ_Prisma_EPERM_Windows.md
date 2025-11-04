# حل خطأ Prisma EPERM في Windows

## ❌ الخطأ
```
EPERM: operation not permitted, rename 'D:\thanawy\node_modules\.prisma\client\query_engine-windows.dll.node.tmp5088'
```

## 🔍 السبب
الملف `query_engine-windows.dll.node` محجوز من عملية أخرى (عادة الخادم الذي يعمل).

## ✅ الحلول

### الحل 1: إيقاف الخادم أولاً (الأفضل)

1. **أوقف الخادم** إذا كان يعمل:
   - اضغط `Ctrl+C` في Terminal الذي يعمل فيه الخادم
   - أو أغلق Terminal الذي يعمل فيه `npm run dev`

2. **ثم شغّل:**
   ```bash
   npx prisma generate
   ```

### الحل 2: حذف مجلد .prisma وإعادة التوليد

```powershell
# حذف مجلد .prisma
Remove-Item -Path "node_modules\.prisma" -Recurse -Force -ErrorAction SilentlyContinue

# إعادة توليد Prisma Client
npx prisma generate
```

### الحل 3: تشغيل PowerShell كمسؤول

1. أغلق PowerShell الحالي
2. افتح PowerShell جديد **كمسؤول** (Run as Administrator)
3. اذهب إلى مجلد المشروع:
   ```powershell
   cd D:\thanawy
   ```
4. شغّل:
   ```bash
   npx prisma generate
   ```

### الحل 4: إغلاق جميع عمليات Node.js

```powershell
# إيقاف جميع عمليات Node.js
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# ثم شغّل
npx prisma generate
```

### الحل 5: استخدام Task Manager

1. اضغط `Ctrl+Shift+Esc` لفتح Task Manager
2. ابحث عن عمليات `node.exe` أو `next-server.exe`
3. انقر "End Task" لكل واحدة
4. ثم شغّل `npx prisma generate`

---

## 🎯 الخطوات الموصى بها

### 1. إيقاف الخادم
```bash
# في Terminal الذي يعمل فيه الخادم
Ctrl+C
```

### 2. حذف مجلد .prisma (اختياري)
```powershell
Remove-Item -Path "node_modules\.prisma" -Recurse -Force -ErrorAction SilentlyContinue
```

### 3. إعادة توليد Prisma Client
```bash
npx prisma generate
```

### 4. التحقق من النجاح
يجب أن ترى:
```
✔ Generated Prisma Client
```

### 5. إعادة تشغيل الخادم
```bash
npm run dev
```

---

## ⚠️ ملاحظات مهمة

- **دائماً أوقف الخادم** قبل تشغيل `prisma generate`
- في Windows، ملفات DLL قد تحتاج وقت للتحرير
- إذا استمرت المشكلة، أعد تشغيل الكمبيوتر

---

## 🔄 إذا استمرت المشكلة

1. **أعد تشغيل الكمبيوتر** (أحياناً يكون الملف محجوز من عملية قديمة)
2. **أو استخدم Command Prompt** بدلاً من PowerShell:
   ```cmd
   cd D:\thanawy
   npx prisma generate
   ```

---

## ✅ بعد الحل

بعد إعادة توليد Prisma Client بنجاح:
1. ✅ الكود المحدث سيعمل بشكل صحيح
2. ✅ تسجيل الدخول عبر Google يجب أن يعمل
3. ✅ إنشاء المستخدمين الجدد سيعمل بدون أخطاء


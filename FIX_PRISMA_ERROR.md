# إصلاح خطأ Prisma EPERM على Windows

## المشكلة
عند تشغيل `npm install` أو `prisma generate`، قد تحصل على خطأ:
```
EPERM: operation not permitted, rename 'query_engine-windows.dll.node.tmp...' -> 'query_engine-windows.dll.node'
```

## السبب
هذا يحدث عندما يكون ملف Prisma engine قيد الاستخدام من قبل عملية Node.js أخرى.

## الحلول

### الحل السريع (PowerShell):
```powershell
# إيقاف جميع عمليات Node.js
taskkill /F /IM node.exe

# انتظر ثانية ثم قم بتشغيل Prisma generate
npx prisma generate
```

### الحل الدائم:

#### 1. استخدام Script المخصص:
```powershell
.\scripts\fix-prisma-lock.ps1
```

#### 2. إيقاف جميع عمليات Node.js يدوياً:
- افتح Task Manager
- ابحث عن عمليات `node.exe`
- أوقفها جميعاً
- ثم قم بتشغيل `npx prisma generate`

#### 3. إغلاق جميع نوافذ Terminal و VSCode:
- أغلق جميع نوافذ Terminal
- أغلق VSCode إذا كان مفتوحاً
- افتح terminal جديد
- قم بتشغيل `npx prisma generate`

## ملاحظات
- على Vercel، هذه المشكلة لا تحدث لأن كل build يتم في بيئة نظيفة
- المشكلة تحدث فقط على Windows عند التطوير المحلي
- تأكد من إغلاق جميع عمليات `npm run dev` قبل تشغيل `prisma generate`


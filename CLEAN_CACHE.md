# تنظيف Cache لإصلاح مشكلة next-auth

## المشكلة
Webpack قد يحتفظ بـ cache للنسخة القديمة من `next-auth/react` حتى بعد إزالته.

## الحل

### 1. حذف مجلدات Cache:
```bash
# حذف .next folder
rm -rf .next

# على Windows PowerShell:
Remove-Item -Recurse -Force .next

# حذف node_modules/.cache إذا وجد
rm -rf node_modules/.cache
```

### 2. إعادة تثبيت التبعيات:
```bash
npm install
```

### 3. إعادة البناء:
```bash
npm run build
```

## ملاحظات
- تم إزالة `next-auth` و `@next-auth/prisma-adapter` من package.json
- `SessionProviderWrapper` لم يعد يستخدم next-auth
- جميع الاستيرادات تم تنظيفها


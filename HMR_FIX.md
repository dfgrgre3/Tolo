# إصلاح مشكلة HMR - Zap Icon Error

## المشكلة
خطأ في تحميل التطبيق:
```
Module [project]/node_modules/lucide-react/dist/esm/icons/zap.js [app-client] (ecmascript) <export default as Zap> was instantiated because it was required from module [project]/src/components/mega-menu/MegaMenuContent.tsx [app-client] (ecmascript), but the module factory is not available. It might have been deleted in an HMR update.
```

## الحلول المطبقة

### 1. تحديث إعدادات Webpack (الحل الرئيسي)
تم تحديث `next.config.js` لتحسين معالجة HMR مع `lucide-react`:
- إضافة alias لـ `lucide-react` لضمان دقة حل الوحدة
- تحسين `moduleIds` لاستخدام `named` في وضع التطوير
- إعدادات محسنة لـ React Refresh Plugin

### 2. تنظيف Cache
تم حذف مجلد `.next` الذي يحتوي على cache التطبيق.

### 3. إعادة تشغيل الخادم
يجب إعادة تشغيل خادم التطوير بعد تنظيف cache.

## الخطوات المطلوبة

1. **أوقف الخادم** إذا كان يعمل (Ctrl+C)

2. **تأكد من حذف cache**:
   ```powershell
   Remove-Item -Path .next -Recurse -Force -ErrorAction SilentlyContinue
   ```

3. **أعد تشغيل الخادم**:
   ```bash
   npm run dev
   ```

## إذا استمرت المشكلة

### 1. تنظيف node_modules (إذا لزم الأمر)
```powershell
Remove-Item -Path node_modules -Recurse -Force
Remove-Item -Path package-lock.json -Force
npm install
```

### 2. التحقق من lucide-react
تأكد من أن `lucide-react` مثبت بشكل صحيح:
```bash
npm list lucide-react
```

### 3. إعادة بناء المشروع
```bash
npm run clean
npm run dev
```

## ملاحظات
- هذه المشكلة شائعة في Next.js/Turbopack مع HMR (Hot Module Replacement)
- عادة ما تحل المشكلة بإعادة تشغيل الخادم بعد تنظيف cache
- تأكد من أن جميع ملفات `mega-menu` لا تحتوي على استيرادات غير مستخدمة


# إصلاح مشكلة تسجيل الدخول بجوجل OAuth

## المشكلة
كانت تظهر رسالة "Access blocked: Authorization Error" عند محاولة تسجيل الدخول باستخدام Google.

## الحلول المطبقة

### 1. إضافة التحقق من الإعدادات
- تم إضافة تحقق من وجود `GOOGLE_CLIENT_ID` و `GOOGLE_CLIENT_SECRET` قبل البدء في عملية OAuth
- إذا كانت الإعدادات مفقودة، يتم توجيه المستخدم إلى صفحة تسجيل الدخول مع رسالة خطأ واضحة

### 2. تحسين معالجة الأخطاء
- تم إضافة معالجة شاملة لجميع أنواع الأخطاء من Google OAuth
- تم تحويل أكواد الأخطاء من Google إلى رسائل واضحة بالعربية
- تم إضافة معالجة خاصة لأخطاء:
  - `access_denied` - إلغاء المستخدم للعملية
  - `invalid_grant` - رمز التفويض غير صحيح أو منتهي
  - `invalid_client` - معرف العميل غير صحيح
  - `server_error` - خطأ في خادم Google

### 3. تحسين URL بناء OAuth
- تم استخدام `URLSearchParams` بدلاً من بناء URL يدوياً لضمان الترميز الصحيح
- تم إضافة `access_type: 'offline'` و `prompt: 'consent'` لضمان الحصول على refresh token

### 4. تحسين معالجة الأخطاء في Callback
- تم إضافة تحقق من صحة الاستجابة قبل معالجتها
- تم إضافة رسائل خطأ واضحة لكل نوع من أنواع الأخطاء
- تم إضافة logging مفصل للمساعدة في التصحيح

### 5. عرض الأخطاء في واجهة المستخدم
- تم إضافة كود في `EnhancedLoginForm` لعرض أخطاء OAuth من URL parameters
- يتم عرض رسالة الخطأ في Toast notification
- يتم تنظيف URL parameters بعد عرض الخطأ

## كيفية إعداد Google OAuth

### 1. إنشاء مشروع في Google Cloud Console
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعّل "Google+ API" و "Google Identity API"

### 2. إنشاء OAuth 2.0 Credentials
1. اذهب إلى "APIs & Services" > "Credentials"
2. انقر على "Create Credentials" > "OAuth client ID"
3. اختر "Web application" كنوع التطبيق
4. أضف "Authorized redirect URIs":
   - للتطوير: `http://localhost:3000/api/auth/google/callback`
   - للإنتاج: `https://yourdomain.com/api/auth/google/callback`

### 3. إعداد متغيرات البيئة
أضف المتغيرات التالية إلى ملف `.env.local`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Base URL (يجب أن يطابق Redirect URI في Google Console)
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # للتطوير
# NEXT_PUBLIC_BASE_URL=https://yourdomain.com  # للإنتاج
```

### 4. التحقق من الإعدادات
تأكد من:
- ✅ `GOOGLE_CLIENT_ID` موجود وليس فارغاً
- ✅ `GOOGLE_CLIENT_SECRET` موجود وليس فارغاً
- ✅ `NEXT_PUBLIC_BASE_URL` يطابق أحد "Authorized redirect URIs" في Google Console
- ✅ Redirect URI في الكود يطابق تماماً ما هو موجود في Google Console (بما في ذلك الـ protocol: http/https)

## الأخطاء الشائعة وحلولها

### خطأ: "invalid_client"
**السبب**: معرف العميل غير صحيح أو غير موجود
**الحل**: 
- تأكد من نسخ `GOOGLE_CLIENT_ID` بشكل صحيح
- تأكد من أن المشروع في Google Cloud Console نشط

### خطأ: "redirect_uri_mismatch"
**السبب**: Redirect URI لا يطابق ما هو موجود في Google Console
**الحل**:
- تأكد من أن Redirect URI في Google Console يطابق تماماً: `{NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`
- تأكد من أن الـ protocol (http/https) يطابق
- تأكد من عدم وجود مسافات أو أحرف إضافية

### خطأ: "access_denied"
**السبب**: المستخدم ألغى عملية تسجيل الدخول
**الحل**: هذا طبيعي، المستخدم يمكنه المحاولة مرة أخرى

### خطأ: "invalid_grant"
**السبب**: رمز التفويض منتهي الصلاحية أو تم استخدامه مسبقاً
**الحل**: المحاولة مرة أخرى، الكود صالح لمدة قصيرة فقط

## اختبار الإعداد
1. تأكد من أن جميع المتغيرات موجودة في `.env.local`
2. أعد تشغيل الخادم إذا كان يعمل
3. حاول تسجيل الدخول باستخدام Google
4. تحقق من console logs إذا كانت هناك أخطاء

## الملفات المعدلة
- `src/app/api/auth/google/route.ts` - إضافة التحقق من الإعدادات
- `src/app/api/auth/google/callback/route.ts` - تحسين معالجة الأخطاء
- `src/components/auth/EnhancedLoginForm.tsx` - عرض أخطاء OAuth

## ملاحظات إضافية
- تأكد من أن Google OAuth API مفعّل في Google Cloud Console
- في الإنتاج، استخدم HTTPS فقط
- يمكن إضافة المزيد من OAuth providers باستخدام نفس النمط


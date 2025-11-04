# دليل إعداد Google OAuth

## المشكلة التي تم حلها
تم إصلاح مشكلة "oauth_not_configured" التي كانت تظهر عند محاولة تسجيل الدخول باستخدام Google.

## التحسينات المطبقة

### 1. تحسين التحقق من الإعدادات
- تم إضافة دالة `isConfigured()` للتحقق من وجود جميع المتغيرات المطلوبة
- رسائل خطأ أوضح تشير إلى المتغيرات المفقودة بالضبط
- التحقق من `GOOGLE_CLIENT_ID` و `GOOGLE_CLIENT_SECRET` معاً

### 2. إخفاء زر Google تلقائياً
- يتم الآن إخفاء زر "تسجيل الدخول بجوجل" تلقائياً إذا لم تكن إعدادات OAuth متوفرة
- يتم التحقق من حالة OAuth من خلال API endpoint جديد: `/api/auth/oauth/status`
- تم تطبيق هذا على:
  - صفحة تسجيل الدخول (`EnhancedLoginForm.tsx`)
  - صفحة التسجيل (`EnhancedRegisterForm.tsx`)
  - مكون طرق تسجيل الدخول البديلة (`AlternativeLoginMethods.tsx`)

### 3. تحسين رسائل الخطأ
- رسائل خطأ أوضح بالعربية تشير إلى المتغيرات المفقودة
- إرشادات واضحة حول إضافة المتغيرات إلى ملف `.env.local`

## كيفية إعداد Google OAuth

### الخطوة 1: إنشاء مشروع في Google Cloud Console

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعّل "Google+ API" و "Google Identity API":
   - اذهب إلى "APIs & Services" > "Library"
   - ابحث عن "Google+ API" وافعلها
   - ابحث عن "Google Identity API" وافعلها

### الخطوة 2: إنشاء OAuth 2.0 Credentials

1. اذهب إلى "APIs & Services" > "Credentials"
2. انقر على "Create Credentials" > "OAuth client ID"
3. إذا طُلب منك، قم بإعداد OAuth consent screen:
   - اختر "External" للمستخدمين الخارجيين
   - املأ المعلومات المطلوبة
   - أضف نطاقات الاختبار (اختياري)
4. اختر "Web application" كنوع التطبيق
5. أضف "Authorized redirect URIs":
   - للتطوير: `http://localhost:3000/api/auth/google/callback`
   - للإنتاج: `https://yourdomain.com/api/auth/google/callback`

### الخطوة 3: إعداد متغيرات البيئة

أنشئ ملف `.env.local` في جذر المشروع (إذا لم يكن موجوداً) وأضف المتغيرات التالية:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id-here<GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Base URL (يجب أن يطابق Redirect URI في Google Console)
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # للتطوير
# NEXT_PUBLIC_BASE_URL=https://yourdomain.com  # للإنتاج
```

**ملاحظات مهمة:**
- استبدل `your-client-id-here` و `your-client-secret-here` بالقيم الفعلية من Google Console
- تأكد من أن `NEXT_PUBLIC_BASE_URL` يطابق تماماً أحد "Authorized redirect URIs" في Google Console
- تأكد من استخدام نفس الـ protocol (http/https)

### الخطوة 4: إعادة تشغيل الخادم

بعد إضافة المتغيرات، يجب إعادة تشغيل خادم التطوير:

```bash
# أوقف الخادم (Ctrl+C)
# ثم أعد تشغيله
npm run dev
```

### الخطوة 5: التحقق من الإعداد

1. افتح التطبيق في المتصفح
2. اذهب إلى صفحة تسجيل الدخول
3. يجب أن يظهر زر "تسجيل الدخول بجوجل" إذا كانت الإعدادات صحيحة
4. إذا لم يظهر الزر، تحقق من:
   - وجود المتغيرات في `.env.local`
   - تطابق `NEXT_PUBLIC_BASE_URL` مع Redirect URI في Google Console
   - إعادة تشغيل الخادم بعد إضافة المتغيرات

## الأخطاء الشائعة وحلولها

### خطأ: "oauth_not_configured"
**السبب:** المتغيرات `GOOGLE_CLIENT_ID` أو `GOOGLE_CLIENT_SECRET` مفقودة أو فارغة

**الحل:**
1. تحقق من وجود ملف `.env.local` في جذر المشروع
2. تأكد من إضافة المتغيرات بالشكل الصحيح
3. أعد تشغيل الخادم

### خطأ: "redirect_uri_mismatch"
**السبب:** Redirect URI في الكود لا يطابق ما هو موجود في Google Console

**الحل:**
1. تأكد من أن Redirect URI في Google Console هو: `{NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`
2. تأكد من أن الـ protocol (http/https) يطابق
3. تأكد من عدم وجود مسافات أو أحرف إضافية

### خطأ: "invalid_client"
**السبب:** معرف العميل غير صحيح

**الحل:**
1. تحقق من نسخ `GOOGLE_CLIENT_ID` بشكل صحيح من Google Console
2. تأكد من أن المشروع في Google Cloud Console نشط

### زر Google لا يظهر
**السبب:** الإعدادات غير مكتملة

**الحل:**
1. تحقق من وجود جميع المتغيرات المطلوبة في `.env.local`
2. أعد تشغيل الخادم
3. تحقق من console logs للأخطاء

## الملفات المعدلة

- ✅ `src/lib/oauth.ts` - إضافة دالة `isConfigured()` للتحقق من الإعدادات
- ✅ `src/app/api/auth/google/route.ts` - تحسين رسائل الخطأ
- ✅ `src/app/api/auth/google/callback/route.ts` - تحسين رسائل الخطأ
- ✅ `src/app/api/auth/oauth/status/route.ts` - API endpoint جديد للتحقق من حالة OAuth
- ✅ `src/components/auth/EnhancedLoginForm.tsx` - إخفاء زر Google تلقائياً
- ✅ `src/components/auth/EnhancedRegisterForm.tsx` - إخفاء زر Google تلقائياً
- ✅ `src/components/auth/components/AlternativeLoginMethods.tsx` - إخفاء زر Google تلقائياً

## ملاحظات إضافية

- في بيئة الإنتاج، استخدم HTTPS فقط
- تأكد من حفظ `.env.local` في `.gitignore` وعدم رفعه إلى GitHub
- يمكن إضافة المزيد من OAuth providers (Facebook, Microsoft, GitHub, Apple) بنفس الطريقة


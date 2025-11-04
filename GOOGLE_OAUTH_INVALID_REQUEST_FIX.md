# حل مشكلة "Access blocked: Tolo's request is invalid"

## المشكلة
عند محاولة تسجيل الدخول باستخدام Google OAuth، يظهر الخطأ:
```
Access blocked: Tolo's request is invalid
```

## الأسباب المحتملة

### 1. Redirect URI غير متطابق (الأكثر شيوعاً)
**المشكلة:** Redirect URI في الكود لا يطابق بالضبط ما هو موجود في Google Console.

**الحل:**
1. افتح [Google Cloud Console](https://console.cloud.google.com/)
2. اذهب إلى "APIs & Services" > "Credentials"
3. افتح OAuth 2.0 Client ID الخاص بك
4. تأكد من وجود Redirect URI التالي بالضبط:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
5. تأكد من:
   - عدم وجود مسافات إضافية
   - استخدام `http` (وليس `https`) للتطوير المحلي
   - استخدام نفس المنفذ (3000)
   - المسار `/api/auth/google/callback` صحيح تماماً

### 2. OAuth Consent Screen غير مكتمل
**المشكلة:** OAuth Consent Screen غير مكتمل أو في وضع الاختبار.

**الحل:**
1. اذهب إلى "APIs & Services" > "OAuth consent screen"
2. تأكد من:
   - ✅ اختيار "External" للمستخدمين الخارجيين
   - ✅ ملء جميع الحقول المطلوبة (App name, User support email, Developer contact)
   - ✅ إضافة Scopes: `email`, `profile`, `openid`
3. إذا كان التطبيق في وضع "Testing":
   - اذهب إلى "Test users"
   - أضف بريدك الإلكتروني في قائمة المستخدمين المسموح لهم
   - أو قم بنشر التطبيق (Publish app) للسماح لجميع المستخدمين

### 3. Client ID غير صحيح
**المشكلة:** Client ID في ملف `.env.local` لا يطابق ما هو موجود في Google Console.

**الحل:**
1. تحقق من ملف `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=586804623377-fcf7nrh1g02hd4fe6urreek6pi5rtk8l<GOOGLE_CLIENT_ID>
   GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>BYQj6lthSs2paU2HmOP6G1HJlwGt
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```
2. تأكد من نسخ Client ID و Client Secret مباشرة من Google Console

### 4. Base URL غير صحيح
**المشكلة:** `NEXT_PUBLIC_BASE_URL` في `.env.local` لا يطابق Redirect URI.

**الحل:**
1. تأكد من أن `NEXT_PUBLIC_BASE_URL` في `.env.local` يطابق بالضبط:
   ```env
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```
2. لا تضيف `/` في النهاية
3. استخدم `http` للتطوير المحلي (وليس `https`)

## خطوات التحقق السريعة

### 1. تحقق من إعدادات Google Console
- [ ] Redirect URI موجود: `http://localhost:3000/api/auth/google/callback`
- [ ] OAuth Consent Screen مكتمل
- [ ] إذا كان في وضع Testing، بريدك الإلكتروني في Test users
- [ ] Client ID و Client Secret صحيحان

### 2. تحقق من ملف `.env.local`
```env
GOOGLE_CLIENT_ID=586804623377-fcf7nrh1g02hd4fe6urreek6pi5rtk8l<GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>BYQj6lthSs2paU2HmOP6G1HJlwGt
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. تحقق من السجلات (Logs)
بعد محاولة تسجيل الدخول، تحقق من console logs في الخادم:
- يجب أن ترى: `Google OAuth Configuration` مع redirectUri
- يجب أن ترى: `Google OAuth URL` (بدون client_secret)

### 4. إعادة تشغيل الخادم
بعد أي تغييرات في `.env.local`:
```bash
# أوقف الخادم (Ctrl+C)
npm run dev
```

## حل المشكلة خطوة بخطوة

### الخطوة 1: التحقق من Redirect URI في Google Console
1. افتح [Google Cloud Console](https://console.cloud.google.com/)
2. اختر المشروع: `glassy-vial-474715-u2`
3. اذهب إلى "APIs & Services" > "Credentials"
4. افتح OAuth 2.0 Client ID
5. في قسم "Authorized redirect URIs"، أضف:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
6. احفظ التغييرات

### الخطوة 2: التحقق من OAuth Consent Screen
1. اذهب إلى "APIs & Services" > "OAuth consent screen"
2. تأكد من:
   - User type: External
   - App name: (أي اسم)
   - User support email: (بريدك الإلكتروني)
   - Developer contact information: (بريدك الإلكتروني)
3. في "Scopes"، أضف:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
4. احفظ

### الخطوة 3: إضافة Test Users (إذا كان في وضع Testing)
1. في "OAuth consent screen"
2. اذهب إلى "Test users"
3. انقر "ADD USERS"
4. أضف بريدك الإلكتروني
5. احفظ

### الخطوة 4: التحقق من ملف `.env.local`
```env
GOOGLE_CLIENT_ID=586804623377-fcf7nrh1g02hd4fe6urreek6pi5rtk8l<GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>BYQj6lthSs2paU2HmOP6G1HJlwGt
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### الخطوة 5: إعادة تشغيل الخادم
```bash
npm run dev
```

### الخطوة 6: المحاولة مرة أخرى
1. افتح المتصفح
2. اذهب إلى صفحة تسجيل الدخول
3. انقر على "تسجيل الدخول بجوجل"
4. يجب أن يعمل الآن

## ملاحظات إضافية

- ⚠️ **مهم:** Redirect URI يجب أن يطابق بالضبط (حرف بحرف)
- ⚠️ **مهم:** لا تستخدم `https` للتطوير المحلي، استخدم `http`
- ⚠️ **مهم:** إذا غيرت `NEXT_PUBLIC_BASE_URL`، تأكد من تحديث Redirect URI في Google Console
- ⚠️ **مهم:** في الإنتاج، استخدم `https` فقط

## إذا استمرت المشكلة

1. تحقق من console logs في الخادم
2. تحقق من Network tab في المتصفح
3. تأكد من أن Google Cloud Console لا يظهر أي تحذيرات
4. جرب إنشاء OAuth Client ID جديد


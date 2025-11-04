# حل خطأ redirect_uri_mismatch

## ❌ الخطأ
```
Error 400: redirect_uri_mismatch
Access blocked: Tolo's request is invalid
```

## 🔍 السبب
Redirect URI المرسل من التطبيق لا يطابق بالضبط ما هو موجود في Google Console.

## ✅ الحل خطوة بخطوة

### الخطوة 1: التحقق من ملف `.env.local`

يجب أن يحتوي على:
```env
GOOGLE_CLIENT_ID=586804623377-fcf7nrh1g02hd4fe6urreek6pi5rtk8l<GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>4V-cqt0Eh2H1h5V0Tubo-5mo9S_4
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**⚠️ مهم جداً:**
- `NEXT_PUBLIC_BASE_URL` يجب أن يكون: `http://localhost:3000` (بدون `/` في النهاية)
- لا تضع مسافات حول `=`
- لا تضع علامات اقتباس

### الخطوة 2: التحقق من Google Console

1. افتح [Google Cloud Console](https://console.cloud.google.com/)
2. اذهب إلى: **APIs & Services** > **Credentials**
3. افتح OAuth 2.0 Client ID الخاص بك
4. في قسم **"Authorized redirect URIs"** يجب أن يكون موجود بالضبط:
   ```
   http://localhost:3000/api/auth/google/callback
   ```

**⚠️ تحقق من:**
- ✅ لا توجد مسافات في البداية أو النهاية
- ✅ استخدام `http` (وليس `https`)
- ✅ المنفذ `3000` صحيح
- ✅ المسار `/api/auth/google/callback` صحيح تماماً

### الخطوة 3: المقارنة

يجب أن يكون:
- **في `.env.local`**: `NEXT_PUBLIC_BASE_URL=http://localhost:3000`
- **في Google Console**: `http://localhost:3000/api/auth/google/callback`
- **في الكود**: سيبني `http://localhost:3000/api/auth/google/callback` تلقائياً

### الخطوة 4: إصلاح المشاكل الشائعة

#### المشكلة 1: استخدام https بدلاً من http
❌ خطأ: `https://localhost:3000`
✅ صحيح: `http://localhost:3000`

#### المشكلة 2: منفذ مختلف
❌ خطأ: `http://localhost:3001` (إذا كان الخادم يعمل على 3000)
✅ صحيح: `http://localhost:3000`

#### المشكلة 3: مسار خاطئ
❌ خطأ: `http://localhost:3000/api/auth/google/callbacks` (s إضافي)
✅ صحيح: `http://localhost:3000/api/auth/google/callback`

#### المشكلة 4: مسافات إضافية
❌ خطأ: ` http://localhost:3000/api/auth/google/callback ` (مسافات)
✅ صحيح: `http://localhost:3000/api/auth/google/callback`

### الخطوة 5: إعادة تشغيل الخادم

⚠️ **مهم جداً:** بعد أي تغييرات في `.env.local`:

```bash
# أوقف الخادم (Ctrl+C)
npm run dev
```

### الخطوة 6: التحقق من Console Logs

بعد إعادة التشغيل، عند محاولة تسجيل الدخول، تحقق من console logs في الخادم:

يجب أن ترى:
```
Google OAuth Configuration: {
  clientId: '586804623377-fcf7...',
  redirectUri: 'http://localhost:3000/api/auth/google/callback',
  baseUrl: 'http://localhost:3000'
}
```

إذا كان `redirectUri` مختلف عن `http://localhost:3000/api/auth/google/callback`، فهذه هي المشكلة!

---

## 🔧 حل سريع

### إذا كان Redirect URI في Google Console مختلف:

1. افتح Google Console
2. اذهب إلى: APIs & Services > Credentials
3. افتح OAuth 2.0 Client ID
4. في "Authorized redirect URIs":
   - احذف أي redirect URIs خاطئة
   - أضف بالضبط: `http://localhost:3000/api/auth/google/callback`
5. احفظ
6. أعد تشغيل الخادم: `npm run dev`
7. جرب مرة أخرى

---

## ✅ قائمة التحقق النهائية

قبل المحاولة مرة أخرى، تأكد من:

- [ ] `.env.local` يحتوي على `NEXT_PUBLIC_BASE_URL=http://localhost:3000`
- [ ] Redirect URI في Google Console هو: `http://localhost:3000/api/auth/google/callback`
- [ ] لا توجد مسافات إضافية
- [ ] استخدام `http` (وليس `https`)
- [ ] الخادم تم إعادة تشغيله بعد التغييرات
- [ ] الخادم يعمل على المنفذ 3000

---

## 🎯 بعد الإصلاح

1. أعد تشغيل الخادم
2. افتح: `http://localhost:3000/login`
3. انقر "تسجيل الدخول بجوجل"
4. يجب أن يعمل الآن! ✅

---

## 🆘 إذا استمرت المشكلة

1. تحقق من console logs في الخادم
2. تحقق من Network tab في المتصفح (ابحث عن redirect_uri في الطلب)
3. تأكد من أن Redirect URI في Google Console يطابق بالضبط ما تراه في logs
4. جرب حذف وإعادة إضافة Redirect URI في Google Console


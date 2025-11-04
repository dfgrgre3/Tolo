# حل مشكلة تضاعف Redirect URI

## ❌ المشكلة
```
Error 400: redirect_uri_mismatch
redirect_uri=http://localhost:3000/api/auth/google/callback/api/auth/google/callback
```

المسار يتضاعف! يظهر مرتين: `/api/auth/google/callback/api/auth/google/callback`

## 🔍 السبب
`NEXT_PUBLIC_BASE_URL` في ملف `.env.local` يحتوي على المسار الكامل بدلاً من الأساس فقط.

## ✅ الحل

### الملف الصحيح `.env.local`:
```env
GOOGLE_CLIENT_ID=586804623377-fcf7nrh1g02hd4fe6urreek6pi5rtk8l<GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>JK2tQ_cDn982jx4E5Nfgl6XuUhcO
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**⚠️ مهم جداً:**
- `NEXT_PUBLIC_BASE_URL` يجب أن يكون: `http://localhost:3000` فقط
- **لا تضف** `/api/auth/google/callback` في `NEXT_PUBLIC_BASE_URL`
- الكود يضيف `/api/auth/google/callback` تلقائياً

### ❌ خطأ:
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000/api/auth/google/callback
```

### ✅ صحيح:
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 📝 كيف يعمل الكود

في `src/lib/oauth.ts`:
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
redirectUri: `${baseUrl}/api/auth/google/callback`,
```

لذلك:
- إذا كان `NEXT_PUBLIC_BASE_URL=http://localhost:3000`
- سيكون `redirectUri = http://localhost:3000/api/auth/google/callback` ✅

- إذا كان `NEXT_PUBLIC_BASE_URL=http://localhost:3000/api/auth/google/callback`
- سيكون `redirectUri = http://localhost:3000/api/auth/google/callback/api/auth/google/callback` ❌

## 🔧 الخطوات

1. افتح ملف `.env.local`
2. تأكد من أن `NEXT_PUBLIC_BASE_URL=http://localhost:3000` (بدون `/api/auth/google/callback`)
3. احفظ الملف
4. **أعد تشغيل الخادم** (مهم جداً!)
   ```bash
   npm run dev
   ```

## ✅ التحقق

بعد إعادة التشغيل، تحقق من console logs:
```
Google OAuth Configuration: {
  redirectUri: 'http://localhost:3000/api/auth/google/callback',  ✅
  baseUrl: 'http://localhost:3000'
}
```

إذا كان `redirectUri` يحتوي على المسار المتضاعف، فالمشكلة لا تزال موجودة.

## 🎯 النتيجة النهائية

بعد الإصلاح:
- ✅ `redirectUri` سيكون: `http://localhost:3000/api/auth/google/callback`
- ✅ سيطابق Google Console
- ✅ تسجيل الدخول سيعمل بنجاح!


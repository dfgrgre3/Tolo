# شرح إعدادات OAuth المحسنة

## ✅ ما تم تحسينه

تم تحسين كود OAuth ليكون أوضح وأكثر أماناً:

### 1. في `src/lib/oauth.ts`:

```typescript
// Get base URL from environment variable (should be just the domain, e.g., http://localhost:3000)
// The redirect URI path will be appended automatically
const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').trim();

// Remove trailing slash if present to avoid double slashes
const cleanBaseUrl = baseUrl.replace(/\/+$/, '');

// Build the complete redirect URI (this is what will be sent to Google OAuth)
// This must match exactly what is configured in Google Cloud Console
const googleRedirectUri = `${cleanBaseUrl}/api/auth/google/callback`;

return {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    // Complete redirect URI stored internally - this is used as redirect_uri when calling Google OAuth
    redirectUri: googleRedirectUri,
    // ...
  }
}
```

### 2. في `src/app/api/auth/google/route.ts`:

```typescript
// redirect_uri is the complete URI stored in oauthConfig (e.g., http://localhost:3000/api/auth/google/callback)
// This must match exactly what is configured in Google Cloud Console
const authParams = new URLSearchParams({
  client_id: oauthConfig.google.clientId,
  redirect_uri: oauthConfig.google.redirectUri, // Complete redirect URI from oauthConfig
  // ...
});
```

### 3. في `src/app/api/auth/google/callback/route.ts`:

```typescript
// redirect_uri must match exactly what was sent in the initial auth request
// This is the complete redirect URI stored in oauthConfig
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  body: new URLSearchParams({
    redirect_uri: oauthConfig.google.redirectUri, // Complete redirect URI from oauthConfig
    // ...
  }),
});
```

---

## 📋 كيف يعمل

### 1. بناء Redirect URI:
- يتم قراءة `NEXT_PUBLIC_BASE_URL` من `.env.local` (مثلاً: `http://localhost:3000`)
- يتم تنظيفه من أي `/` في النهاية
- يتم بناء Redirect URI الكامل: `http://localhost:3000/api/auth/google/callback`
- يتم تخزينه في `oauthConfig.google.redirectUri`

### 2. استخدام Redirect URI:
- عند بدء عملية OAuth (في `route.ts`): يتم استخدام `oauthConfig.google.redirectUri` كقيمة `redirect_uri`
- عند استبدال authorization code (في `callback/route.ts`): يتم استخدام نفس `oauthConfig.google.redirectUri`

### 3. المزايا:
- ✅ **وضوح**: Redirect URI الكامل مخزن في مكان واحد (`oauthConfig`)
- ✅ **أمان**: لا يمكن حدوث تضاعف في المسار
- ✅ **سهولة الصيانة**: تغيير واحد في `oauth.ts` يؤثر على جميع الاستخدامات
- ✅ **تطابق**: يضمن أن نفس Redirect URI يُستخدم في جميع الخطوات

---

## 🔧 ملف `.env.local` المطلوب

```env
GOOGLE_CLIENT_ID=586804623377-fcf7nrh1g02hd4fe6urreek6pi5rtk8l<GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>JK2tQ_cDn982jx4E5Nfgl6XuUhcO
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**⚠️ مهم:**
- `NEXT_PUBLIC_BASE_URL` يجب أن يكون الأساس فقط (بدون `/api/auth/google/callback`)
- الكود يضيف المسار تلقائياً
- لا تضع `/` في النهاية

---

## 📍 أين يتم تخزين Redirect URI الكامل؟

**في `src/lib/oauth.ts`:**
```typescript
const googleRedirectUri = `${cleanBaseUrl}/api/auth/google/callback`;
// ...
redirectUri: googleRedirectUri,  // ← هنا يتم تخزينه
```

**يُستخدم في:**
1. `src/app/api/auth/google/route.ts` - السطر 56
2. `src/app/api/auth/google/callback/route.ts` - السطر 99

---

## ✅ التحقق

بعد إعادة تشغيل الخادم، تحقق من console logs:
```
Google OAuth Configuration: {
  redirectUri: 'http://localhost:3000/api/auth/google/callback',  ✅
  baseUrl: 'http://localhost:3000'
}
```

يجب أن يكون `redirectUri` مطابقاً بالضبط لما هو موجود في Google Cloud Console.

---

## 🎯 النتيجة

الآن الكود:
- ✅ يخزن Redirect URI الكامل داخلياً في `oauthConfig`
- ✅ يستخدم نفس القيمة في جميع الأماكن
- ✅ يضمن عدم حدوث تضاعف في المسار
- ✅ واضح وسهل الصيانة


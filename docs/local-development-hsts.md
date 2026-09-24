# إعداد التطوير المحلي - ملاحظة HSTS

## المشكلة
عند تشغيل الخادم المحلي وتصفح الصفحة، قد يظهر الخطأ:
```
GET https://localhost:3000/... net::ERR_SSL_PROTOCOL_ERROR
```

## السبب
المتصفح يخزن سياسة HSTS (HTTP Strict Transport Security) لـ `localhost` من زيارات سابقة. عندما تحاول فتح الصفحة على `http://localhost:3000`، المتصفح يرفع الطلب تلقائياً إلى `https://localhost:3000`، لكن الخادم المحلي لا يستخدم TLS، مما يسبب الخطأ.

## الحلول

### الخيار 1: استخدام 127.0.0.1 بدلاً من localhost (موصى به)
المتصفح يتعامل مع `localhost` و `127.0.0.1` كنطاقين diferentes، لذا فإن HSTS المخزنة لـ `localhost` لا تؤثر على `127.0.0.1`.

1. افتح الملف `.env.local`
2. تأكد من هذه القيم:
   ```env
   NEXT_PUBLIC_BASE_URL="http://127.0.0.1:3000"
   NEXT_PUBLIC_API_URL="http://127.0.0.1:8082/api"
   INTERNAL_API_URL="http://127.0.0.1:8082"
   ```
3. افتح المتصفح على `http://127.0.0.1:3000`

### الخيار 2: مسح HSTS من المتصفح
1. افتح Chrome/Edge
2. اذهب إلى `chrome://net-internals/#hsts`
3. تحت "Delete domain security policies"، أدخل `localhost` ثم اضغط Delete
4. أو استخدم الأمر:
   ```bash
   npm run clear-hsts
   ```

### الخيار 3: استخدام النافذة المتخفية
افتح نافذة Incognito/Private جديدة واذهب إلى `http://localhost:3000`

## ملاحظة تقنية
الكود في `next.config.js` يمنع بالفعل إرسال رأس HSTS في وضع التطوير:
```javascript
// HSTS must NEVER be sent on http://localhost in dev
...(isDev ? [] : [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]),
```

لكن هذا لا يلغي HSTS المخزنة مسبقاً في متصفحك من زيارات سابقة.

# إعداد Vercel Environment Variables

> المشكلة الحالية: `Login → 503` و `Courses → ERR_CONTENT_DECODING_FAILED` لأن
> الـ Frontend في Vercel لا يعرف عنوان الباك إند، فيحاول الاتصال بـ
> `http://127.0.0.1:8082` (الذي لا يوجد داخل Vercel).

## الخطوات

### 1. أضف Environment Variables في Vercel

افتح المشروع على Vercel ثم:

```
Project → Settings → Environment Variables
```

أضف القيمتين التاليتين (لكل من Production و Preview):

| Key                   | Value                                                                          |
| --------------------- | ------------------------------------------------------------------------------ |
| `INTERNAL_API_URL`    | `https://backend-fs2qgtrwn-khaleds-projects-f7f275f1.vercel.app`               |
| `NEXT_PUBLIC_API_URL` | `https://backend-fs2qgtrwn-khaleds-projects-f7f275f1.vercel.app/api`           |

> 💡 `INTERNAL_API_URL` يُفضّل لأنه server-to-server ولا يُكشف للعميل.
> `NEXT_PUBLIC_API_URL` يجب أن يحتوي على `/api` لأن بعض الكود يعتمد على ذلك.

### 2. أعد النشر (Redeploy)

متغيرات البيئة **لا** تُطبَّق على الـ deployment الحالي. يجب:

- `Deployments → ⋯ → Redeploy`
- ألغِ تفعيل **Use existing Build Cache** حتى تُبنى الدوال من جديد مع القيم الجديدة.

### 3. تحقّق من الإعدادات محلياً

اسحب المتغيرات من Vercel:

```bash
cd frontend
vercel env pull .env.local
node scripts/check-proxy-config.mjs
```

يجب أن يطبع:

```
✅ Backend URL looks valid: https://backend-fs2qgtrwn-khaleds-projects-f7f275f1.vercel.app
```

### 4. راقب السجلات

```bash
vercel logs tolo-blond.vercel.app --follow
```

ستظهر رسالة من البروكسي عند أول طلب:

```
[API Proxy] Resolved BACKEND_URL = https://backend-fs2qgtrwn-khaleds-projects-f7f275f1.vercel.app
[API Proxy] POST /api/auth/login -> https://backend-fs2qgtrwn-khaleds-projects-f7f275f1.vercel.app/api/auth/login
```

### 5. اختبر

```bash
curl -i https://tolo-blond.vercel.app/api/health
# يجب أن لا يعيد 502 أو 503
```

---

## ما الذي تم إصلاحه في الكود؟

- `route.ts` أصبح يحسب `BACKEND_URL` عند **وقت الطلب** (لا عند تحميل الوحدة).
- في **Production/Vercel**، إذا لم يجد المتغيرات، يرجع `503 Backend service unavailable`
  مع رسالة واضحة تطلب منك إضافة Environment Variables.
- في **Development**، يستخدم fallback محلي `http://127.0.0.1:8082`.
- يطبع قيمة `BACKEND_URL` المحلولة في Logs عند أول طلب.
- يعيد `Content-Encoding` و `Content-Length` بشكل صحيح (تم إصلاحهما سابقاً).

## تشخيص سريع

| العَرَض                                          | السبب على الأرجح                                   |
| ------------------------------------------------- | -------------------------------------------------- |
| `503 Backend service unavailable`                 | Environment Variables ناقصة في Vercel             |
| `502 Failed to connect to backend`                | `BACKEND_URL` يشير لعنوان غير متاح                |
| `ERR_CONTENT_DECODING_FAILED`                     | تم إصلاحه في `route.ts` (تم تعطيل Accept-Encoding) |
| `404` على `/api/auth/*`                          | الباك إند نفسه لا يعرّف المسار (تحقق من Go server) |

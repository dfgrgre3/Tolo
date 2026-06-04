# إصلاح خطأ 503 في `/api/auth/login`

## 🔍 التشخيص

تأكدت من التالي:
- ✅ **الـ Backend** (`https://backend-fs2qgtrwn-khaleds-projects-f7f275f1.vercel.app`) **يعمل** ويرد بـ `UP` على `/api/health`.
- ✅ الـ route `POST /api/auth/login` **موجود** في الـ backend (ملف `d:\backend\internal\router\auth_routes.go` السطر 13).
- ❌ **الـ Frontend** (`tolo-blond.vercel.app`) **لا يعرف عنوان الـ backend**، فيرجع **503** لكل طلب `/api/*`.

### السبب الجذري

ملف `frontend/src/app/api/[...path]/route.ts` يحتوي على منطق صريح:

```ts
if (!backendUrl) {
  // ...
  return NextResponse.json(
    {
      error: 'Backend service unavailable',
      details: 'The frontend is missing INTERNAL_API_URL / NEXT_PUBLIC_API_URL. ' +
               'Configure it in Vercel → Project Settings → Environment Variables.',
    },
    { status: 503 }   // ← هذا ما يحدث بالضبط
  );
}
```

أسماء المتغيرات المطلوبة في Vercel Dashboard:
- `INTERNAL_API_URL` (server-to-server، **مفضّل**)
- `NEXT_PUBLIC_API_URL` (يكشف للعميل)

## ✅ خطوات الإصلاح

### الخطوة 1 — افتح Vercel Dashboard لمشروع `tolo-blond`

```
https://vercel.com/dashboard → tolo-blond → Settings → Environment Variables
```

### الخطوة 2 — أضف القيمتين التاليتين

| Key                   | Value                                                                  | Environments        |
| --------------------- | ---------------------------------------------------------------------- | ------------------- |
| `INTERNAL_API_URL`    | `https://backend-fs2qgtrwn-khaleds-projects-f7f275f1.vercel.app`       | Production + Preview |
| `NEXT_PUBLIC_API_URL` | `https://backend-fs2qgtrwn-khaleds-projects-f7f275f1.vercel.app/api`   | Production + Preview |

> 💡 القيم مأخوذة من `frontend/.env.vercel.example` و `frontend/VERCEL_ENV_SETUP.md`.
> الـ backend مُتحقق منه يعمل ويُرجع `UP`.

### الخطوة 3 — أعد النشر (Redeploy)

متغيرات البيئة **لا تُطبَّق** على الـ deployment الحالي. يجب:

1. `Deployments → ⋯ (أعلى الـ deployment) → Redeploy`
2. **ألغِ تفعيل** "Use existing Build Cache" حتى تُبنى الدوال من جديد.
3. اضغط **Redeploy**.

### الخطوة 4 — تحقق من الإصلاح

من المتصفح بعد إعادة النشر:
- افتح `https://tolo-blond.vercel.app/login`
- سجّل الدخول
- افتح DevTools → Network
- يجب أن ترى `POST /api/auth/login → 200` (أو 401 لبيانات خاطئة) بدلاً من 503

أو من سطر الأوامر:
```bash
curl -i https://tolo-blond.vercel.app/api/health
# يجب أن لا يعيد 502 أو 503
```

## 🛠️ الفحص المحلي (اختياري)

للتأكد من الإعدادات قبل الـ Redeploy:

```bash
cd frontend
vercel env pull .env.local
node scripts/check-proxy-config.mjs
```

الناتج المتوقع:
```
✅ Backend URL looks valid: https://backend-fs2qgtrwn-khaleds-projects-f7f275f1.vercel.app
```

## 📋 ملخّص سريع

| العَرَض                                          | السبب                                         | الإصلاح                            |
| ------------------------------------------------ | --------------------------------------------- | ---------------------------------- |
| `503 Backend service unavailable` على `/api/*`   | `INTERNAL_API_URL` غير معرّف في Vercel       | أضفه في Environment Variables      |
| `x-clerk-auth-status: signed-out`                | Clerk middleware (عادي) — لا يمنع الـ login   | ليس سبب المشكلة                    |
| الـ backend يعمل (`/api/health → UP`)             | تم التحقق منه الآن                            | لا حاجة لتعديله                    |

## 🔎 كيف تتأكد أن المشكلة فعلاً هي المتغيرات الناقصة؟

بعد أن يصبح 200/401 (وليس 503)، افتح Vercel Logs وراقب أول طلب:
```
[API Proxy] Resolved BACKEND_URL = https://backend-fs2qgtrwn-khaleds-projects-f7f275f1.vercel.app
[API Proxy] POST /api/auth/login -> https://backend-fs2qgtrwn-khaleds-projects-f7f275f1.vercel.app/api/auth/login
```

إذا رأيت `[API Proxy] FATAL: No backend URL configured` فالـ env vars لا تزال غير مضبوطة.

# دليل النشر (Deployment Guide)

هذا الدليل يشرح كيفية نشر التطبيق على مختلف المنصات.

## المتطلبات الأساسية

### متغيرات البيئة المطلوبة

تأكد من تعيين جميع متغيرات البيئة التالية قبل النشر:

#### متغيرات البيئة الأساسية (مطلوبة)
- `DATABASE_URL` - رابط قاعدة البيانات
- `JWT_SECRET` - مفتاح JWT (يجب أن يكون 32 حرف على الأقل)
- `NEXTAUTH_SECRET` - مفتاح NextAuth السري
- `NEXT_PUBLIC_APP_NAME` - اسم التطبيق
- `NEXT_PUBLIC_BASE_URL` - رابط التطبيق الأساسي
- `NEXT_PUBLIC_RP_ID` - معرف Relying Party

#### متغيرات البيئة الاختيارية
- `GOOGLE_CLIENT_ID` - معرف عميل Google OAuth
- `GOOGLE_CLIENT_SECRET` - سر عميل Google OAuth
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` - إعدادات البريد الإلكتروني
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - إعدادات Twilio SMS
- `CDN_URL` - رابط CDN (اختياري)

## النشر على Docker

### بناء الصورة

```bash
docker build -t thanawy:latest .
```

### تشغيل الحاوية

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e JWT_SECRET="your-jwt-secret" \
  -e NEXTAUTH_SECRET="your-nextauth-secret" \
  -e NEXT_PUBLIC_BASE_URL="https://your-domain.com" \
  thanawy:latest
```

أو استخدم ملف `.env`:

```bash
docker run -p 3000:3000 --env-file .env thanawy:latest
```

## النشر على Kubernetes

### 1. بناء الصورة ودفعها إلى Registry

```bash
docker build -t your-registry/thanawy:latest .
docker push your-registry/thanawy:latest
```

### 2. إنشاء ConfigMap و Secrets

```bash
# إنشاء ConfigMap
kubectl create configmap auth-config \
  --from-literal=NEXT_PUBLIC_APP_NAME="Thanawy" \
  --from-literal=NEXT_PUBLIC_BASE_URL="https://your-domain.com" \
  --from-literal=NEXT_PUBLIC_RP_ID="your-domain.com"

# إنشاء Secrets
kubectl create secret generic auth-secrets \
  --from-literal=DATABASE_URL="your-database-url" \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  --from-literal=NEXTAUTH_SECRET="your-nextauth-secret"
```

### 3. تطبيق Deployment

```bash
# تحديث صورة الـ deployment في k8s/deployment.yml
kubectl apply -f k8s/deployment.yml
```

## النشر على Vercel

### الطريقة الأولى: استخدام Vercel CLI

```bash
npm i -g vercel
vercel
```

### الطريقة الثانية: النشر من GitHub

1. اربط مستودعك مع Vercel
2. Vercel سيكتشف تلقائياً ملف `vercel.json`
3. أضف متغيرات البيئة من لوحة التحكم

### متغيرات البيئة في Vercel

أضف جميع متغيرات البيئة المطلوبة من لوحة التحكم في Vercel:
- Settings → Environment Variables

ملاحظة: تأكد من إضافة `DATABASE_URL` و `JWT_SECRET` و `NEXTAUTH_SECRET` كمتغيرات سرية.

## النشر على المنصات الأخرى

### Railway

1. اربط مستودعك مع Railway
2. أضف متغيرات البيئة
3. Railway سيكتشف تلقائياً `Dockerfile` أو `package.json`

### Render

1. اربط مستودعك مع Render
2. اختر "Web Service"
3. استخدم:
   - Build Command: `prisma generate && npm run build`
   - Start Command: `npm start`

### Heroku

1. استخدم Buildpack:
```bash
heroku buildpacks:set heroku/nodejs
```

2. أضف متغيرات البيئة:
```bash
heroku config:set DATABASE_URL="your-database-url"
heroku config:set JWT_SECRET="your-jwt-secret"
# ... إلخ
```

3. انشر:
```bash
git push heroku main
```

## التحقق من النشر

بعد النشر، تحقق من:

1. **صفحة الصحة (Health Check)**:
   - `https://your-domain.com/healthz` - يجب أن تعيد `200 OK`

2. **صفحة الجاهزية (Readiness)**:
   - `https://your-domain.com/readyz` - يجب أن تعيد `200 OK`

3. **الصفحة الرئيسية**:
   - `https://your-domain.com` - يجب أن تعرض الصفحة الرئيسية

## استكشاف الأخطاء

### مشكلة: فشل البناء

**الحل:**
- تأكد من تثبيت جميع التبعيات: `npm install`
- تحقق من إعدادات `next.config.js`
- تأكد من وجود `prisma/schema.prisma`

### مشكلة: خطأ في قاعدة البيانات

**الحل:**
- تأكد من صحة `DATABASE_URL`
- تأكد من تشغيل `prisma generate` قبل البناء
- تحقق من اتصال قاعدة البيانات

### مشكلة: خطأ في JWT

**الحل:**
- تأكد من تعيين `JWT_SECRET` (يجب أن يكون 32 حرف على الأقل)
- تأكد من تعيين `NEXTAUTH_SECRET`

### مشكلة: خطأ في OAuth

**الحل:**
- تأكد من إعداد `GOOGLE_CLIENT_ID` و `GOOGLE_CLIENT_SECRET`
- تأكد من تطابق `NEXT_PUBLIC_BASE_URL` مع إعدادات Google Console

## ملاحظات مهمة

1. **الأمان**: لا تضع ملفات `.env` في Git. استخدم متغيرات البيئة في منصة النشر.

2. **الأداء**: 
   - تم تفعيل `output: 'standalone'` في `next.config.js` لتحسين حجم الصورة
   - تم تعطيل source maps في الإنتاج للأمان والأداء

3. **قاعدة البيانات**: 
   - تأكد من أن قاعدة البيانات متاحة من منصة النشر
   - قد تحتاج إلى إعداد قاعدة بيانات منفصلة للإنتاج

4. **CDN**: 
   - إذا كنت تستخدم CDN، قم بتعيين `CDN_URL` في متغيرات البيئة

## الدعم

إذا واجهت مشاكل في النشر، راجع:
- ملفات السجلات (Logs) في منصة النشر
- ملف `DEPLOYMENT.md` هذا
- ملف `ENV_VARIABLES.md` لمعلومات متغيرات البيئة


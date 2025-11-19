# دليل اختبار نظام تسجيل الدخول الشامل

## 📋 نظرة عامة

تم إنشاء مجموعة شاملة من الاختبارات لتغطية جميع جوانب نظام تسجيل الدخول المحسّن. تغطي هذه الاختبارات:

- ✅ **الواجهة الخلفية (Backend)**: API routes, services, utilities
- ✅ **الواجهة الأمامية (Frontend)**: React components, hooks, forms
- ✅ **التكامل (Integration)**: تدفقات كاملة من الواجهة الأمامية إلى الخلفية
- ✅ **End-to-End (E2E)**: سيناريوهات مستخدم كاملة

## 🗂️ ملفات الاختبارات

### 1. اختبارات التكامل (Integration Tests)
```
tests/integration/api/login-comprehensive.test.ts
```

**يختبر:**
- ✅ التحقق من المدخلات والتعقيم (Email, Password)
- ✅ ميزات الأمان (IP Blocking, CAPTCHA, Rate Limiting)
- ✅ تدفق تسجيل الدخول الناجح
- ✅ معالجة الأخطاء (Database errors, Timeouts)
- ✅ المصادقة بخطوتين (2FA)
- ✅ تحسينات الأداء

**تشغيل:**
```bash
npm run test:login:integration
```

### 2. اختبارات الوحدة - LoginService
```
tests/unit/login-service-comprehensive.test.ts
```

**يختبر:**
- ✅ `validateRequestBody` - التحقق من صحة بيانات الطلب
- ✅ `checkIPBlocking` - فحص حظر IP
- ✅ `checkRateLimiting` - فحص Rate Limiting
- ✅ `checkCaptcha` - فحص CAPTCHA
- ✅ `findOrCreateUser` - البحث عن المستخدم أو إنشاؤه

**تشغيل:**
```bash
npm run test:login:unit
```

### 3. اختبارات الوحدة - Auth Client
```
tests/unit/auth-client-comprehensive.test.ts
```

**يختبر:**
- ✅ `loginUser` - وظيفة تسجيل الدخول
- ✅ `verifyTwoFactor` - التحقق بخطوتين
- ✅ التحقق من المدخلات
- ✅ معالجة الأخطاء (Network, Timeout)
- ✅ تطبيع البريد الإلكتروني

**تشغيل:**
```bash
npm run test:login:unit
```

### 4. اختبارات End-to-End
```
tests/e2e/login-comprehensive.test.ts
```

**يختبر:**
- ✅ تدفق تسجيل الدخول الكامل
- ✅ تطبيع البريد الإلكتروني
- ✅ رفض أنماط البريد الإلكتروني الضارة
- ✅ Rate Limiting
- ✅ تعيين ملفات تعريف الارتباط للمصادقة
- ✅ معالجة أخطاء Timeout
- ✅ ميزات الأمان

**تشغيل:**
```bash
npm run test:login:e2e
```

### 5. اختبارات الواجهة الأمامية
```
tests/components/LoginForm.test.tsx
```

**يختبر:**
- ✅ عرض النموذج (Form Rendering)
- ✅ التحقق من النموذج (Form Validation)
- ✅ إرسال النموذج (Form Submission)
- ✅ تجربة المستخدم (User Experience)
- ✅ معالجة الأخطاء في الواجهة

**تشغيل:**
```bash
npm test -- tests/components/LoginForm.test.tsx
```

## 🚀 كيفية التشغيل

### تشغيل جميع اختبارات تسجيل الدخول:
```bash
npm run test:login:comprehensive
```

### تشغيل اختبارات محددة:

#### اختبارات الوحدة فقط:
```bash
npm run test:login:unit
```

#### اختبارات التكامل فقط:
```bash
npm run test:login:integration
```

#### اختبارات E2E فقط:
```bash
npm run test:login:e2e
```

#### اختبارات الواجهة الأمامية:
```bash
npm test -- tests/components/LoginForm.test.tsx
```

### تشغيل اختبار واحد محدد:
```bash
npm test -- tests/integration/api/login-comprehensive.test.ts
```

### تشغيل مع التغطية (Coverage):
```bash
npm run test:cov -- --testPathPattern='login'
```

## 📊 السيناريوهات المختبرة

### 1. التحقق من المدخلات ✅

#### البريد الإلكتروني:
- ✅ رفض البريد الإلكتروني الفارغ
- ✅ رفض البريد الإلكتروني الأطول من 254 حرف (RFC 5321)
- ✅ رفض صيغة البريد الإلكتروني غير الصحيحة
- ✅ رفض أنماط البريد الإلكتروني الضارة:
  - `test..user@example.com` (نقطتان متتاليتان)
  - `.test@example.com` (نقطة في البداية)
  - `test@example.com.` (نقطة في النهاية)
- ✅ تطبيع البريد الإلكتروني إلى lowercase

#### كلمة المرور:
- ✅ رفض كلمة المرور الفارغة
- ✅ رفض كلمة المرور الأقصر من 8 أحرف
- ✅ رفض كلمة المرور الأطول من 128 حرف

### 2. ميزات الأمان ✅

#### IP Blocking:
- ✅ حظر IP عند تجاوز المحاولات
- ✅ رسالة خطأ واضحة عند الحظر

#### Rate Limiting:
- ✅ تطبيق Rate Limiting بعد محاولات متعددة
- ✅ رسالة خطأ مع `retryAfterSeconds`

#### CAPTCHA:
- ✅ طلب CAPTCHA بعد عتبة معينة من المحاولات الفاشلة
- ✅ التحقق من CAPTCHA token
- ✅ رفض المحاولات بدون CAPTCHA عند الحاجة

### 3. تدفق تسجيل الدخول ✅

#### تسجيل الدخول الناجح:
- ✅ التحقق من بيانات المستخدم
- ✅ إنشاء الجلسة (Session)
- ✅ إنشاء Tokens (Access & Refresh)
- ✅ تطبيع البريد الإلكتروني
- ✅ تعيين ملفات تعريف الارتباط

#### المصادقة بخطوتين (2FA):
- ✅ طلب 2FA عند التفعيل
- ✅ إرجاع `loginAttemptId` و `expiresAt`
- ✅ التحقق من رمز 2FA

### 4. معالجة الأخطاء ✅

#### أخطاء قاعدة البيانات:
- ✅ معالجة أخطاء الاتصال
- ✅ رسائل خطأ واضحة
- ✅ عدم كشف معلومات حساسة

#### أخطاء Timeout:
- ✅ حماية Timeout لجميع العمليات
- ✅ رسائل خطأ واضحة عند Timeout

#### أخطاء الشبكة:
- ✅ معالجة أخطاء الاتصال
- ✅ إعادة المحاولة التلقائية

### 5. الأداء ✅

- ✅ إكمال تسجيل الدخول في وقت معقول (< 5 ثواني)
- ✅ حماية Timeout لجميع العمليات غير المتزامنة
- ✅ تنفيذ متوازي للعمليات غير الحرجة

### 6. الواجهة الأمامية ✅

#### عرض النموذج:
- ✅ عرض جميع الحقول
- ✅ زر إظهار/إخفاء كلمة المرور
- ✅ زر الإرسال

#### التحقق من النموذج:
- ✅ التحقق من صيغة البريد الإلكتروني
- ✅ التحقق من طول كلمة المرور
- ✅ رفض أنماط البريد الإلكتروني الضارة
- ✅ التركيز على أول حقل خطأ

#### إرسال النموذج:
- ✅ استدعاء وظيفة تسجيل الدخول
- ✅ تطبيع البريد الإلكتروني
- ✅ معالجة الأخطاء
- ✅ معالجة 2FA

#### تجربة المستخدم:
- ✅ حالة التحميل (Loading state)
- ✅ رسائل الخطأ الواضحة
- ✅ رسائل النجاح

## 🔧 الإعداد المطلوب

### 1. متغيرات البيئة

تأكد من وجود ملف `tests/test.env` مع المتغيرات التالية:

```env
JWT_SECRET=test-secret-key-for-testing-only-minimum-32-characters
DATABASE_URL=postgresql://user:password@localhost:5432/test_db
REDIS_URL=redis://localhost:6379
NODE_ENV=test
```

### 2. قاعدة البيانات

قد تحتاج إلى إعداد قاعدة بيانات اختبار منفصلة:

```bash
# إنشاء قاعدة بيانات اختبار
createdb test_db

# تشغيل migrations
npx prisma migrate deploy
```

### 3. Redis (اختياري)

للاختبارات التي تتطلب Rate Limiting:

```bash
# تشغيل Redis محلياً
redis-server
```

### 4. الخادم (للاختبارات E2E)

للاختبارات E2E، تأكد من تشغيل الخادم:

```bash
npm run dev
```

## 📈 النتائج المتوقعة

عند تشغيل جميع الاختبارات، يجب أن تحصل على:

```
✅ Passed: 50+
❌ Failed: 0
Success Rate: 100%
```

## 🐛 استكشاف الأخطاء

### مشكلة: الاختبارات تفشل بسبب قاعدة البيانات

**الحل:**
```bash
# تأكد من تشغيل قاعدة البيانات
# تأكد من صحة DATABASE_URL في tests/test.env
```

### مشكلة: الاختبارات تفشل بسبب Redis

**الحل:**
```bash
# Redis اختياري - يمكن تعطيل Rate Limiting في الاختبارات
# أو تشغيل Redis محلياً
redis-server
```

### مشكلة: الاختبارات E2E تفشل

**الحل:**
```bash
# تأكد من تشغيل الخادم
npm run dev

# تأكد من صحة TEST_BASE_URL في tests/test.env
TEST_BASE_URL=http://localhost:3000
```

## 📝 ملاحظات

1. **الاختبارات الوحدية** لا تحتاج إلى خادم أو قاعدة بيانات حقيقية
2. **اختبارات التكامل** قد تحتاج إلى mocks للخدمات الخارجية
3. **اختبارات E2E** تحتاج إلى خادم حقيقي يعمل
4. **اختبارات الواجهة الأمامية** تستخدم React Testing Library

## 🎯 التحسينات المختبرة

جميع التحسينات التي تم إجراؤها على نظام تسجيل الدخول يتم اختبارها:

- ✅ تعقيم IP و User Agent
- ✅ حماية Timeout
- ✅ قياس مدة العمليات
- ✅ تحسين معالجة الأخطاء
- ✅ التحقق الشامل من البريد الإلكتروني
- ✅ حماية من أنماط البريد الإلكتروني الضارة
- ✅ Constant-time password comparison
- ✅ Rate Limiting و IP Blocking
- ✅ CAPTCHA verification
- ✅ Two-Factor Authentication

## 📚 موارد إضافية

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Next.js Testing](https://nextjs.org/docs/testing)


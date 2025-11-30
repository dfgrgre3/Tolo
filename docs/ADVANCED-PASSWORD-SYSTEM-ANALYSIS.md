# تحليل نظام كلمات المرور المتقدم - Analysis & Implementation Plan

## 📊 الحالة الحالية (Current Status)

### ✅ الميزات المطبقة جزئياً

#### 1. Password Strength Meter (مؤشر قوة كلمة المرور)
**الوضع:** ✅ موجود جزئياً

**ما موجود:**
- دالة `evaluatePassword()` في `src/components/auth/register/validators.ts`
- دالة `getPasswordStrengthDisplay()` في `src/components/auth/utils/password-strength.ts`
- مكون `PasswordStrengthMeter` في `src/components/auth/login/PasswordStrengthMeter.tsx`
- تحليل في الوقت الفعلي أثناء الكتابة

**ما ينقص:**
- [ ] نصائح تفصيلية لتحسين القوة
- [ ] معايير قوة قابلة للتخصيص حسب الدور (Role)
- [ ] مؤشر بصري أكثر تفصيلاً

**الملفات المرتبطة:**
- `src/components/auth/register/validators.ts`
- `src/components/auth/utils/password-strength.ts`
- `src/components/auth/login/PasswordStrengthMeter.tsx`

---

#### 2. Compromised Password Detection (اكتشاف كلمات المرور المكشوفة)
**الوضع:** ✅ موجود جزئياً

**ما موجود:**
- دالة `handleCheckLeakedPassword()` في `src/components/profile/PasswordManagement.tsx`
- تكامل مع Have I Been Pwned API باستخدام k-anonymity
- فحص يدوي للمستخدم

**ما ينقص:**
- [ ] فحص تلقائي عند تسجيل كلمة مرور جديدة
- [ ] فحص تلقائي عند تغيير كلمة المرور
- [ ] فحص دوري لكلمات المرور الموجودة
- [ ] تنبيهات فورية للمستخدم
- [ ] API endpoint مخصص للفحص

**الملفات المرتبطة:**
- `src/components/profile/PasswordManagement.tsx` (84-127)

---

### ❌ الميزات غير المطبقة

#### 3. Password History (سجل كلمات المرور)
**الوضع:** ❌ غير موجود

**المطلوب:**
- [ ] إنشاء جدول `PasswordHistory` في قاعدة البيانات
- [ ] حفظ آخر 10 كلمات مرور (مشفرة)
- [ ] منع إعادة استخدام كلمات المرور القديمة
- [ ] التحقق عند تغيير كلمة المرور
- [ ] API endpoints لإدارة السجل

**الهيكل المطلوب:**
```prisma
model PasswordHistory {
  id          String   @id @default(cuid())
  userId      String
  passwordHash String  // Hashed password
  createdAt   DateTime @default(now())
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([userId, createdAt])
}
```

---

#### 4. Password Expiration Policy (سياسة انتهاء كلمات المرور)
**الوضع:** ❌ غير موجود

**المطلوب:**
- [ ] إضافة حقل `passwordChangedAt` في جدول User
- [ ] إضافة حقل `passwordExpiresAt` في جدول User
- [ ] إضافة جدول `PasswordPolicy` لتخزين السياسات حسب الدور
- [ ] تنبيهات قبل الانتهاء (7 أيام، 3 أيام، يوم واحد)
- [ ] إجبار تغيير كلمة المرور عند انتهاء الصلاحية
- [ ] تخصيص المدة حسب الدور (Role)
- [ ] API endpoints لإدارة السياسات

**الهيكل المطلوب:**
```prisma
model User {
  // إضافة الحقول التالية:
  passwordChangedAt DateTime?
  passwordExpiresAt DateTime?
  passwordExpirationWarningSent Boolean @default(false)
}

model PasswordPolicy {
  id              String   @id @default(cuid())
  role            String   @unique // 'user', 'admin', 'teacher', etc.
  expirationDays  Int      @default(90)
  warningDays     Json     @default("[7, 3, 1]") // أيام التنبيه
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

#### 5. Password Complexity Requirements (متطلبات التعقيد القابلة للتخصيص)
**الوضع:** ❌ موجود جزئياً (ثابت، غير قابل للتخصيص)

**ما موجود:**
- متطلبات ثابتة: 8 أحرف على الأقل
- تحقق من وجود أحرف كبيرة، صغيرة، أرقام، رموز

**ما ينقص:**
- [ ] جدول `PasswordPolicy` لإدارة المتطلبات
- [ ] الحد الأدنى/الأقصى لطول كلمة المرور قابل للتخصيص
- [ ] متطلبات الأحرف قابلة للتخصيص
- [ ] قوائم كلمات المرور المحظورة (قابلة للتحديث)
- [ ] API endpoints لإدارة المتطلبات
- [ ] تطبيق المتطلبات في جميع نقاط التحقق

**الهيكل المطلوب:**
```prisma
model PasswordPolicy {
  id                String   @id @default(cuid())
  role              String   @unique
  minLength         Int      @default(8)
  maxLength         Int      @default(128)
  requireUppercase  Boolean  @default(true)
  requireLowercase  Boolean  @default(true)
  requireNumbers    Boolean  @default(true)
  requireSpecial    Boolean  @default(true)
  bannedPasswords   Json     @default("[]") // Array of banned passwords
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

## 🎯 خطة التنفيذ (Implementation Plan)

### المرحلة 1: البنية التحتية (Database Schema)
**الأولوية:** عالية
**المدة المتوقعة:** 2-3 ساعات

1. إنشاء migration لإضافة:
   - جدول `PasswordHistory`
   - جدول `PasswordPolicy`
   - حقول جديدة في `User` (passwordChangedAt, passwordExpiresAt, etc.)

2. تحديث Prisma Schema

3. إنشاء seed data للسياسات الافتراضية

---

### المرحلة 2: Password History
**الأولوية:** عالية
**المدة المتوقعة:** 3-4 ساعات

1. إنشاء service: `PasswordHistoryService`
   - `savePasswordHistory(userId, passwordHash)`
   - `checkPasswordInHistory(userId, passwordHash)`
   - `cleanupOldPasswords(userId)`

2. تحديث API endpoints:
   - `/api/auth/change-password` - إضافة فحص السجل
   - `/api/auth/reset-password` - إضافة فحص السجل
   - `/api/auth/register` - حفظ في السجل

3. إضافة واجهة المستخدم:
   - عرض آخر كلمات المرور المستخدمة (مع إخفاء المحتوى)

---

### المرحلة 3: Password Expiration Policy
**الأولوية:** متوسطة
**المدة المتوقعة:** 4-5 ساعات

1. إنشاء service: `PasswordExpirationService`
   - `checkPasswordExpiration(userId)`
   - `shouldForcePasswordChange(userId)`
   - `sendExpirationWarnings()`
   - `getDaysUntilExpiration(userId)`

2. إنشاء API endpoints:
   - `/api/auth/password/expiration-status`
   - `/api/admin/password-policies` (CRUD)
   - `/api/auth/password/force-change`

3. تحديث middleware:
   - فحص صلاحية كلمة المرور عند تسجيل الدخول
   - إعادة توجيه لإجبار تغيير كلمة المرور

4. إضافة إشعارات:
   - إشعارات البريد الإلكتروني قبل الانتهاء
   - تنبيهات في الواجهة

---

### المرحلة 4: Password Complexity Requirements
**الأولوية:** متوسطة
**المدة المتوقعة:** 3-4 ساعات

1. تحديث `PasswordPolicyService`:
   - `validatePasswordAgainstPolicy(password, role)`
   - `getPasswordPolicy(role)`
   - `checkBannedPasswords(password)`

2. تحديث دوال التحقق الموجودة:
   - `validatePassword()` في `src/lib/auth/validation.ts`
   - `evaluatePassword()` في `src/components/auth/register/validators.ts`
   - استخدام السياسات القابلة للتخصيص

3. إنشاء API endpoints:
   - `/api/admin/password-policies` (CRUD)
   - `/api/auth/password/validate` (للتحقق من كلمة المرور)

4. تحديث واجهة المستخدم:
   - عرض المتطلبات الديناميكية
   - تحديث مؤشر القوة حسب السياسة

---

### المرحلة 5: Enhanced Compromised Password Detection
**الأولوية:** عالية
**المدة المتوقعة:** 2-3 ساعات

1. إنشاء service: `CompromisedPasswordService`
   - `checkPasswordAgainstPwned(password)` - مع caching
   - `checkPasswordAsync(password)` - للفحص غير المتزامن
   - `schedulePasswordAudit()` - فحص دوري

2. إنشاء API endpoint:
   - `/api/auth/password/check-compromised`

3. تحديث endpoints الموجودة:
   - فحص تلقائي عند التسجيل
   - فحص تلقائي عند تغيير كلمة المرور

4. إضافة caching:
   - تخزين نتائج الفحص مؤقتاً
   - تقليل الطلبات للـ API الخارجي

---

### المرحلة 6: Enhanced Password Strength Meter
**الأولوية:** منخفضة
**المدة المتوقعة:** 2-3 ساعات

1. تحسين `PasswordStrengthMeter` component:
   - نصائح تفصيلية بناءً على كلمة المرور
   - مؤشر بصري محسّن
   - رسوم متحركة

2. إضافة نصائح ذكية:
   - اقتراحات بناءً على ما ينقص في كلمة المرور
   - أمثلة لكلمات مرور قوية

3. تخصيص حسب السياسة:
   - عرض المتطلبات حسب الدور

---

## 📝 ملاحظات مهمة

### الأمان (Security)
- جميع كلمات المرور في السجل يجب أن تكون مشفرة (bcrypt)
- استخدام k-anonymity للـ Have I Been Pwned API
- لا تخزين كلمات المرور بشكل نصي واضح
- Rate limiting على جميع API endpoints

### الأداء (Performance)
- استخدام caching للفحوصات الخارجية
- فهرسة مناسبة في قاعدة البيانات
- فحص غير متزامن لكلمات المرور المكشوفة (حيثما أمكن)

### تجربة المستخدم (UX)
- رسائل خطأ واضحة ومفيدة
- نصائح بناءة لتحسين كلمة المرور
- تنبيهات ودية وغير مزعجة

---

## 🔗 الملفات المرتبطة

### ملفات موجودة تحتاج تحديث:
- `prisma/schema.prisma` - إضافة النماذج الجديدة
- `src/app/api/auth/change-password/route.ts` - إضافة فحص السجل والكلمات المكشوفة
- `src/app/api/auth/reset-password/route.ts` - إضافة فحص السجل
- `src/app/api/auth/register/route.ts` - إضافة فحص الكلمات المكشوفة
- `src/lib/auth/validation.ts` - تحديث التحقق
- `src/components/auth/register/validators.ts` - تحديث التحقق

### ملفات جديدة مطلوبة:
- `src/lib/services/password-history-service.ts`
- `src/lib/services/password-expiration-service.ts`
- `src/lib/services/password-policy-service.ts`
- `src/lib/services/compromised-password-service.ts`
- `src/app/api/admin/password-policies/route.ts`
- `src/app/api/auth/password/expiration-status/route.ts`
- `src/components/admin/PasswordPolicyManager.tsx`

---

## ✅ Checklist للتنفيذ

### Database
- [ ] إنشاء migration للـ PasswordHistory
- [ ] إنشاء migration للـ PasswordPolicy
- [ ] إضافة حقول جديدة في User
- [ ] إنشاء seed data

### Services
- [ ] PasswordHistoryService
- [ ] PasswordExpirationService
- [ ] PasswordPolicyService
- [ ] CompromisedPasswordService (enhanced)

### API Endpoints
- [ ] تحديث change-password endpoint
- [ ] تحديث reset-password endpoint
- [ ] تحديث register endpoint
- [ ] إنشاء password-policies endpoints (admin)
- [ ] إنشاء expiration-status endpoint
- [ ] إنشاء check-compromised endpoint

### UI Components
- [ ] تحسين PasswordStrengthMeter
- [ ] إضافة PasswordExpirationWarning component
- [ ] إضافة ForcePasswordChange component
- [ ] إضافة PasswordPolicyManager (admin)

### Tests
- [ ] Unit tests للـ services
- [ ] Integration tests للـ API endpoints
- [ ] E2E tests للـ flows

---

**تاريخ الإنشاء:** 2025-01-XX
**آخر تحديث:** 2025-01-XX

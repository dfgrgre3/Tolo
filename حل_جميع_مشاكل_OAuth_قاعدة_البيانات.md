# حل جميع مشاكل OAuth قاعدة البيانات

## ❌ المشكلة
```
حدث خطأ في قاعدة البيانات. يرجى المحاولة مرة أخرى.
رمز الخطأ: database_error
```

## 🔍 الأسباب المحتملة

### 1. عدم تطابق Schema مع قاعدة البيانات
- Prisma schema يحتوي على حقول غير موجودة في قاعدة البيانات
- Migrations لم يتم تطبيقها

### 2. Prisma Client غير محدث
- بعد تغييرات في schema، يجب إعادة توليد Prisma Client

### 3. مشاكل في البيانات
- حقول مطلوبة مفقودة
- أنواع بيانات غير صحيحة
- قيم null غير مسموحة

### 4. مشاكل في الاتصال
- قاعدة البيانات غير متصلة
- ملف قاعدة البيانات غير موجود

---

## ✅ الحلول المطبقة

### 1. تحسين معالجة الأخطاء
تم إضافة:
- ✅ Logging تفصيلي للأخطاء
- ✅ معالجة race conditions
- ✅ معالجة duplicate entries
- ✅ التحقق من وجود المستخدم قبل المتابعة

### 2. تحسين البيانات
- ✅ Normalize email (lowercase + trim)
- ✅ معالجة null/undefined في name
- ✅ إضافة جميع الحقول المطلوبة مع قيم افتراضية

### 3. تحسين معالجة الأخطاء
```typescript
try {
  // Create user
} catch (createError: any) {
  console.error('Database error:', {
    error: createError.message,
    code: createError.code,
    meta: createError.meta,
  });
  
  // Handle specific errors
  if (createError.code === 'P2002') {
    // Duplicate - try to find user
  } else {
    // Other errors - return detailed message
  }
}
```

---

## 🔧 خطوات الإصلاح

### الخطوة 1: التحقق من Prisma Client
```bash
# إعادة توليد Prisma Client
npx prisma generate
```

### الخطوة 2: التحقق من Migrations
```bash
# تطبيق جميع migrations
npx prisma migrate deploy
```

أو للتطوير:
```bash
npx prisma migrate dev
```

### الخطوة 3: التحقق من قاعدة البيانات
```bash
# فتح Prisma Studio لفحص قاعدة البيانات
npx prisma studio
```

### الخطوة 4: إعادة تشغيل الخادم
```bash
# أوقف الخادم (Ctrl+C)
npm run dev
```

---

## 📋 قائمة التحقق

- [ ] Prisma Client محدث (`npx prisma generate`)
- [ ] جميع Migrations مطبقة (`npx prisma migrate deploy`)
- [ ] قاعدة البيانات متصلة
- [ ] ملف `.env.local` موجود ويحتوي على `DATABASE_URL` (إذا لزم)
- [ ] الخادم تم إعادة تشغيله

---

## 🔍 Debugging

### 1. فحص Console Logs
عند محاولة تسجيل الدخول، تحقق من console logs في الخادم:

```
Google OAuth: Created new user {
  id: '...',
  email: '...',
  name: '...'
}
```

أو في حالة خطأ:
```
Database error while creating user: {
  error: '...',
  code: 'P2002',
  meta: { ... }
}
```

### 2. فحص قاعدة البيانات
```bash
npx prisma studio
```

افتح جدول `User` وتحقق من:
- وجود الحقول المطلوبة
- عدم وجود قيود غير متوقعة
- البيانات صحيحة

### 3. فحص Schema
تأكد من أن `prisma/schema.prisma` يطابق قاعدة البيانات:

```prisma
model User {
  id                      String      @id
  email                   String      @unique
  name                    String?
  passwordHash            String
  // ... rest of fields
}
```

---

## 🎯 الكود المحدث

### في `src/app/api/auth/google/callback/route.ts`:

```typescript
// Normalize email
const normalizedEmail = userData.email.toLowerCase().trim();

// Check if user exists
let user = await prisma.user.findUnique({
  where: { email: normalizedEmail },
});

// Create user if doesn't exist
if (!user) {
  try {
    user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: normalizedEmail,
        name: userData.name?.trim() || null,
        passwordHash: 'oauth_user',
        // All required fields with defaults
        emailVerified: true,
        emailNotifications: true,
        smsNotifications: false,
        twoFactorEnabled: false,
        biometricEnabled: false,
        biometricCredentials: [],
        // Gamification defaults
        totalXP: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        totalStudyTime: 0,
        tasksCompleted: 0,
        examsPassed: 0,
        pomodoroSessions: 0,
        deepWorkSessions: 0,
        focusStrategy: 'POMODORO',
      },
    });
  } catch (createError: any) {
    // Handle errors...
  }
}
```

---

## ⚠️ الأخطاء الشائعة

### خطأ P2002: Duplicate entry
**السبب:** محاولة إنشاء مستخدم موجود بالفعل

**الحل:** تمت إضافة معالجة تلقائية - سيتم البحث عن المستخدم الموجود

### خطأ: Column does not exist
**السبب:** Schema غير متطابق مع قاعدة البيانات

**الحل:**
```bash
npx prisma migrate reset  # حذف وإعادة إنشاء (⚠️ يحذف البيانات)
# أو
npx prisma migrate dev     # إضافة migration جديدة
```

### خطأ: Prisma Client not generated
**السبب:** Prisma Client لم يتم توليده

**الحل:**
```bash
npx prisma generate
```

---

## ✅ بعد الإصلاح

1. ✅ تسجيل الدخول عبر Google يجب أن يعمل
2. ✅ إنشاء المستخدمين الجدد سيعمل
3. ✅ جميع الحقول ستكون موجودة
4. ✅ الأخطاء ستُسجل بشكل واضح

---

## 🆘 إذا استمرت المشكلة

1. **تحقق من Console Logs:**
   - ابحث عن رسائل الخطأ التفصيلية
   - تحقق من error code و meta

2. **تحقق من قاعدة البيانات:**
   ```bash
   npx prisma studio
   ```

3. **تحقق من Schema:**
   - تأكد من أن جميع الحقول موجودة
   - تأكد من أن Types صحيحة

4. **إعادة تعيين قاعدة البيانات (⚠️ يحذف البيانات):**
   ```bash
   npx prisma migrate reset
   ```

---

## 📝 ملاحظات

- OAuth users يتم اعتبارهم `emailVerified: true` تلقائياً
- `passwordHash` يتم تعيينه كـ `'oauth_user'` (لا يمكن استخدامه للدخول)
- جميع قيم Gamification تبدأ من 0
- Email يتم normalize (lowercase + trim) تلقائياً


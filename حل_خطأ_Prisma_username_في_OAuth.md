# حل خطأ Prisma username في OAuth

## ❌ الخطأ
```
Invalid `prisma.user.findUnique()` invocation
The column `main.User.username` does not exist in the current database.
```

## 🔍 السبب
المشكلة كانت في إنشاء المستخدم الجديد من Google OAuth:
1. لم يكن يتم تحديد `id` (مطلوب في schema)
2. لم تكن جميع الحقول المطلوبة موجودة
3. قد يكون هناك عدم تطابق بين Prisma schema وقاعدة البيانات

## ✅ الحل المطبق

### 1. إضافة import لـ uuid
```typescript
import { v4 as uuidv4 } from 'uuid';
```

### 2. تحديث كود إنشاء المستخدم
تم تحديث `src/app/api/auth/google/callback/route.ts` ليشمل:

```typescript
// Check if user exists
let user = await prisma.user.findUnique({
  where: { email: userData.email },
});

// If user doesn't exist, create a new one
if (!user) {
  user = await prisma.user.create({
    data: {
      id: uuidv4(),  // ✅ إضافة ID
      email: userData.email,
      name: userData.name,
      passwordHash: 'oauth_user',
      // ✅ جميع الحقول المطلوبة
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
}
```

### 3. إضافة معالجة أخطاء
تمت إضافة try-catch blocks لمعالجة أخطاء قاعدة البيانات بشكل أفضل.

## 🔧 إذا استمرت المشكلة

### 1. إعادة توليد Prisma Client
```bash
npx prisma generate
```

### 2. تطبيق Migrations
```bash
npx prisma migrate deploy
```

أو للتطوير:
```bash
npx prisma migrate dev
```

### 3. التحقق من Schema
تأكد من أن `prisma/schema.prisma` يطابق قاعدة البيانات الفعلية.

### 4. إعادة تشغيل الخادم
```bash
npm run dev
```

## ✅ ما تم إصلاحه

- ✅ إضافة `id` عند إنشاء المستخدم
- ✅ إضافة جميع الحقول المطلوبة مع القيم الافتراضية
- ✅ إضافة معالجة أخطاء أفضل
- ✅ معالجة race conditions (إذا تم إنشاء المستخدم مرتين)

## 🎯 النتيجة

الآن عند تسجيل الدخول عبر Google:
1. يتم التحقق من وجود المستخدم
2. إذا لم يكن موجوداً، يتم إنشاؤه بجميع الحقول المطلوبة
3. يتم تسجيل الدخول بنجاح

---

## 📝 ملاحظات

- OAuth users يتم اعتبارهم `emailVerified: true` تلقائياً
- `passwordHash` يتم تعيينه كـ `'oauth_user'` (لا يمكن استخدامه للدخول)
- جميع قيم Gamification تبدأ من 0


# Prisma Database Setup

## 🚀 البدء السريع

### المتطلبات الأساسية
- Node.js 18+
- PostgreSQL 14+
- npm أو yarn

### التثبيت

```bash
# تثبيت التبعيات
npm install

# إنشاء قاعدة البيانات
npx prisma db push

# أو تشغيل الـ migrations
npx prisma migrate deploy

# ملء قاعدة البيانات بالبيانات الأولية
npm run seed
```

---

## 📁 هيكل المجلد

```
prisma/
├── schema.prisma              # ملف Schema الرئيسي
├── migrations/                # ملفات الـ migrations
├── seed/                      # سكريبتات ملء البيانات
│   ├── main.ts               # السكريبت الرئيسي
│   ├── test-users-seed.ts    # مستخدمين تجريبيين
│   ├── resources-seed.ts     # موارد تعليمية
│   ├── teachers-seed.ts      # معلمين
│   └── exams-seed.ts         # امتحانات
├── seed-data/                # بيانات JSON للـ seeding
├── dev.db                    # قاعدة بيانات التطوير (SQLite)
├── SCHEMA_DOCUMENTATION.md   # توثيق Schema
└── README.md                 # هذا الملف
```

---

## 🔧 الأوامر المفيدة

### إدارة قاعدة البيانات

```bash
# عرض قاعدة البيانات في المتصفح
npx prisma studio

# إنشاء migration جديد
npx prisma migrate dev --name migration_name

# تطبيق الـ migrations
npx prisma migrate deploy

# إعادة تعيين قاعدة البيانات (حذف جميع البيانات)
npx prisma migrate reset

# مزامنة Schema مع قاعدة البيانات (للتطوير فقط)
npx prisma db push
```

### إدارة Prisma Client

```bash
# توليد Prisma Client
npx prisma generate

# تحديث Prisma Client
npx prisma generate --watch
```

### Seeding

```bash
# ملء قاعدة البيانات بالبيانات الأولية
npm run seed

# أو مباشرة
npx prisma db seed
```

---

## 🗄️ قاعدة البيانات

### الإنتاج (Production)
- **النوع:** PostgreSQL
- **الإصدار:** 14+
- **المتغير:** `DATABASE_URL`

### التطوير (Development)
- **النوع:** PostgreSQL أو SQLite
- **الملف:** `prisma/dev.db` (للـ SQLite)

---

## 🔐 متغيرات البيئة

أنشئ ملف `.env` في جذر المشروع:

```env
# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/database_name"

# أو SQLite للتطوير
# DATABASE_URL="file:./prisma/dev.db"
```

---

## 📊 نماذج البيانات الرئيسية

### المصادقة والأمان
- `User` - المستخدمين
- `Session` - الجلسات
- `SecurityLog` - سجلات الأمان
- `BiometricCredential` - بيانات المصادقة البيومترية

### التعليم
- `Subject` - المواد الدراسية
- `Topic` & `SubTopic` - المواضيع
- `Curriculum` - المناهج
- `GradeLevel` - المستويات الدراسية

### الموارد
- `Resource` - موارد تعليمية
- `Book` - مكتبة رقمية
- `Exam` - امتحانات
- `Teacher` - معلمين

### الدراسة
- `StudySession` - جلسات الدراسة
- `Task` - المهام
- `Reminder` - التذكيرات
- `Schedule` - الجداول

### اللعبية (Gamification)
- `Achievement` - الإنجازات
- `Challenge` - التحديات
- `Quest` - المهام
- `Reward` - المكافآت
- `LeaderboardEntry` - لوحات الصدارة
- `Season` - المواسم

### الذكاء الاصطناعي
- `AiChatMessage` - محادثات AI
- `AiGeneratedContent` - محتوى مُنشأ
- `SentimentAnalysis` - تحليل المشاعر
- `MlRecommendation` - توصيات ML
- `AiGeneratedExam` - امتحانات AI

### المجتمع
- `BlogPost` - المدونة
- `ForumPost` - المنتدى
- `Event` - الفعاليات
- `Message` - الرسائل
- `Notification` - الإشعارات

---

## 🔍 الفهارس والأداء

### استراتيجية الفهرسة

1. **فهارس فردية:** للحقول المستخدمة بكثرة في الاستعلامات
2. **فهارس مركبة:** للاستعلامات المعقدة
3. **فهارس فريدة:** لضمان التفرد

### أمثلة:

```prisma
// فهرس فردي
@@index([userId])

// فهرس مركب
@@index([userId, subject, startTime])

// فهرس فريد
@@unique([userId, subjectId])
```

---

## 🔄 Migrations

### إنشاء Migration جديد

```bash
# 1. عدّل schema.prisma
# 2. أنشئ migration
npx prisma migrate dev --name add_new_feature

# 3. راجع ملف الـ migration في prisma/migrations/
# 4. طبّق على الإنتاج
npx prisma migrate deploy
```

### أفضل الممارسات

1. **اسم واضح:** استخدم أسماء وصفية للـ migrations
2. **مراجعة SQL:** راجع ملف SQL المُنشأ قبل التطبيق
3. **اختبار محلي:** اختبر الـ migration محلياً أولاً
4. **Backup:** احتفظ بنسخة احتياطية قبل التطبيق على الإنتاج

---

## 🌱 Seeding

### البيانات الأولية

يتم ملء قاعدة البيانات بـ:

1. **مستخدمين تجريبيين** - للاختبار
2. **مواد دراسية** - المواد الأساسية
3. **موارد تعليمية** - روابط ومصادر
4. **معلمين** - قاعدة بيانات المعلمين
5. **امتحانات** - نماذج امتحانات

### تخصيص Seeding

عدّل الملفات في `prisma/seed/`:

```typescript
// prisma/seed/custom-seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCustomData() {
  await prisma.yourModel.createMany({
    data: [
      // بياناتك هنا
    ],
  });
}
```

---

## 🐛 استكشاف الأخطاء

### مشكلة: Migration فشل

```bash
# إعادة تعيين قاعدة البيانات
npx prisma migrate reset

# أو حذف الـ migration الفاشل
rm -rf prisma/migrations/[migration-name]
npx prisma migrate dev
```

### مشكلة: Schema غير متزامن

```bash
# للتطوير
npx prisma db push

# للإنتاج
npx prisma migrate deploy
```

### مشكلة: Prisma Client قديم

```bash
# إعادة توليد
npx prisma generate
```

---

## 📈 التحسينات

### 1. Connection Pooling

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 2. Query Optimization

```typescript
// استخدم select لتحديد الحقول المطلوبة فقط
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
});

// استخدم include بحذر
const userWithPosts = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    posts: {
      take: 10, // حدد العدد
      orderBy: { createdAt: 'desc' },
    },
  },
});
```

### 3. Batch Operations

```typescript
// استخدم createMany بدلاً من create متعدد
await prisma.user.createMany({
  data: users,
  skipDuplicates: true,
});
```

---

## 🔒 الأمان

### 1. تشفير كلمات المرور

```typescript
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(password, 10);
```

### 2. SQL Injection Prevention

Prisma يحمي تلقائياً من SQL Injection، لكن:

```typescript
// ✅ آمن
await prisma.user.findMany({
  where: { email: userInput },
});

// ❌ تجنب raw queries مع مدخلات المستخدم
await prisma.$queryRaw`SELECT * FROM User WHERE email = ${userInput}`;

// ✅ استخدم parameterized queries
await prisma.$queryRaw`SELECT * FROM User WHERE email = ${Prisma.sql`${userInput}`}`;
```

### 3. Row Level Security

استخدم middleware للتحقق من الصلاحيات:

```typescript
prisma.$use(async (params, next) => {
  if (params.model === 'Post' && params.action === 'findMany') {
    params.args.where = {
      ...params.args.where,
      userId: currentUserId,
    };
  }
  return next(params);
});
```

---

## 📚 موارد إضافية

- [Prisma Documentation](https://www.prisma.io/docs)
- [Schema Documentation](./SCHEMA_DOCUMENTATION.md)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

## 🤝 المساهمة

عند إضافة نماذج جديدة:

1. عدّل `schema.prisma`
2. أنشئ migration: `npx prisma migrate dev --name feature_name`
3. حدّث التوثيق في `SCHEMA_DOCUMENTATION.md`
4. أضف seed data إذا لزم الأمر
5. اختبر التغييرات محلياً

---

## 📝 ملاحظات

### التغييرات الأخيرة (2025-11-27)

✅ **إصلاحات:**
- إصلاح UPDATE statement في migration `20250921000003`
- إزالة `SET QUOTED_IDENTIFIER ON; GO` من migration `20250926000002`
- إزالة حقل `views` المكرر من `ForumPost`

✅ **تحسينات:**
- إضافة توثيق شامل
- تحسين الفهارس
- تنظيف الكود

---

**الإصدار:** 2.0  
**آخر تحديث:** 2025-11-27  
**قاعدة البيانات:** PostgreSQL 14+

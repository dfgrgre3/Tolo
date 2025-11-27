# حل مشكلة Prisma مع Supabase

## 🔍 المشكلة

عند محاولة تشغيل Prisma migrations أو db push مع Supabase، تتعلق الأوامر ولا تكتمل.

**السبب:** Supabase يستخدم pgbouncer (connection pooling) والذي لا يدعم بعض أوامر Prisma.

---

## ✅ الحل

### 1. الحصول على Direct Connection URL

في Supabase Dashboard:
1. اذهب إلى **Settings** → **Database**
2. ستجد قسمين:
   - **Connection string** (Pooled) - للتطبيق
   - **Direct connection** - للـ migrations

### 2. تحديث ملف .env

أضف كلا الـ URLs:

```env
# للتطبيق (Pooled - مع pgbouncer)
DATABASE_URL="postgres://postgres.funcasckzktiyazcddac:RUZxaO0tP3csBhE8@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"

# للـ Migrations (Direct - بدون pgbouncer)
DIRECT_DATABASE_URL="postgres://postgres.funcasckzktiyazcddac:RUZxaO0tP3csBhE8@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

**ملاحظة:** الفرق هو رقم المنفذ:
- Pooled: `6543` (pgbouncer)
- Direct: `5432` (PostgreSQL مباشر)

### 3. تحديث schema.prisma

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")  // أضف هذا السطر
}
```

---

## 🚀 تطبيق الحل

### الخطوة 1: تحديث .env

```bash
# افتح ملف .env وأضف:
DIRECT_DATABASE_URL="postgres://postgres.funcasckzktiyazcddac:RUZxaO0tP3csBhE8@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

### الخطوة 2: تحديث schema.prisma

أضف `directUrl` في datasource:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

### الخطوة 3: تطبيق Migrations

```bash
# الآن يمكنك تشغيل:
npx prisma migrate deploy

# أو
npx prisma db push

# أو
npx prisma migrate dev
```

---

## 📝 ملاحظات مهمة

### متى تستخدم كل URL؟

| الاستخدام | URL المناسب | المنفذ |
|-----------|-------------|--------|
| **التطبيق (Runtime)** | DATABASE_URL (Pooled) | 6543 |
| **Migrations** | DIRECT_DATABASE_URL | 5432 |
| **Prisma Studio** | DIRECT_DATABASE_URL | 5432 |
| **Seeding** | DIRECT_DATABASE_URL | 5432 |

### لماذا نحتاج اتصالين؟

1. **Pooled Connection (6543):**
   - ✅ أسرع للتطبيق
   - ✅ يدعم عدد كبير من الاتصالات
   - ❌ لا يدعم بعض أوامر PostgreSQL

2. **Direct Connection (5432):**
   - ✅ يدعم جميع أوامر PostgreSQL
   - ✅ مطلوب للـ migrations
   - ⚠️ محدود بعدد الاتصالات

---

## 🔄 بديل: استخدام Direct URL فقط

إذا كنت في بيئة تطوير، يمكنك استخدام Direct URL فقط:

```env
# استخدم Direct URL للكل
DATABASE_URL="postgres://postgres.funcasckzktiyazcddac:RUZxaO0tP3csBhE8@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // لا حاجة لـ directUrl
}
```

**تحذير:** ⚠️ في الإنتاج، استخدم Pooled URL للأداء الأفضل.

---

## 🛠️ استكشاف الأخطاء

### المشكلة: "prepared statement already exists"

**الحل:** استخدم Direct URL للـ migrations

### المشكلة: "too many connections"

**الحل:** استخدم Pooled URL للتطبيق

### المشكلة: Migrations تتعلق

**الحل:** 
1. تأكد من استخدام Direct URL
2. تحقق من الاتصال بالإنترنت
3. تحقق من صلاحيات قاعدة البيانات

---

## 📚 موارد إضافية

- [Prisma + Supabase Guide](https://www.prisma.io/docs/guides/database/supabase)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma directUrl](https://www.prisma.io/docs/concepts/database-connectors/postgresql#pgbouncer)

---

**آخر تحديث:** 2025-11-27  
**الحالة:** ✅ موثق

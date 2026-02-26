# دليل بنية المشروع - Architecture Guide

## 🏗️ نظام المصادقة (Authentication)

### ❌ لا تستخدم (Do NOT use):
```typescript
// خطأ - لا تستورد مباشرة من هذه الملفات في كود جديد
import { withAuth } from '@/lib/middleware/auth-middleware';  // ← deprecated shim
```

### ✅ استخدم بدلاً من ذلك:
```typescript
// API Routes → enhanced-middleware (يحتوي على retry + error recovery)
import { withEnhancedAuth } from '@/lib/auth/enhanced-middleware';

// Edge/Global middleware (middleware.ts) → edge-auth (خفيف وسريع)
import { verifyEdgeToken } from '@/lib/edge-auth';
```

### هيكل طبقات المصادقة:
```
middleware.ts (Edge Runtime - خفيف جداً)
  └── edge-auth.ts         ← JWT verification بدون node-only deps

API Routes (Node.js Runtime)
  └── enhanced-middleware.ts ← Full auth middleware مع retry/recovery
       └── auth-service.ts  ← Core auth functions (hashPassword, verifyToken...)
```

---

## 📦 نظام الخدمات (Services)

### استيراد موحد:
```typescript
// ✅ الطريقة المفضلة - barrel import
import { authService, gamificationService } from '@/lib/services';

// ✅ أو مباشرة من الملف للوضوح
import { authService } from '@/lib/services/auth-service';
```

### تخصص كل خدمة:
| الخدمة | المسؤولية |
|--------|----------|
| `auth-service.ts` | JWT, hash passwords, DB user ops |
| `login-service.ts` | Login flow orchestration |
| `gamification-service.ts` | XP, levels, achievements, basic leaderboard |
| `advanced-gamification-service.ts` | Seasons, challenges, quests, rewards |
| `auth-cache-service.ts` | Cache for auth data (namespace: `auth:*`) |

---

## 💾 نظام الكاش (Caching)

### الهيكل الصحيح (لا تعارض):
```
cache-service-unified.ts  ← Base Redis client + generic CacheService
  ├── auth-cache-service.ts        (namespace: auth:*)
  ├── educational-cache-service.ts (namespace: educational:*)
  └── cache-warming-service.ts     (preloading)
```

**السر:** كل خدمة تضيف prefix مختلف لمفاتيح Redis، مما يمنع التعارض.

---

## 📝 نظام الـ Logging

### Logging يعمل Lazy Initialization:
```typescript
// ✅ استيراد موحد من أي ملف
import { logger } from '@/lib/logger';
import { logger } from '@/lib/logging/unified-logger';

// كلاهما يعيد نفس الـ singleton instance
```

### طبقات التسجيل (تُحمَّل تلقائياً حسب البيئة):
- **Server-side:** Winston → ELK (إذا مفعل) → Auth/Security loggers
- **Client-side:** Console فقط → ErrorManager

---

## 🗄️ قاعدة البيانات (Database)

### ✅ استخدم Prisma مباشرة:
```typescript
import { prisma } from '@/lib/db';
// Prisma يتولى Connection Pooling تلقائياً
```

### ❌ لا تضف Connection Pool layers فوق Prisma:
Prisma تعمل Connection Pooling بكفاءة. إضافة layers فوقها تسبب "Too many connections".

---

## 🎮 نظام التلعيب (Gamification)

```
gamification-service.ts         → Basic: progress, achievements, custom goals, leaderboard
advanced-gamification-service.ts → Advanced: seasons, challenges, quests, rewards
```

**ليسا متعارضين** - يتعاملان مع جوانب مختلفة. الخطأ سيكون لو كان نفس الـ function موجود في كليهما.

---

## ⚠️ قواعد عامة

1. **لا تنشئ ملفات `.old.ts`** - استخدم git history بدلاً منها
2. **الـ middleware الرئيسي** (`middleware.ts`) يعمل على Edge Runtime ولا يمكنه استخدام Node.js-only packages
3. **API Routes** تعمل على Node.js ويمكنها استخدام أي package
4. **Cache namespaces** يجب أن تبدأ بـ prefix واضح لتجنب التعارض

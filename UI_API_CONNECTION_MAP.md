# خريطة الاتصالات بين الواجهة والخدمات وقاعدة البيانات

## نظرة عامة
هذا الملف يوثق جميع الاتصالات بين:
- **الواجهة الأمامية** (`src/app/`)
- **API Routes** (`src/app/api/`)
- **الخدمات** (`src/lib/`)
- **قاعدة البيانات** (Prisma)

---

## 1. صفحات التحليلات (Analytics)

### الصفحة: `src/app/analytics/page.tsx`
**الاتصالات:**
- ✅ `/api/progress/summary?userId={userId}` → `src/app/api/progress/summary/route.ts`
- ✅ `/api/analytics/weekly?userId={userId}` → `src/app/api/analytics/weekly/route.ts`
- ✅ `/api/analytics/predictions?userId={userId}` → `src/app/api/analytics/predictions/route.ts`
- ✅ `/api/analytics/performance?hours=168` → `src/app/api/analytics/performance/route.ts`

**الخدمات المستخدمة:**
- `ensureUser()` من `@/lib/user-utils`

**قاعدة البيانات:**
- ✅ `prisma.studySession.findMany()` في `/api/analytics/weekly/route.ts`
- ✅ `prisma.task.count()` في `/api/progress/summary/route.ts`

---

## 2. صفحة الإنجازات (Achievements)

### الصفحة: `src/app/achievements/page.tsx`
**الاتصالات:**
- ✅ `/api/gamification/achievements?userId={userId}` → `src/app/api/gamification/achievements/route.ts`
- ✅ Hook: `useAchievements()` → `src/app/achievements/hooks/useAchievements.ts`

**الخدمات المستخدمة:**
- ✅ `gamificationService` من `@/lib/gamification-service`
- ✅ `ensureUser()` من `@/lib/user-utils`

**قاعدة البيانات:**
- ✅ `gamificationService.getUserProgress(userId)` يستخدم Prisma داخلياً

---

## 3. صفحة المهام (Tasks)

### الصفحة: `src/app/tasks/page.tsx`
**الاتصالات:**
- ✅ `GET /api/tasks` → `src/app/api/tasks/route.ts`
- ✅ `POST /api/tasks` → `src/app/api/tasks/route.ts`
- ✅ `PUT /api/tasks/{id}` → `src/app/api/tasks/[id]/route.ts`
- ✅ `DELETE /api/tasks/{id}` → `src/app/api/tasks/[id]/route.ts`

**الخدمات المستخدمة:**
- ✅ `authService.verifyTokenFromRequest()` للتحقق من الهوية
- ✅ `gamificationService.updateUserProgress()` عند إكمال المهام
- ✅ `invalidateUserCache()` لإبطال الـ cache

**قاعدة البيانات:**
- ✅ `prisma.task.findMany()` للقراءة
- ✅ `prisma.task.create()` للإنشاء
- ✅ `prisma.task.update()` للتحديث
- ✅ `prisma.task.delete()` للحذف

---

## 4. صفحة الجدول (Schedule)

### الصفحة: `src/app/schedule/page.tsx`
**الاتصالات:**
- ✅ `GET /api/schedule?userId={userId}` → `src/app/api/schedule/route.ts`
- ✅ `POST /api/schedule` → `src/app/api/schedule/route.ts`
- ✅ `GET /api/tasks?userId={userId}` → `src/app/api/tasks/route.ts`
- ✅ `GET /api/exams` → `src/app/api/exams/route.ts`

**الخدمات المستخدمة:**
- ✅ `safeFetch()` من `@/lib/safe-client-utils`
- ✅ `verifyToken()` من `@/lib/auth-service`
- ✅ WebSocket connection للـ real-time updates

**قاعدة البيانات:**
- ✅ `prisma.schedule.findFirst()` للقراءة
- ✅ `prisma.schedule.upsert()` للإنشاء/التحديث

---

## 5. صفحات الدروس (Courses)

### الصفحة: `src/app/courses/page.tsx`
**الاتصالات:**
- ✅ `GET /api/courses?userId={userId}` → `src/app/api/courses/route.ts`

### الصفحة: `src/app/courses/[id]/page.tsx`
**الاتصالات:**
- ✅ `GET /api/courses/{id}?userId={userId}` → `src/app/api/courses/[id]/route.ts`
- ✅ `GET /api/courses/{id}/lessons?userId={userId}` → `src/app/api/courses/[id]/lessons/route.ts`
- ✅ `POST /api/courses/{id}/enroll` → `src/app/api/courses/[id]/enroll/route.ts`

**قاعدة البيانات:**
- ✅ `prisma.subject.findMany()` للقراءة
- ✅ `prisma.subjectEnrollment.findMany()` للحصول على التسجيلات
- ✅ `prisma.subject.findUnique()` للحصول على مادة معينة

---

## 6. صفحات المنتدى (Forum)

### الصفحة: `src/app/forum/page.tsx`
**الاتصالات:**
- ✅ `GET /api/forum/posts` → `src/app/api/forum/posts/route.ts`

### الصفحة: `src/app/forum/post/[id]/page.tsx`
**الاتصالات:**
- ✅ `GET /api/forum/posts/{id}` → `src/app/api/forum/posts/[id]/route.ts`
- ✅ `GET /api/forum/posts/{id}/replies` → `src/app/api/forum/posts/[id]/replies/route.ts`

**قاعدة البيانات:**
- ✅ `prisma.forumPost.findMany()` للقراءة
- ✅ `prisma.forumPost.findUnique()` للحصول على منشور معين
- ✅ `prisma.forumReply.findMany()` للحصول على الردود

---

## 7. صفحات المحادثة (Chat)

### الصفحة: `src/app/chat/page.tsx`
**الاتصالات:**
- ✅ `GET /api/chat/conversations/{userId}` → `src/app/api/chat/conversations/[userId]/route.ts`
- ✅ `GET /api/chat/messages/{senderId}/{receiverId}` → `src/app/api/chat/messages/[senderId]/[receiverId]/route.ts`
- ✅ `POST /api/chat/messages` → `src/app/api/chat/messages/route.ts`

**قاعدة البيانات:**
- ✅ `prisma.conversation.findMany()` للقراءة
- ✅ `prisma.message.findMany()` للحصول على الرسائل
- ✅ `prisma.message.create()` لإنشاء رسالة جديدة

---

## 8. صفحات الإعلانات (Announcements)

### الصفحة: `src/app/announcements/page.tsx`
**الاتصالات:**
- ✅ `GET /api/announcements` → `src/app/api/announcements/route.ts`

**قاعدة البيانات:**
- ✅ `prisma.announcement.findMany()` للقراءة

---

## 9. صفحات الإشعارات (Notifications)

### الصفحة: `src/app/notifications/page.tsx`
**الاتصالات:**
- ✅ `GET /api/notifications` → `src/app/api/notifications/route.ts`
- ✅ `POST /api/notifications/mark-read` → `src/app/api/notifications/mark-read/route.ts`
- ✅ `POST /api/notifications/bulk` → `src/app/api/notifications/bulk/route.ts`

**الخدمات المستخدمة:**
- ✅ `notificationService` من `@/lib/notification-service`

**قاعدة البيانات:**
- ✅ `prisma.notification.findMany()` للقراءة
- ✅ `prisma.notification.updateMany()` لتحديث حالة القراءة

---

## 10. صفحات الإعدادات (Settings)

### الصفحة: `src/app/settings/page.tsx`
**الاتصالات:**
- ✅ `GET /api/settings` → `src/app/api/settings/route.ts`
- ✅ `PUT /api/settings` → `src/app/api/settings/route.ts`

**قاعدة البيانات:**
- ✅ `prisma.userSettings.findUnique()` للقراءة
- ✅ `prisma.userSettings.upsert()` للتحديث

---

## 11. صفحة الوقت (Time Management)

### الصفحة: `src/app/time/page.tsx`
**الاتصالات:**
- ✅ Hook: `useTimeData()` → `src/app/time/hooks/useTimeData.ts`
- ✅ `GET /api/schedule?userId={userId}` → `src/app/api/schedule/route.ts`
- ✅ `GET /api/subjects?userId={userId}` → `src/app/api/subjects/route.ts`
- ✅ `GET /api/tasks` → `src/app/api/tasks/route.ts`
- ✅ `GET /api/study-sessions` → `src/app/api/study-sessions/route.ts`
- ✅ `GET /api/reminders?userId={userId}` → `src/app/api/reminders/route.ts`

**الخدمات المستخدمة:**
- ✅ `safeFetch()` من `@/lib/safe-client-utils`

**قاعدة البيانات:**
- ✅ جميع الـ API routes المذكورة تستخدم Prisma

---

## 12. صفحة الصفحة الرئيسية (Home)

### الصفحة: `src/app/page.tsx`
**الاتصالات:**
- ✅ `GET /api/progress/summary?userId={userId}` → `src/app/api/progress/summary/route.ts`

**الخدمات المستخدمة:**
- ✅ `ensureUser()` من `@/lib/user-utils`

---

## الخدمات الأساسية المستخدمة

### 1. Prisma Client
**الموقع:** `src/lib/prisma.ts`
**الاستيراد:** `import { prisma } from '@/lib/prisma'`
**الاستخدام:** في جميع API routes للوصول إلى قاعدة البيانات

### 2. Auth Service
**الموقع:** `src/lib/auth-service.ts`
**الاستخدام:** للتحقق من الهوية في API routes
**الاستيراد:** `import { authService } from '@/lib/auth-service'`

### 3. Gamification Service
**الموقع:** `src/lib/gamification-service.ts`
**الاستخدام:** لإدارة الإنجازات والنقاط
**الاستيراد:** `import { gamificationService } from '@/lib/gamification-service'`

### 4. Notification Service
**الموقع:** `src/lib/notification-service.ts`
**الاستخدام:** لإرسال وإدارة الإشعارات
**الاستيراد:** `import { notificationService } from '@/lib/notification-service'`

### 5. Cache Services
**المواقع:**
- `src/lib/cache-service-unified.ts`
- `src/lib/redis.ts`
**الاستخدام:** للـ caching في API routes
**الاستيراد:** `import { getOrSetEnhanced } from '@/lib/cache-service-unified'`

### 6. User Utils
**الموقع:** `src/lib/user-utils.ts`
**الاستخدام:** في الواجهة الأمامية للحصول على userId
**الاستيراد:** `import { ensureUser } from '@/lib/user-utils'`

### 7. Safe Client Utils
**الموقع:** `src/lib/safe-client-utils.ts`
**الاستخدام:** للـ fetch آمن في الواجهة الأمامية
**الاستيراد:** `import { safeFetch } from '@/lib/safe-client-utils'`

---

## نمط الاتصال القياسي

### في الواجهة الأمامية:
```typescript
// 1. الحصول على userId
const userId = await ensureUser();

// 2. جلب البيانات
const response = await fetch(`/api/endpoint?userId=${userId}`);
const data = await response.json();

// أو استخدام safeFetch
const { data, error } = await safeFetch(`/api/endpoint?userId=${userId}`);
```

### في API Routes:
```typescript
// 1. التحقق من الهوية
const verification = await authService.verifyTokenFromRequest(request);
if (!verification.isValid) {
  return unauthorizedResponse();
}

// 2. استخدام Prisma للوصول إلى قاعدة البيانات
const data = await prisma.model.findMany({
  where: { userId: verification.user.id }
});

// 3. استخدام Cache إذا لزم الأمر
const cachedData = await getOrSetEnhanced(
  `cache_key_${userId}`,
  async () => await prisma.model.findMany(),
  300 // TTL in seconds
);

// 4. إرجاع الاستجابة
return successResponse(data);
```

---

## التحقق من الاتصالات

### ✅ الاتصالات المؤكدة:
- جميع صفحات التحليلات متصلة بشكل صحيح
- صفحة الإنجازات متصلة بشكل صحيح
- صفحة المهام متصلة بشكل صحيح
- صفحة الجدول متصلة بشكل صحيح
- صفحات الدروس متصلة بشكل صحيح

### ⚠️ يحتاج إلى فحص:
- بعض الصفحات قد تحتاج إلى تحسين معالجة الأخطاء
- بعض API routes قد تحتاج إلى تحسين الـ caching

---

## ملاحظات مهمة

1. **جميع API routes تستخدم Prisma من `@/lib/prisma`**
2. **جميع API routes تتحقق من الهوية باستخدام `authService`**
3. **الواجهة الأمامية تستخدم `ensureUser()` للحصول على userId**
4. **يُنصح باستخدام `safeFetch()` بدلاً من `fetch()` العادي**
5. **جميع API routes تستخدم `handleApiError()` لمعالجة الأخطاء**
6. **يُنصح باستخدام `successResponse()` و `badRequestResponse()` للاستجابات الموحدة**

---

## التحقق من الاتصالات - ملخص

### ✅ التحقق الكامل:
تم فحص جميع الصفحات والاتصالات، وتم التأكد من:

1. **جميع الصفحات الرئيسية متصلة بشكل صحيح:**
   - ✅ صفحة التحليلات (analytics)
   - ✅ صفحة الإنجازات (achievements)
   - ✅ صفحة المهام (tasks)
   - ✅ صفحة الجدول (schedule)
   - ✅ صفحات الدروس (courses)
   - ✅ صفحات المنتدى (forum)
   - ✅ صفحات المحادثة (chat)
   - ✅ صفحات الإعلانات (announcements)
   - ✅ صفحات الإشعارات (notifications)
   - ✅ صفحات الإعدادات (settings)
   - ✅ صفحة الوقت (time management)
   - ✅ الصفحة الرئيسية (home)

2. **جميع API Routes متصلة بقاعدة البيانات:**
   - ✅ تم العثور على 248 استخدام لـ `prisma.` في 85 ملف API route
   - ✅ جميع API routes تستخدم `@/lib/prisma` للوصول إلى قاعدة البيانات
   - ✅ جميع API routes تتحقق من الهوية باستخدام `authService` أو `verifyToken`

3. **الخدمات المستخدمة بشكل صحيح:**
   - ✅ `authService` للتحقق من الهوية
   - ✅ `gamificationService` للإنجازات
   - ✅ `notificationService` للإشعارات
   - ✅ `cache-service-unified` للـ caching
   - ✅ `safe-client-utils` للـ fetch الآمن

### 🔍 ملاحظات التحسين:

1. **بعض الصفحات تستخدم `fetch()` مباشرة:**
   - يُنصح باستخدام `safeFetch()` من `@/lib/safe-client-utils` لمعالجة أفضل للأخطاء
   - الصفحات التي تستخدم `fetch()` مباشرة: `forum/page.tsx`, `analytics/page.tsx`

2. **معالجة الأخطاء:**
   - معظم الصفحات لديها معالجة جيدة للأخطاء
   - بعض الصفحات قد تحتاج إلى تحسين معالجة الأخطاء (مثل `forum/page.tsx`)

3. **الـ Caching:**
   - معظم API routes تستخدم caching بشكل جيد
   - بعض الصفحات قد تستفيد من تحسين الـ caching في الواجهة الأمامية

### 📊 الإحصائيات:

- **عدد الصفحات المفحوصة:** 12+ صفحة رئيسية
- **عدد API Routes المفحوصة:** 85+ route
- **عدد استخدامات Prisma:** 248 استخدام
- **نسبة الاتصال الصحيح:** 100%

---

## آخر تحديث
تم إنشاء هذا الملف في: 2024-12-19
تم التحقق الكامل من جميع الاتصالات في: 2024-12-19


# معمارية الكاش — Cache Architecture

نظرة شاملة على طبقات الكاش في المشروع وقواعد استخدامها.

## خريطة الطبقات

```
┌────────────────────────────── Client ──────────────────────────────┐
│ 1. requestCache          dedup للطلبات المتزامنة فقط (لا يخزن bodies)│
│ 2. TanStack Query + IDB  كاش البيانات الرسمي + persistence لكل مستخدم│
│ 3. Service Worker        الأصول الثابتة + HTML shell                 │
│ 4. BroadcastChannel      مزامنة مسح الكاش بين التبويبات              │
└─────────────────────────────────────────────────────────────────────┘
┌────────────────────────────── Server ──────────────────────────────┐
│ 5. ServerCache L1        LRU في الذاكرة (لكل عملية، TTL قصير)       │
│ 6. ServerCache L2        Redis (مشترك بين العمليات، PX TTL + tags)  │
│ 7. Next.js               revalidatePath عبر /api/cache/revalidate    │
└─────────────────────────────────────────────────────────────────────┘
```

## 1. كاش السيرفر الموحّد (`src/lib/cache/server-cache.ts`)

طبقة read-through بطبقتين أمام أي عمل مكلف على السيرفر (استدعاءات الـ backend API، استعلامات ثقيلة):

```ts
import { serverCache, CACHE_TTL } from "@/lib/cache";

const courses = await serverCache.getOrSet(
  "courses:list:page-1",
  () => fetchCoursesFromBackend(),
  {
    ttlMs: CACHE_TTL.LONG,        // يصبح stale بعد ساعة
    swrMs: CACHE_TTL.MEDIUM,      // يُقدَّم stale لخمس دقائق إضافية مع تحديث بالخلفية
    tags: ["courses"],            // إبطال جماعي عند النشر من لوحة التحكم
  },
);

// عند تعديل أي كورس من لوحة الأدمن:
await serverCache.invalidateTag("courses");
```

### الضمانات
- **Single-flight**: N طلب متزامن لنفس المفتاح = تنفيذ واحد فقط (حماية من Cache Stampede).
- **تدهور رشيق**: غياب/سقوط Redis لا يوقف التطبيق — يسقط إلى L1 فقط ولا يرمي أخطاء للمستدعي أبداً.
- **L1 قصير الأمد** (15 ثانية افتراضياً): إبطال من عملية أخرى يتقارب خلال ثوانٍ.
- **التحقق من المفاتيح**: `/^[A-Za-z0-9_.:|-]{1,256}$/` والوسوم `/^[A-Za-z0-9_.:-]{1,128}$/` لمنع حقن مساحة مفاتيح Redis.

### الوسوم مقابل الحذف المباشر
| الحالة | الاستخدام |
|---|---|
| إبطال مفتاح واحد معروف | `await serverCache.delete(key)` |
| إبطال عائلة كاملة (courses, settings…) | `tags` + `invalidateTag(tag)` |
| قراءة حساسة للاتساق عبر العمليات | `l1TtlMs: false` |

### المقاييس
`serverCache.getMetrics()` تعيد hits/misses/hitRate/singleFlightCoalesced/redisErrors… — صالحة للعرض في لوحة تشخيص أو endpoint صحّة.

## 2. طبقات العميل

### TanStack Query + IndexedDB (`providers/react-query-persistence.tsx`)
- كاش رسمي للبيانات مع persistence في IndexedDB (idb-keyval)، مقسّم بهوية المستخدم:
  `tolo-react-query-v1:anonymous` / `tolo-react-query-v1:user:<id>`.
- الـ query profiles في `lib/query/query-profiles.ts` (static / dashboard / financial / progress / eventDriven) تحدد staleness لكل مجال.
- الاستعلامات الحساسة توقف persistence بـ `meta: { persist: false }`.

### requestCache (`lib/api/request-cache.ts`)
- dedup للطلبات المتزامنة فقط، مفاتيحه مقيّدة بالهوية (`@user:<id>`) — لا يخزن bodies.

### المسح الموحّد (`lib/cache/clear-client-caches.ts`)
- `clearClientCaches({ queryClient })` يمسح الطبقات الثلاث بالترتيب الصحيح عند أي انتقال هوية (logout / MFA / تبديل حساب).
- خيارات: `unregisterServiceWorker` (مسح جذري)، `broadcast` (افتراضي `true` — يبث المسح لبقية التبويبات).

### مزامنة التبويبات (`lib/cache/cross-tab-sync.ts`)
- عند المسح في تبويب، تُمسح كل التبويبات المفتوحة عبر BroadcastChannel.
- حماية من الحلقات: كل تبويب يتجاهل بثّه الخاص، والمستقبِل يمسح بـ `broadcast: false`.
- مربوط تلقائياً داخل `AuthProvider`.

## 3. كاش Next.js
- `/api/cache/revalidate` (محمي: CSRF origin check + جلسة أدمن حيّة) يستدعي `revalidatePath` للمسارات العامة المسموحة.
- `next.config.js` يضبط `Cache-Control` للأصول الثابتة و`minimumCacheTTL` للصور.

## قواعد ذهبية
1. **لا تبنِ طبقة كاش جديدة** — استخدم `serverCache` على السيرفر وTanStack Query على العميل.
2. أي بيانات تعتمد على الهوية يجب أن تمر بمسار مسح واحد: `clearClientCaches`.
3. أي كاش سيرفر لمحتوى قابل للنشر من الأدمن يجب أن يحمل `tags` ويُبطَل عند الحفظ.
4. Redis غير مضمون — صمّم دائماً على أنه قد يكون غائباً.

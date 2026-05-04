# الأدمن في Next.js: BFF مقابل الـ rewrite

توثيق داخلي قصير — **أين يُنفَّذ الطلب** ولماذا، لتجنب ازدواجية المنطق بين Route Handlers ومسارات Go.

## آلية الأولوية

1. **Route Handler** (`src/app/api/**/route.ts`): إذا وُجد ملف يطابق المسار، **ينفَّذ في Next** ولا يُطبَّق عليه rewrite لنفس المسار.
2. **Rewrite** (`next.config.js`): أي طلب إلى `/api/:path*` **بدون** Route Handler مطابق يُعاد توجيهه إلى خادم Go (قيمة **`NEXT_PUBLIC_API_URL`**؛ عند غيابها الافتراضي **`http://127.0.0.1:8082/api`** — نفس منفذ `api-client` و`BACKEND_URL` في `_utils` لتفادي اختلاف البيئة بين المطورين).

العميل (`apiClient` / `adminFetch`) يستدعي عادةً `/api/...` على نفس أصل الواجهة؛ إما أن يضرب Handler في Next أو أن يمر عبر rewrite حسب وجود الملف.

## ما يذهب مباشرة إلى Go (بدون `route.ts` تحت الأدمن)

**كل** مسارات `/api/admin/*` التي **لا** تملك `route.ts` في هذا المستودع تمر عبر **rewrite** إلى الـ Go طالما لا يوجد تعارض مع مسار آخر تحت `src/app/api`.

أمثلة (غير حصرية): الإعلانات، المدونة، المنتدى، الإعدادات، الامتحانات، الكوبونات، الموارد، إلخ — طالما الواجهة تستدعي `/api/admin/...` ولا يوجد Handler بنفس المسار.

## مسارات Next الحالية (`src/app/api/admin`)

| المسار في Next | الدور الحالي |
|----------------|---------------|
| `GET` `/api/admin/dashboard` | BFF شفاف: تمرير `Cookie` / `Authorization` إلى Go عبر `forwardToGoApi` — نفس سلوك rewrite تقريباً؛ يُبقى إذا رغبتم لاحقاً بمنطق Next (قياس، تعديل استجابة). |
| `GET` `/api/admin/analytics` | BFF شفاف (نفس الأعلى). |
| `GET` `/api/admin/analytics/revenue` | BFF شفاف (نفس الأعلى). |
| `GET` `/api/admin/payments` | BFF شفاف (نفس الأعلى). |
| `GET,POST,PATCH,DELETE` `/api/admin/users` | BFF شفاف (نفس الأعلى). |
| `POST` `/api/admin/users/bulk-send-message` | **BFF بمنطق**: تحويل جسم الطلب من شكل الواجهة إلى الحمولة التي يتوقعها الـ Go (`backendPayload`). |
| `GET,POST,PATCH,DELETE` `/api/admin/teachers` | BFF شفاف. |
| `GET,POST,PATCH` `/api/admin/tickets` | BFF شفاف. |
| `GET,POST,PATCH,DELETE` `/api/admin/courses` | BFF شفاف. |
| `GET,POST,DELETE` `/api/admin/backups` | BFF شفاف؛ بعض المسارات الفرعية تُبنى عبر query (مثل `path`) كما كان سابقاً. |
| `GET,POST` `/api/admin/security/2fa` | BFF شفاف مع بناء URL للـ upstream (معامل `path` في الاستعلام) — ليس مطابقاً لسلسلة استعلام rewrite البسيطة فقط. |
| `GET,POST,DELETE` `/api/admin/security/ip-whitelist` | مثل 2FA: بناء مسار الـ upstream يدوياً. |
| `GET,POST` `/api/admin/security/sessions` | BFF شفاف مع اختيار مسار الـ POST حسب `action` في الجسم. |

### تنفيذ مشترك

- **`src/app/api/admin/_proxy.ts`**: `forwardToGoApi` — لا تكرار منطق Clerk؛ المصادقة كما في بقية التطبيق عبر **`upstreamAuthHeaders`** في `src/app/api/auth/_utils.ts` (`Cookie` + `Authorization`).
- **`backendJsonResponse`**: إرجاع JSON مع الحفاظ على `Set-Cookie` القادمة من Go عند الحاجة.

## متى تُضاف `route.ts` جديدة؟

أضف Handler في Next فقط عند وجود سبب واضح، مثل:

- **تحويل صيغة** بين الواجهة والـ API (مثل `bulk-send-message`).
- **رفع ملفات** أو معالجة `multipart` قبل Go.
- **مفاتيح أو أسرار** لا يجب أن تصل للمتصفح (نداء خدمة خارجية من الخادم).
- **سياسات** خاصة بـ Next (تسجيل، قص استجابة، تجميع عدة خدمات).

في غير ذلك، **يفضّل الاعتماد على rewrite** وحده لتقليل السطح والازدواجية — مع العلم أن الحذف يتطلب التأكد أن لا يعتمد أحد على سلوك خاص لـ `backendJsonResponse` (مثل تمرير `Set-Cookie`) في تلك النقطة بالذات.

## مرجع إعداد الـ rewrite

انظر `next.config.js` → `rewrites()` → `source: '/api/:path*'`.

## مرجع توثيق الـ API

راجع [admin-api.md](./admin-api.md) لوصف عقود الـ Go؛ هذا الملف يخص **مسار الطلب في Next** فقط.

---

## المنافذ والبيئة (اتساق)

- **`NEXT_PUBLIC_API_URL`**: المصدر الوحيد المفضّل (مثال `http://127.0.0.1:8082/api`).
- عند غيابه، الافتراضي **`8082`** في: `next.config.js` (rewrites)، `src/lib/api/api-client.ts`، `src/app/api/auth/_utils.ts`، `rpc-client`، `safe-client-utils`، واختبارات التكامل.
- ضبط القيمة في `.env` المحلي يزيل اختلاف «يعمل عند مطور ولا يعمل عند آخر».

## أخطاء JSON موحّدة (واجهة ↔ Go)

- الـ Go يستخدم غالباً `{"error": "..."}` مع رمز HTTP.
- في الواجهة: `src/lib/api/api-error-utils.ts` (`readApiErrorMessage`، `throwIfApiError`) لعرض رسالة الخادم في الـ hooks بدل رسائل عامة.

## التذاكر والدعم

- لوحة الأدمن: `use-support-tickets` + `/admin/tickets`.
- تجربة المستخدم العامة: يوجد `useMyTickets()` يستهدف `/tickets` و`/tickets/my` — عند إضافة صفحة «الدعم» في الموقع العادي، استخدم **نفس حقول الطلب** المعرفة في `CreateTicketRequest` في Go (`userId`, `subject`, `description`, `category`, …) حتى يبقى النموذج متطابقاً بين الطرفين.

---

## الكاش العام (ISR / صفحات ثابتة)

- بعد نشر محتوى عام (مثال: المدونة)، يمكن استدعاء **`POST /api/cache/revalidate`** مع جسم `{ "paths": ["/blog", "/blog/my-slug"] }` وجلسة أدمن/مشرف.
- المسارات مقيدة بقائمة آمنة: `/`، `/blog/**`، `/courses/**`، `/announcements/**`.
- من الواجهة: `requestPublicCacheRevalidation` في `src/lib/public-cache/revalidate-public.ts` (يُستدعى مثلاً من صفحة أدمن المدونة بعد الحفظ/الحذف).

## المراقبة الحية والـ WebSocket

- عنوان اتصال الإشعارات (وما يلحقه لاحقاً من أحداث live) يُبنى من **`buildAppUserWebSocketUrl`** في `src/lib/realtime/build-ws-url.ts` ويُستخدم في `WebSocketProvider` حتى لا يختلف المسار بين المكوّنات.
- صفحة **Live** تستخدم حالياً استعلام HTTP دوري إلى `/api/admin/live`؛ عند توفر بث WebSocket لنفس البيانات من الباكند، أوحِد نوع الرسائل مع ما يصل على `/api/ws` وأضف سياسة إعادة اتصال (مثل الموجودة في `websocket-context`: حد أقصى لمحاولات إعادة الربط).

## سجل التدقيق (audit)

- طلبات **`/api/admin/*`** التي تمر على Go تُسجَّل عبر **`AdminAuditLogger`** في `middleware/audit_logger.go` ويُرسل **`userId`** و**`role`** من سياق `middleware.Auth` (تم تصحيح المفاتيح القديمة `user_id` / `user_role` لتطابق السياق الفعلي).
- أي إجراء عبر الـ API يظهر في **`/api/admin/audit-logs`** مع المسار ونوع الحدث المشتق من المورد.

## CI والاختبارات

- **`npm run test`** يشغّل Vitest (`vitest.config.ts`) — يُستثنى `src/__tests__/e2e` و`integration` من الدورة الافتراضية (تحتاج بيئة خادم/متصفح).
- لإضافة **Playwright** في CI لاحقاً: تهيئة `playwright.config.ts` وتصحيح مسارات الدخول (مثلاً `/admin-login` بدل `/admin/login`) ثم إضافة خطوة في `.github/workflows/ci.yml`.

## RTL والجوال

- تخطيط الأدمن يستخدم **`AdminLayout`** مع الشريط الجانبي للجوال؛ عند إضافة صفحة أدمن جديدة ضمن `(admin)/admin` تبقى داخل نفس التخطيط.
- لرسائل الخطأ: استخدم **`readApiErrorMessage`** / **`throwIfApiError`** بدل عرض JSON خام للمستخدم.

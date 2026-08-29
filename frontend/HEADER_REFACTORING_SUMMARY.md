# ✅ Header — الوضع الفعلي وتحسيناته

> ملاحظة: هذا الملف حُدّث ليطابق الكود الفعلي بعد جولة تحسينات (انظر "ما طُبّق" أدناه).
> النسخة السابقة ادّعت تبسيطًا لم يُنفَّذ (Header.tsx ~100 سطر، حذف widgets، "صفر انتقالات") —
> والواقع مختلف كما موضّح هنا.

## البنية الحالية (الفعلية)

- `src/components/header/Header.tsx` — المكوّن الرئيسي (~429 سطرًا)، يركّب كل widget ويدير
  متغيّرات CSS (`--header-height`/`--header-bottom`) عبر `ResizeObserver`، ويجلب بيانات التنقّل
  ديناميكيًا من `/navigation/menu` مع تخزين مؤقت في `sessionStorage` + `startTransition`.
- Widgets حيّة ومُستخدمة: `HeaderSearch`، `HeaderNavigation`، `HeaderNotifications`، `UserMenu`،
  `ImpersonationBanner`، `ProgressIndicator`، `TimeTrackerHeaderWidget`، `CommandPalette` (ديناميكي)،
  `SmartNavigationSuggestions` (ديناميكي)، `ReadingProgressBar` (ديناميكي)، `HeaderMobileMenuEnhanced` (ديناميكي).
- الستايل عبر Tailwind؛ لا يوجد `framer-motion` (محذوف من `package.json`).

## ما طُبّق (جلسة التحسين)

### 1) إزالة الانتقالات الزخرفية
أُزيلت فئات `transition-*` / `duration-*` / `ease-*` من الملفات الحيّة:
`HeaderNavigation.tsx`، `HeaderMobileMenuEnhanced.tsx`، `HeaderSearch.tsx`، `CommandPalette.tsx`،
`TimeTrackerHeaderWidget.tsx`، `UserMenu.tsx`، `useHeaderOptimizations.ts`.
أُبقي على `animate-spin`/`animate-pulse` لأنها مؤشرات تحميل وظيفية.

### 2) حذف الكود الميت
حُذفت الملفات غير المُستخدمة من أي مكان في `src`:
`ActivityWidget.tsx`، `ContextualHelp.tsx`، `HeaderBreadcrumbs.tsx`، `QuickActions.tsx` (نسخة header)،
`hooks/use-header-animations.ts`. وأُزيل تصدير `useHeaderAnimations` من barrel (الـ hooks)،
و أُزيل `usePerformanceMode` الميت من `hooks/use-efficiency-mode.ts` (مع الإبقاء على `useEfficiencyMode` المستخدم).

### 3) إصلاحات أهمية عالية (a11y / أداء)
- **قائمة الجوال**: اللوحة تُصيَّر الآن **فقط عند الفتح** (`{isMobileMenuOpen && ...}`)،
  بدل بقائها دائمًا في DOM بـ `role="dialog" aria-modal="true"` (كانت تجعل الصفحة "inert" لقارئات الشاشة).
- **البحث**: `DesktopSearchResultItem` يحمل الآن `id="search-result-${index}"` + `role="option"` +
  `aria-selected`؛ ونُقل `RecentSearches` خارج الـ `listbox` ليحتوي الخيارات فقط (إصلاح `aria-activedescendant`).
- **التصيير الثابت**: أُزيل `useSearchParams` من `useLoginUrl` و`HeaderMobileMenuEnhanced` وحُسب رابط
  الدخول على العميل بعد التركيب (`window.location`) — يرفع تحذير Next ويمنع فقدان Static Generation.
- **الاستيرادات الديناميكية**: الـ 4 `dynamic(...)` تُسجّل الآن الخطأ عبر `logger.error` بدل ابتلاعه الصامت.
- **اختصار Ctrl+K**: صُحّح المحدِّد من `[data-search-trigger]` (غير موجود) إلى `#header-search-input`.

### 4) إصلاحات متوسطة
- `useHeaderOptimizations.useHeaderClasses`: `user: any` → `user: AuthUser | null`؛ وحُذفت
  `HEADER_PREFERENCES.showActivity` الميتة.
- `MegaMenu`: غيّر `role="dialog" aria-modal="true"` → `role="region"` (ليس Modal حسب تعليق المؤلفين)،
  وأُزيل `useFocusTrap` (فخ تركيز غير مناسب لقائمة غير م模态ية)، ومُزيل `aria-haspopup="dialog"` من
  المشغّل (`HeaderMenuTrigger`) مع الإبقاء على `aria-expanded`/`aria-controls`.

## توصيات مؤجّلة (لم تُطبَّق لتجنّب أثر جانبي واسع)
- توحيد `useEfficiencyMode` (قارئ DOM) مع `useEfficiency` (سياق) — مصدران لحالة "وضع الأداء".
- نقل الروابط الـ hard-coded في `Header.tsx` (`/teach`، `/careers`، `/plans`) إلى `navData.tsx`.
- توحيد نمط `mounted` عبر هوك `useMounted()` مشترك.
- حذف الحسابات غير المستخدمة في `useStickyHeader` — **لا تُزَل**: `scrollProgress` مُستخدم فعلًا من `ReadingProgressBar`.
- تصحيح تحويلات `user as User | null` في `Header.tsx` (تتطلب تعديل أنواع `MegaMenu`/`HeaderNotifications` إلى `AuthUser`).

## التحقق
- `npm run type-check` — يمرّ بلا أخطاء.
- `npm run lint` — يُنصح بتشغيله قبل النشر.
- `npm test` / `npm run build` — للتأكد من سلامة الـ SSR.

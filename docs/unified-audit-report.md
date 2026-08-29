# Unified Project Audit Report

Generated: 2026-08-22T06:27:58.218Z
Mode: check

## Summary

- Passed: 6
- Warnings: 4
- Failed: 3

## PASS Frontend: TypeScript type-check
Completed successfully.
Command: `npx tsc --noEmit`
Duration: 18146ms

## PASS Frontend: ESLint
Completed successfully.
Command: `npx eslint .`
Duration: 22566ms

<details>
<summary>Output</summary>

```text
D:\thanawy\frontend\next.config.js
  74:11  warning  'isProduction' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\__tests__\integration\api-endpoints.test.ts
  2:10  warning  'createServer' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  3:10  warning  'parse' is defined but never used. Allowed unused vars must match /^_/u         @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\__tests__\integration\websocket.test.ts
  445:13  warning  'client1' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  446:13  warning  'client2' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  447:13  warning  'client3' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  448:13  warning  'client4' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  449:13  warning  'client5' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(auth)\mfa\page.tsx
  119:21  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\thanawy\frontend\src\app\(common)\hooks\useTokenStreamBuffer.ts
  92:65  warning  The ref value 'bufferRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'bufferRef.current' to a variable inside the effect, and use that variable in the cleanup function  react-hooks/exhaustive-deps

D:\thanawy\frontend\src\app\(community)\announcements\page.tsx
  248:27  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\thanawy\frontend\src\app\(community)\blog\page.tsx
  227:17  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\thanawy\frontend\src\app\(community)\blog\post\[id]\page.tsx
  106:15  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\thanawy\frontend\src\app\(community)\chat\new\page.tsx
  124:27  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\thanawy\frontend\src\app\(community)\chat\page.tsx
   78:15  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
  122:13  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\thanawy\frontend\src\app\(community)\events\[id]\page.tsx
  225:15  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
  348:23  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\thanawy\frontend\src\app\(community)\events\page.tsx
  234:17  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\thanawy\frontend\src\app\(dashboard)\academy\page.tsx
  230:23  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
  324:23  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\thanawy\frontend\src\app\(dashboard)\ai\components\TeacherSearch.tsx
  153:11  warning  Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

D:\thanawy\frontend\src\app\(dashboard)\ai\features\EssayGrader.tsx
  6:34  warning  'CheckCircle' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  6:79  warning  'Languages' is defined but never used. Allowed unused vars must match /^_/u    @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(dashboard)\ai\features\StudyPlanner.tsx
  24:21  warning  'error' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(dashboard)\ai\hooks\useAIAssistant.ts
  50:3  warning  'userId' is assigned a value but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(dashboard)\ai\hooks\useExamGenerator.ts
  37:36  warning  'subjects' is defined but never used. Allowed unused args must match /^_/u             @typescript-eslint/no-unused-vars
  37:46  warning  'years' is defined but never used. Allowed unused args must match /^_/u                @typescript-eslint/no-unused-vars
  49:10  warning  'retryCount' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(dashboard)\analytics\components\PerformanceMetrics.tsx
  32:2  warning  'performanceMetrics' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(dashboard)\dashboard\components\dashboard-hero.tsx
  147:21  

... output truncated ...
```

</details>

## PASS Frontend: Unit tests
Completed successfully.
Command: `npm test`
Duration: 6596ms

<details>
<summary>Output</summary>

```text
> thanawy@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90mD:/thanawy/frontend[39m

 [32m✓[39m src/__tests__/integration/websocket.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 43[2mms[22m[39m
 [32m✓[39m src/__tests__/integration/api-endpoints.test.ts [2m([22m[2m22 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m src/__tests__/utils/format-utils.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/request-cache.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/__tests__/services/auth-navigation.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/auth-admin-panel-roles.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/api-error-utils.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 19[2mms[22m[39m

[2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
[2m      Tests [22m [1m[32m71 passed[39m[22m[90m (71)[39m
[2m   Start at [22m 09:28:39
[2m   Duration [22m 5.85s[2m (transform 84ms, setup 78ms, import 104ms, tests 178ms, environment 4.52s)[22m
```

</details>

## WARN Frontend: Dependency audit
Command exited with a non-zero status.
Command: `npm audit --audit-level=moderate --omit=dev`
Duration: 2460ms

<details>
<summary>Output</summary>

```text
# npm audit report

brace-expansion  4.0.0 - 5.0.8
Severity: high
brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash - https://github.com/advisories/GHSA-mh99-v99m-4gvg
brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation - https://github.com/advisories/GHSA-rgw5-rvv9-x895
fix available via `npm audit fix`
node_modules/brace-expansion

dompurify  <=3.4.12
Severity: moderate
DOMPurify: `CUSTOM_ELEMENT_HANDLING` bypasses `afterSanitizeElements` for allowed custom elements. - https://github.com/advisories/GHSA-c2j3-45gr-mqc4
DOMPurify: IN_PLACE hook removal leaves a detached subtree executable, causing XSS - https://github.com/advisories/GHSA-55q2-fjhq-7xh7
fix available via `npm audit fix`
node_modules/dompurify

nanoid  <=3.3.17
Severity: high
nanoid: non-secure generators can loop indefinitely with negative size - https://github.com/advisories/GHSA-28wg-ghj8-5hjv
nanoid: custom generators can loop indefinitely when size is zero - https://github.com/advisories/GHSA-2v37-7h3g-55p8
fix available via `npm audit fix`
node_modules/nanoid

next  9.3.4-canary.0 - 16.3.0-preview.10
Severity: high
Next.js: Middleware / Proxy bypass in App Router applications using Turbopack and single locale - https://github.com/advisories/GHSA-6gpp-xcg3-4w24
Next.js: Denial of Service in App Router using Server Actions - https://github.com/advisories/GHSA-m99w-x7hq-7vfj
Next.js: Server-Side Request Forgery in Server Actions on custom servers - https://github.com/advisories/GHSA-89xv-2m56-2m9x
Next.js: Cache confusion of response bodies for requests with bodies - https://github.com/advisories/GHSA-68g3-v927-f742
Next.js: Cache confusion of response bodies for requests with bodies containing invalid UTF-8 byte sequences - https://github.com/advisories/GHSA-4633-3j49-mh5q
Next.js: Unbounded Server Action payload in Edge runtime - https://github.com/advisories/GHSA-4c39-4ccg-62r3
Next.js: Server-Side Request Forgery in rewrites via attacker-controlled destination hostname - https://github.com/advisories/GHSA-p9j2-gv94-2wf4
Next.js: Denial of Service in the Image Optimization API using SVGs - https://github.com/advisories/GHSA-q8wf-6r8g-63ch
Next.js: Unauthenticated disclosure of internal Server Function endpoints - https://github.com/advisories/GHSA-955p-x3mx-jcvp
Depends on vulnerable versions of postcss
Depends on vulnerable versions of sharp
fix available via `npm audit fix --force`
Will install next@16.3.2, which is outside the stated dependency range
node_modules/next

postcss  <=8.5.22
Severity: high
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output - https://github.com/advisories/GHSA-qx2v-qp2m-jg93
PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments - https://github.com/advisories/GHSA-6g55-p6wh-862q
PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset - https://github.com/advisories/GHSA-fxqj-rqcc-2cmp
PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure - https://github.com/advisories/GHSA-r28c-9q8g-f849
fix available via `npm audit fix --force`
Will install next@16.3.2, which is outside the stated dependency range
node_modules/postcss

sharp  <0.35.0
Severity: high
sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 - https://github.com/advisories/GHSA-f88m-g3jw-g9cj
fix available via `npm audit fix --force`
Will install next@16.3.2, which is outside the stated dependency range
node_modules/sharp

undici  7.0.0 - 7.28.0
Severity: high
undici vulnerable to downstream response desynchronization via retry interceptor - https://github.com/advisories/GHSA-8xcm-r25x-g524
undici vulnerable to cross-user information disclosure and parse-time crash via degenerate private cache directives - https://github.com/advisories/GHSA-4cwx-7wf7-3272
undici vulnerable to CRLF Injection via blob-like body 'type' property - https://github.com/advisories/GHSA-m8rv-5g2x-5cg5
undici vulnerable to cross-user information disclosure via whitespace around equals in Cache-Control directives - https://github.com/advisories/GHSA-jr45-8vmc-qm54
undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields - https://github.com/advisories/GHSA-v3r7-h72x-cjcm
fix available via `npm audit fix`
node_modules/undici

7 vulnerabilities (1 moderate, 6 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues, run:
  npm audit fix --force
```

</details>

## FAIL Admin: TypeScript type-check
Command exited with a non-zero status.
Command: `npx tsc --noEmit`
Duration: 109164ms

<details>
<summary>Output</summary>

```text
src/app/(admin)/admin/reports/page.tsx(34,33): error TS2551: Property 'getSavedReports' does not exist on type '{ buildReport: (spec: ReportSpec) => Promise<ReportResult>; listReports: () => Promise<SavedReport[]>; saveReport: (body: { name: string; description?: string | undefined; spec: ReportSpec; isPublic?: boolean | undefined; }) => Promise<...>; runReport: (id: string) => Promise<...>; getHeatmap: (videoKey: string, dur...'. Did you mean 'saveReport'?
src/app/(admin)/admin/reports/page.tsx(39,46): error TS2339: Property 'deleteReport' does not exist on type '{ buildReport: (spec: ReportSpec) => Promise<ReportResult>; listReports: () => Promise<SavedReport[]>; saveReport: (body: { name: string; description?: string | undefined; spec: ReportSpec; isPublic?: boolean | undefined; }) => Promise<...>; runReport: (id: string) => Promise<...>; getHeatmap: (videoKey: string, dur...'.
```

</details>

## WARN Admin: ESLint
Command exited with a non-zero status.
Command: `npx eslint .`
Duration: 163198ms

<details>
<summary>Output</summary>

```text
D:\admin\public\sw.js
   8:35  warning  'event' is defined but never used. Allowed unused args must match /^_/u       @typescript-eslint/no-unused-vars
  37:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

D:\admin\src\__tests__\components\broadcast-modal.test.tsx
  24:48  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  53:72  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  88:10  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

D:\admin\src\__tests__\integration\api-endpoints.test.ts
  1:10  warning  'createServer' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  2:10  warning  'parse' is defined but never used. Allowed unused vars must match /^_/u         @typescript-eslint/no-unused-vars

D:\admin\src\__tests__\lib\cms-api.test.ts
  7:67  warning  'init' is defined but never used. Allowed unused args must match /^_/u          @typescript-eslint/no-unused-vars
  8:13  warning  'url' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\admin\src\__tests__\lib\dashboard-data.test.ts
  40:55  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

D:\admin\src\__tests__\user-notifications-tab.test.tsx
  54:68  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

D:\admin\src\app\(admin)\admin\ab-testing\_components\stats-cards.tsx
  12:9  warning  'pausedCount' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\admin\src\app\(admin)\admin\ab-testing\page.tsx
   7:17  warning  'BarChart3' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          @typescript-eslint/no-unused-vars
  29:5   warning  Error: Cannot access variable before it is declared

`loadExperiments` is accessed before it is declared, which prevents the earlier access from updating when this value changes over time.

D:\admin\src\app\(admin)\admin\ab-testing\page.tsx:29:5
  27 |   // Load experiments on mount
  28 |   useEffect(() => {
> 29 |     loadExperiments();
     |     ^^^^^^^^^^^^^^^ `loadExperiments` accessed before it is declared
  30 |   }, []);
  31 |
  32 |   // Apply filters whenever experiments, status filter, or search term changes

D:\admin\src\app\(admin)\admin\ab-testing\page.tsx:52:3
  50 |   }, [experiments, statusFilter, searchTerm]);
  51 |
> 52 |   const loadExperiments = async () => {
     |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 53 |     try {
     | ^^^^^^^^^
> 54 |       setLoading(true);
     …
     | ^^^^^^^^^
> 63 |     }
     | ^^^^^^^^^
> 64 |   };
     | ^^^^^ `loadExperiments` is declared here
  65 |
  66 |   const handleCreateExperiment = async (newExpData: CreateExperimentData) => {
  67 |     try {  react-hooks/immutability
  49:5   error    Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

D:\admin\src\app\(admin)\admin\ab-testing\page.tsx:49:5
  47 |     }
  48 |
> 49 |     setFilteredExperiments(result);
     |     ^^^^^^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  50 |   }, [experiments, statusFilter, searchTerm]);
  51 |
  52 |   const loadExperiments = async () => {                           react-hooks/set-state-in-effect

D:\admin\src\app\(admin)\admin\achievements\AchievementFormDialog.tsx
  32:10  warning  'Award' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  32:34  warning  'Medal' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\admin\src\app\(admin)\admin\achievements\AchievementTable.tsx
  14:3   warning  'Award' is defined but never used. Allowed unused vars must match /^_/u   @typescript-eslint/no-unused-vars
  14:67  warning  'Target' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\admin\src\app\(admin)\admin\achievements\page.tsx
   7:16  warning  'Trophy' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          @typescript-eslint/no-unused-vars
  49:5   error    Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

D:\admin\src\app\(admin)\admin\achievements\page.tsx:49:5
  47 |
  48 |   React.useEffect(() => {
> 49 |     fetchAchievements();
     |     ^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  50 |   }, [fetchAchievements]);
  51 |
  52 |   const handleOpenDialog = (achievement?: Achievement) => {  react-hooks/set-state-in-effect

D:\admin\src\app\(admin)\admin\activity-log\page.tsx
  11:42  warning  'Eye' is defined but never used. Allowed unused vars must match /^_/u          

... output truncated ...
```

</details>

## PASS Admin: Unit tests
Completed successfully.
Command: `npm test`
Duration: 116201ms

<details>
<summary>Output</summary>

```text
> thanawy@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.6 [39m[90mD:/admin[39m

 [32m✓[39m src/__tests__/integration/api-endpoints.test.ts [2m([22m[2m22 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/__tests__/integration/websocket.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m src/__tests__/integration/users-filter-url.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/__tests__/utils/format-utils.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/course-api.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/security-hardening.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/permissions.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/notification-draft.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/course-validations.test.ts [2m([22m[2m36 tests[22m[2m)[22m[32m 14[2mms[22m[39m
[90mstdout[2m | src/__tests__/lib/user-management.test.ts[2m > [22m[2mUser Management Module Unit Tests[2m > [22m[2mAudit Logger Utility & Helpers[2m > [22m[2mcreates a well-formed audit log entry with ISO timestamp and requestId
[22m[39m[AUDIT_LOG] [user.suspended] Actor: admin_77 -> Target: user_88 | Reason: تعليق الحساب مؤقتاً لمراجعة الهوية | Result: success

[90mstdout[2m | src/__tests__/lib/user-management.test.ts[2m > [22m[2mUser Management Module Unit Tests[2m > [22m[2mAudit Logger Utility & Helpers[2m > [22m[2mlogs impersonation with userAgent via auditImpersonation helper
[22m[39m[AUDIT_LOG] [user.impersonated] Actor: admin_1 -> Target: target_55 | Reason: فحص مشكلة فنية للطالب | Result: success

 [32m✓[39m src/__tests__/lib/user-management.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/dashboard-payload-mapper.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/performance-config.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/admin-panel-route-access.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/api-error-utils.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/dashboard-data.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/dashboard-colors.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/user-action-guards.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/cms-api.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 64[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/dashboard-utils.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m src/app/api/auth/_utils.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m src/__tests__/components/broadcast-modal.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 137[2mms[22m[39m
 [32m✓[39m src/__tests__/hooks/use-admin-notifications.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 242[2mms[22m[39m
 [32m✓[39m src/__tests__/hooks/use-broadcast-users.test.ts [2m([22m[2m7 tests[22m[2m)[22m[33m 419[2mms[22m[39m
 [32m✓[39m src/__tests__/components/admin/dashboard/realtime-notifications-section.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 51[2mms[22m[39m
 [32m✓[39m src/__tests__/hooks/use-dashboard-operations.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 2226[2mms[22m[39m
     [33m[2m✓[22m[39m keeps healthy panels working when one endpoint fails [33m 1013[2mms[22m[39m
     [33m[2m✓[22m[39m surfaces an error state instead of substituting fake data [33m 1016[2mms[22m[39m
 [32m✓[39m src/__tests__/admins-page.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 281[2mms[22m[39m
 [32m✓[39m src/__tests__/user-notifications-tab.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 64[2mms[22m[39m

[2m Test Files [22m [1m[32m27 passed[39m[22m[90m (27)[39m
[2m      Tests [22m [1m[32m224 passed[39m[22m[90m (224)[39m
[2m   Start at [22m 09:33:39
[2m   Duration [22m 96.86s[2m (transform 4.16s, setup 0ms, import 185.50s, tests 3.65s, environment 636.07s)[22m

[90mstderr[2m | src/__tests__/hooks/use-broadcast-users.test.ts[2m > [22m[2museBroadcastUsers[2m > [22m[2mshould fetch users on mount
[22m[39mAn update to TestComponent inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

[90mstderr[2m | src/__tests__/hooks/use-admin-notifications.test.ts[2m > [22m[2museAdminNotifications[2m > [22m[2mshould fetch notifications on mount
[22m[39mAn update to TestComponent inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

[90mstderr[2m | src/__tests__/hooks/use-broadcast-users.test.ts[2m > [22m[2museBroadcastUsers[2m > [22m[2mshould fetch users on mount
[22m[39mAn update to TestComponent inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

[90mstderr[2m | src/__tests__/hooks/use-broadcast-users.test.ts[2m > [22m[2museBroadcastUsers[2m > [22m[2mshould filter users by search query
[22m[39mAn update to TestComponent inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

[90mstderr[2m | src/__tests__/hooks/use-broadcast-users.test.ts[2m > [22m[2museBroadcastUsers[2m > [22m[2mshould filter users by search query
[22m[39mAn update to TestComponent inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

[90mstderr[2m | src/__tests__/hooks/use-admin-notifications.test.ts[2m > [22m[2museAdminNotifications[2m > [22m[2mshould mark notification as read
[22m[39mAn update to TestComponent inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

[90mstderr[2m | src/__tests__/hooks/use-broadcast-users.test.ts[2m > [22m[2museBroadcastUsers[2m > [22m[2mshould filter users by role
[22m[39mAn update to TestComponent inside a test was not wrapped i

... output truncated ...
```

</details>

## WARN Admin: Dependency audit
Command exited with a non-zero status.
Command: `npm audit --audit-level=moderate --omit=dev`
Duration: 6273ms

<details>
<summary>Output</summary>

```text
# npm audit report

@opentelemetry/core  <2.8.0
Severity: moderate
OpenTelemetry Core: Unbounded memory allocation in W3C Baggage propagation - https://github.com/advisories/GHSA-8988-4f7v-96qf
fix available via `npm audit fix`
node_modules/@opentelemetry/core
node_modules/@opentelemetry/resources/node_modules/@opentelemetry/core
node_modules/@opentelemetry/sdk-metrics/node_modules/@opentelemetry/core
node_modules/elastic-apm-node/node_modules/@opentelemetry/core
  @opentelemetry/resources  0.8.0 - 2.7.1
  Depends on vulnerable versions of @opentelemetry/core
  node_modules/@opentelemetry/resources
  @opentelemetry/sdk-metrics  <=2.7.1
  Depends on vulnerable versions of @opentelemetry/core
  Depends on vulnerable versions of @opentelemetry/resources
  node_modules/@opentelemetry/sdk-metrics
  elastic-apm-node  <=4.17.0
  Depends on vulnerable versions of @opentelemetry/core
  Depends on vulnerable versions of @opentelemetry/sdk-metrics
  Depends on vulnerable versions of cookie
  node_modules/elastic-apm-node

cookie  <0.7.0
cookie accepts cookie name, path, and domain with out of bounds characters - https://github.com/advisories/GHSA-pxg6-pf52-xh8x
fix available via `npm audit fix`
node_modules/cookie

dompurify  <=3.4.12
Severity: moderate
DOMPurify: IN_PLACE hook removal leaves a detached subtree executable, causing XSS - https://github.com/advisories/GHSA-55q2-fjhq-7xh7
fix available via `npm audit fix`
node_modules/dompurify

nanoid  <=3.3.17
Severity: high
nanoid: non-secure generators can loop indefinitely with negative size - https://github.com/advisories/GHSA-28wg-ghj8-5hjv
nanoid: custom generators can loop indefinitely when size is zero - https://github.com/advisories/GHSA-2v37-7h3g-55p8
fix available via `npm audit fix`
node_modules/nanoid

postcss  <=8.5.22
Severity: high
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output - https://github.com/advisories/GHSA-qx2v-qp2m-jg93
PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments - https://github.com/advisories/GHSA-6g55-p6wh-862q
PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset - https://github.com/advisories/GHSA-fxqj-rqcc-2cmp
PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure - https://github.com/advisories/GHSA-r28c-9q8g-f849
fix available via `npm audit fix`
node_modules/next/node_modules/postcss
  next  9.3.4-canary.0 - 16.3.0-preview.10
  Depends on vulnerable versions of postcss
  Depends on vulnerable versions of sharp
  node_modules/next

sharp  <0.35.0
Severity: high
sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 - https://github.com/advisories/GHSA-f88m-g3jw-g9cj
fix available via `npm audit fix`
node_modules/next/node_modules/sharp

undici  <=6.27.0
Severity: high
undici vulnerable to HTTP header injection via Set-Cookie percent-decoding - https://github.com/advisories/GHSA-p88m-4jfj-68fv
undici WebSocket client vulnerable to denial of service via fragment count bypass - https://github.com/advisories/GHSA-vxpw-j846-p89q
undici vulnerable to Set-Cookie SameSite attribute downgrade via permissive substring matching - https://github.com/advisories/GHSA-g8m3-5g58-fq7m
undici vulnerable to downstream response desynchronization via retry interceptor - https://github.com/advisories/GHSA-8xcm-r25x-g524
undici vulnerable to CRLF Injection via blob-like body 'type' property - https://github.com/advisories/GHSA-m8rv-5g2x-5cg5
undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields - https://github.com/advisories/GHSA-v3r7-h72x-cjcm
undici vulnerable to HTTP response queue poisoning via keep-alive socket reuse - https://github.com/advisories/GHSA-35p6-xmwp-9g52
fix available via `npm audit fix`
node_modules/undici

ws  7.0.0 - 7.5.10
Severity: high
ws: Memory exhaustion DoS from tiny fragments and data chunks - https://github.com/advisories/GHSA-96hv-2xvq-fx4p
fix available via `npm audit fix`
node_modules/webpack-bundle-analyzer/node_modules/ws

12 vulnerabilities (1 low, 5 moderate, 6 high)

To address all issues, run:
  npm audit fix
```

</details>

## PASS Backend: Go vet
Completed successfully.
Command: `go vet ./...`
Duration: 204932ms

## PASS Backend: Go compilation check
Completed successfully.
Command: `go build -o NUL ./...`
Duration: 55374ms

## FAIL Backend: Go tests
Command exited with a non-zero status.
Command: `go test ./...`
Duration: 71467ms

<details>
<summary>Output</summary>

```text
?   	thanawy-backend/cmd/api	[no test files]
?   	thanawy-backend/cmd/check-migration-status	[no test files]
?   	thanawy-backend/cmd/cleanup-failed-migration	[no test files]
?   	thanawy-backend/cmd/drop-all-tables	[no test files]
?   	thanawy-backend/cmd/drop-migrations-table	[no test files]
?   	thanawy-backend/cmd/fix-migration-checksum	[no test files]
?   	thanawy-backend/cmd/migrate	[no test files]
?   	thanawy-backend/cmd/seed-admin	[no test files]
?   	thanawy-backend/cmd/seed-content	[no test files]
ok  	thanawy-backend/cmd/targeted_migrate	1.824s
?   	thanawy-backend/cmd/test-db-connection	[no test files]
?   	thanawy-backend/docs	[no test files]
?   	thanawy-backend/internal/application	[no test files]
?   	thanawy-backend/internal/application/cqrs	[no test files]
?   	thanawy-backend/internal/application/cqrs/commands	[no test files]
ok  	thanawy-backend/internal/application/cqrs/queries	1.421s
?   	thanawy-backend/internal/application/dto	[no test files]
?   	thanawy-backend/internal/application/services	[no test files]
?   	thanawy-backend/internal/bootstrap	[no test files]
?   	thanawy-backend/internal/domain/ai/service	[no test files]
?   	thanawy-backend/internal/domain/analytics/service	[no test files]
ok  	thanawy-backend/internal/domain/auth/service	1.387s
ok  	thanawy-backend/internal/domain/common	0.799s
?   	thanawy-backend/internal/domain/course/service	[no test files]
?   	thanawy-backend/internal/domain/gamification/service	[no test files]
ok  	thanawy-backend/internal/domain/marketing/service	1.277s
?   	thanawy-backend/internal/domain/notification/service	[no test files]
?   	thanawy-backend/internal/domain/payment/service	[no test files]
?   	thanawy-backend/internal/domain/system/service	[no test files]
?   	thanawy-backend/internal/domain/user/entity	[no test files]
ok  	thanawy-backend/internal/infrastructure/api	7.286s
ok  	thanawy-backend/internal/infrastructure/api/handlers/admin	8.675s
ok  	thanawy-backend/internal/infrastructure/api/handlers/protected	7.011s
?   	thanawy-backend/internal/infrastructure/api/handlers/shared	[no test files]
ok  	thanawy-backend/internal/infrastructure/api/middleware	1.780s
?   	thanawy-backend/internal/infrastructure/api/response	[no test files]
ok  	thanawy-backend/internal/infrastructure/cache	1.018s
?   	thanawy-backend/internal/infrastructure/cache/enhanced	[no test files]
?   	thanawy-backend/internal/infrastructure/cache/invalidate	[no test files]
?   	thanawy-backend/internal/infrastructure/cache/keys	[no test files]
ok  	thanawy-backend/internal/infrastructure/cache/lru	0.837s
?   	thanawy-backend/internal/infrastructure/cache/redis	[no test files]
?   	thanawy-backend/internal/infrastructure/cache/settings	[no test files]
?   	thanawy-backend/internal/infrastructure/config	[no test files]
ok  	thanawy-backend/internal/infrastructure/database	1.977s
?   	thanawy-backend/internal/infrastructure/database/dsn	[no test files]
ok  	thanawy-backend/internal/infrastructure/database/fileguard	0.764s
ok  	thanawy-backend/internal/infrastructure/database/migration	1.733s
?   	thanawy-backend/internal/infrastructure/database/query	[no test files]
?   	thanawy-backend/internal/infrastructure/events	[no test files]
?   	thanawy-backend/internal/infrastructure/logger	[no test files]
FAIL	thanawy-backend/internal/infrastructure/monitoring [build failed]
?   	thanawy-backend/internal/infrastructure/persistence/repositories	[no test files]
ok  	thanawy-backend/internal/infrastructure/storage	0.785s
?   	thanawy-backend/internal/infrastructure/workers	[no test files]
?   	thanawy-backend/internal/shared/utils	[no test files]
?   	thanawy-backend/pkg/buildinfo	[no test files]
?   	thanawy-backend/pkg/circuitbreaker	[no test files]
?   	thanawy-backend/pkg/telemetry	[no test files]
?   	thanawy-backend/scripts/check-logs	[no test files]
?   	thanawy-backend/scripts/check-user-deep	[no test files]
?   	thanawy-backend/scripts/clear-rate-limits	[no test files]
?   	thanawy-backend/scripts/create-admin-ffyoussef	[no test files]
?   	thanawy-backend/scripts/disable-admin-mfa	[no test files]
?   	thanawy-backend/scripts/list-admins	[no test files]
?   	thanawy-backend/scripts/reset-admin-password	[no test files]
?   	thanawy-backend/tools/check_db_constraints	[no test files]
?   	thanawy-backend/tools/dev/generate-token	[no test files]
?   	thanawy-backend/tools/test_cascade	[no test files]
FAIL
thanawy-backend/internal/infrastructure/monitoring.test: C:\Program Files\Go\pkg\tool\windows_amd64\compile.exe: fork/exec C:\Program Files\Go\pkg\tool\windows_amd64\compile.exe: The paging file is too small for this operation to complete.
```

</details>

## FAIL Backend: Prisma Schema validate
Command exited with a non-zero status.
Command: `npx prisma validate`
Duration: 45622ms

<details>
<summary>Output</summary>

```text
Error: Could not find Prisma Schema that is required for this command.
You can either provide it with `--schema` argument,
set it in your Prisma Config file (e.g., `prisma.config.ts`),
set it as `prisma.schema` in your package.json,
or put it into the default location (`./prisma/schema.prisma`, or `./schema.prisma`.
Checked following paths:

schema.prisma: file not found
prisma\schema.prisma: file not found

See also https://pris.ly/d/prisma-schema-location
```

</details>

## WARN Secret and credential scan
47 possible secret references found.
Duration: 45496ms

<details>
<summary>Output</summary>

```text
.codex\config.toml:6 - OpenAI API key
.env.check:2 - JWT-like token
.env.local:2 - JWT-like token
.env.prod:24 - JWT-like token
.env.production:35 - JWT-like token
.env.tolo:2 - JWT-like token
.env.tolo.prod:25 - JWT-like token
.env.vercel:2 - JWT-like token
.env.vercel.pulled:33 - JWT-like token
.kilo\worktrees\mangrove-theory\.codex\config.toml:6 - OpenAI API key
.kilo\worktrees\mangrove-theory\.env.check:2 - JWT-like token
.kilo\worktrees\mangrove-theory\.env.local:2 - JWT-like token
.kilo\worktrees\mangrove-theory\.env.prod:26 - JWT-like token
.kilo\worktrees\mangrove-theory\.env.production:2 - JWT-like token
.vercel\.env.development.local:2 - JWT-like token
.vercel\.env.production.local:22 - JWT-like token
frontend\.env.local:2 - JWT-like token
frontend\.env.vercel.check:26 - JWT-like token
frontend\src\__tests__\integration\api-endpoints.test.ts:60 - Likely hard-coded secret
frontend\src\__tests__\integration\api-endpoints.test.ts:67 - Likely hard-coded secret
..\admin\.env:45 - OpenAI API key
..\admin\.env.local:2 - JWT-like token
..\admin\.env.production.local:20 - JWT-like token
..\admin\.env.test:2 - JWT-like token
..\admin\.kilo\worktrees\crystalline-sorrel\.env:42 - OpenAI API key
..\admin\.kilo\worktrees\crystalline-sorrel\.env.local:2 - JWT-like token
..\admin\.kilo\worktrees\crystalline-sorrel\.env.production.local:20 - JWT-like token
..\admin\.kilo\worktrees\crystalline-sorrel\.env.test:2 - JWT-like token
..\admin\.kilo\worktrees\crystalline-sorrel\.env.vercel:2 - JWT-like token
..\admin\.kilo\worktrees\crystalline-sorrel\src\__tests__\integration\api-endpoints.test.ts:60 - Likely hard-coded secret
..\admin\.kilo\worktrees\crystalline-sorrel\src\__tests__\integration\api-endpoints.test.ts:67 - Likely hard-coded secret
..\admin\src\__tests__\e2e\users-module.spec.ts:6 - Likely hard-coded secret
..\admin\src\__tests__\integration\api-endpoints.test.ts:59 - Likely hard-coded secret
..\admin\src\__tests__\integration\api-endpoints.test.ts:66 - Likely hard-coded secret
..\backend\.env:53 - OpenAI API key
..\backend\.env.backend.prod:93 - JWT-like token
..\backend\.env.check:2 - JWT-like token
..\backend\.env.development.pulled:4 - JWT-like token
..\backend\.env.local:2 - JWT-like token
..\backend\.env.production.pulled:26 - JWT-like token
..\backend\.env.test:2 - JWT-like token
..\backend\.env.vercel:2 - JWT-like token
..\backend\.env.vercel.production:26 - JWT-like token
..\backend\.env.vercel.pulled:26 - JWT-like token
..\backend\.vercel\.env.development.local:4 - JWT-like token
..\backend\docs\oauth_2_0_implementation.md:133 - Generic private key
..\backend\docs\oauth_2_0_implementation.md:154 - Generic private key
```

</details>

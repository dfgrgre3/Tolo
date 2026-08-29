# Thanawy Project Audit Report

Generated: 2026-06-11T21:57:59.488Z
Mode: check

## Summary

- Passed: 4
- Warnings: 2
- Failed: 0

## PASS TypeScript type-check
Completed successfully.
Command: `npx tsc --noEmit`
Duration: 4167ms

## WARN ESLint
Command exited with a non-zero status.
Command: `npx eslint .`
Duration: 24001ms

<details>
<summary>Output</summary>

```text
D:\thanawy\frontend\next.config.js
  3:7  warning  'isDev' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\__tests__\integration\api-endpoints.test.ts
  2:10  warning  'createServer' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  3:10  warning  'parse' is defined but never used. Allowed unused vars must match /^_/u         @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\__tests__\integration\websocket.test.ts
  445:13  warning  'client1' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  446:13  warning  'client2' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  447:13  warning  'client3' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  448:13  warning  'client4' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  449:13  warning  'client5' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(auth)\login\_components\error-banner.tsx
  3:13  warning  'AnimatePresence' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  4:28  warning  'ArrowRight' is defined but never used. Allowed unused vars must match /^_/u       @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(auth)\login\_components\left-panel-info.tsx
    3:13   warning  'AnimatePresence' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
   25:33   warning  'deviceInfo' is defined but never used. Allowed unused args must match /^_/u       @typescript-eslint/no-unused-vars
  113:84   warning  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`                    react/no-unescaped-entities
  113:108  warning  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`                    react/no-unescaped-entities

D:\thanawy\frontend\src\app\(auth)\register\page.tsx
  102:25  warning  Compilation Skipped: Use of incompatible library

This API returns functions which cannot be memoized without leading to stale UI. To prevent this, by default React Compiler will skip memoizing this component/hook. However, you may see issues if values from this API are passed to other components/hooks that are memoized.

D:\thanawy\frontend\src\app\(auth)\register\page.tsx:102:25
  100 |   });
  101 |
> 102 |   const passwordValue = watch('password') || '';
      |                         ^^^^^ React Hook Form's `useForm()` API returns a `watch()` function which cannot be memoized safely.
  103 |   const roleValue = watch('role') || '';
  104 |   const acceptTerms = watch('acceptTerms') || false;
  105 |  react-hooks/incompatible-library

D:\thanawy\frontend\src\app\(auth)\verify-email\page.tsx
  53:6  warning  React Hook useEffect has a missing dependency: 'verifyEmail'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

D:\thanawy\frontend\src\app\(common)\hooks\useTokenStreamBuffer.ts
  92:65  warning  The ref value 'bufferRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'bufferRef.current' to a variable inside the effect, and use that variable in the cleanup function  react-hooks/exhaustive-deps

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

D:\thanawy\frontend\src\app\(dashboard)\dashboard\page.tsx
  77:7   warning  'recentActivity' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   @typescript-eslint/no-unused-vars
  85:36  warning  'isGamificationLoading' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            @typescript-eslint/no-unused-vars
  91:10  warning  'isDataLoading' is assigned a value but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               

... output truncated ...
```

</details>

## PASS Frontend tests
Completed successfully.
Command: `npm test`
Duration: 1927ms

<details>
<summary>Output</summary>

```text
> thanawy@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.5 [39m[90mD:/thanawy/frontend[39m

 [32m✓[39m src/__tests__/lib/api-error-utils.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/__tests__/integration/api-endpoints.test.ts [2m([22m[2m22 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/__tests__/integration/websocket.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/request-cache.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 15[2mms[22m[39m

[2m Test Files [22m [1m[32m4 passed[39m[22m[90m (4)[39m
[2m      Tests [22m [1m[32m44 passed[39m[22m[90m (44)[39m
[2m   Start at [22m 00:58:28
[2m   Duration [22m 1.25s[2m (transform 178ms, setup 0ms, import 242ms, tests 65ms, environment 3.99s)[22m
```

</details>

## PASS Next production build
Completed successfully.
Command: `npm run build`
Duration: 30528ms

<details>
<summary>Output</summary>

```text
> thanawy@0.1.0 build
> next build

▲ Next.js 16.2.6 (Turbopack)
- Environments: .env.local, .env.production, .env
- Experiments (use with caution):
  · optimizePackageImports

  Creating an optimized production build ...
✓ Compiled successfully in 10.0s
  Running TypeScript ...
  Finished TypeScript in 17.4s ...
  Collecting page data using 15 workers ...
  Generating static pages using 15 workers (0/64) ...
  Generating static pages using 15 workers (16/64) 
  Generating static pages using 15 workers (32/64) 
  Generating static pages using 15 workers (48/64) 
✓ Generating static pages using 15 workers (64/64) in 467ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ƒ /_not-found
├ ƒ /about
├ ƒ /academy
├ ƒ /achievements
├ ƒ /admin-login
├ ƒ /ai
├ ƒ /all-features
├ ƒ /analytics
├ ƒ /announcements
├ ƒ /announcements/new
├ ƒ /api/[...path]
├ ƒ /api/analytics/web-vitals
├ ƒ /api/cache/revalidate
├ ƒ /api/storage/chunked-upload
├ ƒ /api/storage/upload
├ ƒ /billing
├ ƒ /billing/referrals
├ ƒ /blog
├ ƒ /blog/new-post
├ ƒ /blog/post/[id]
├ ƒ /certificates/[id]
├ ƒ /chat
├ ƒ /chat/new
├ ƒ /contact
├ ƒ /contests/new
├ ƒ /courses
├ ƒ /courses/[id]
├ ƒ /courses/[id]/checkout
├ ƒ /dashboard
├ ƒ /events
├ ƒ /events/[id]
├ ƒ /events/new
├ ƒ /exams
├ ƒ /forgot-password
├ ƒ /forum
├ ƒ /forum/new-post
├ ƒ /forum/post/[id]
├ ƒ /goals
├ ƒ /grpc-demo
├ ƒ /leaderboard
├ ƒ /learning/[courseId]
├ ƒ /library
├ ƒ /login
├ ƒ /my-courses
├ ƒ /notifications
├ ƒ /offline
├ ƒ /pathways
├ ƒ /privacy
├ ƒ /progress
├ ƒ /register
├ ƒ /reset-password
├ ƒ /resources
├ ○ /robots.txt
├ ƒ /schedule
├ ƒ /settings
├ ƒ /settings/devices
├ ƒ /settings/notifications
├ ƒ /settings/privacy
├ ƒ /settings/security
├ ƒ /settings/security/logs
├ ○ /sitemap.xml
├ ƒ /subscription
├ ƒ /subscription/fail
├ ƒ /subscription/success
├ ƒ /tasks
├ ƒ /teacher-exams
├ ƒ /teachers
├ ƒ /time
├ ƒ /tips
├ ƒ /unauthorized
└ ƒ /verify-email


ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

Warning: Custom Cache-Control headers detected for the following routes:
  - /_next/static/:path*
  - /_next/image(.*)

Setting a custom Cache-Control header can break Next.js development behavior.
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
Turbopack build encountered 1 warnings:
./src/lib/logging/correlation.ts:30:21
Module not found: Can't resolve 'async_hooks'
  [90m28 |[0m     }
  [90m29 |[0m     [90m// eslint-disable-next-line @typescript-eslint/no-require-imports[0m
[31m[1m>[0m [90m30 |[0m     [36mconst[0m hookMod = require([32m'async_hooks'[0m);
  [90m   |[0m                     [31m[1m^^^^^^^^^^^^^^^^^^^^^^[0m
  [90m31 |[0m     [90m// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access[0m
  [90m32 |[0m     [36mreturn[0m [36mnew[0m (hookMod.[33mAsyncLocalStorage[0m [36mas[0m any)() [36mas[0m [33mALS[0m<[33mRequestContext[0m>;
  [90m33 |[0m   } [36mcatch[0m {



Import traces:
  Instrumentation:
    ./src/lib/logging/correlation.ts
    ./src/lib/logging/unified-logger.ts
    ./src/lib/logger.ts
    ./src/instrumentation.ts

  Client Component Browser:
    ./src/lib/logging/correlation.ts [Client Component Browser]
    ./src/lib/logging/unified-logger.ts [Client Component Browser]
    ./src/lib/logger.ts [Client Component Browser]
    ./src/lib/logging/error-service.ts [Client Component Browser]
    ./src/app/(dashboard)/error.tsx [Client Component Browser]
    ./src/app/(dashboard)/error.tsx [Server Component]

  Client Component SSR:
    ./src/lib/logging/correlation.ts [Client Component SSR]
    ./src/lib/logging/unified-logger.ts [Client Component SSR]
    ./src/lib/logger.ts [Client Component SSR]
    ./src/lib/logging/error-service.ts [Client Component SSR]
    ./src/app/error.tsx [Client Component SSR]
    ./src/app/error.tsx [Server Component]

https://nextjs.org/docs/messages/module-not-found
```

</details>

## WARN Secret and credential scan
23 possible secret references found.
Duration: 462ms

<details>
<summary>Output</summary>

```text
.claude\settings.local.json:4 - OpenAI API key
.codex\config.toml:6 - OpenAI API key
.env.check:2 - JWT-like token
.env.local:2 - JWT-like token
.env.prod:26 - JWT-like token
.env.production:2 - JWT-like token
.env.vercel.pulled:43 - JWT-like token
.kilo\worktrees\icy-archduke\.codex\config.toml:6 - OpenAI API key
.kilo\worktrees\icy-archduke\.env.check:2 - JWT-like token
.kilo\worktrees\icy-archduke\.env.local:2 - JWT-like token
.kilo\worktrees\icy-archduke\.env.prod:26 - JWT-like token
.kilo\worktrees\icy-archduke\.env.production:2 - JWT-like token
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
```

</details>

## PASS npm dependency audit
Completed successfully.
Command: `npm audit --audit-level=moderate --omit=dev`
Duration: 1174ms

<details>
<summary>Output</summary>

```text
found 0 vulnerabilities
```

</details>

# Thanawy Project Audit Report

Generated: 2026-06-08T05:01:59.344Z
Mode: check

## Summary

- Passed: 3
- Warnings: 2
- Failed: 1

## PASS TypeScript type-check
Completed successfully.
Command: `npx tsc --noEmit`
Duration: 4039ms

## WARN ESLint
Command exited with a non-zero status.
Command: `npx eslint .`
Duration: 22350ms

<details>
<summary>Output</summary>

```text
D:\thanawy\frontend\public\perf-detect.js
   93:14  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u    @typescript-eslint/no-unused-vars
  109:20  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u    @typescript-eslint/no-unused-vars
  109:23  error    Empty block statement                                                           no-empty
  112:14  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u    @typescript-eslint/no-unused-vars
  112:17  error    Empty block statement                                                           no-empty
  123:14  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u    @typescript-eslint/no-unused-vars
  123:17  error    Empty block statement                                                           no-empty
  130:9   warning  'acc' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  137:14  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u    @typescript-eslint/no-unused-vars
  137:17  error    Empty block statement                                                           no-empty
  170:14  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u    @typescript-eslint/no-unused-vars
  170:17  error    Empty block statement                                                           no-empty
  183:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u    @typescript-eslint/no-unused-vars
  185:89  warning  'e2' is defined but never used. Allowed unused caught errors must match /^_/u   @typescript-eslint/no-unused-vars
  185:93  error    Empty block statement                                                           no-empty

D:\thanawy\frontend\public\sw.js
   28:10  warning  'isLiteMode' is defined but never used. Allowed unused vars must match /^_/u     @typescript-eslint/no-unused-vars
   33:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u     @typescript-eslint/no-unused-vars
   33:15  error    Unreachable code                                                                 no-unreachable
  193:12  warning  'err' is defined but never used. Allowed unused caught errors must match /^_/u   @typescript-eslint/no-unused-vars
  199:57  warning  'maxAgeSeconds' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\__tests__\integration\api-endpoints.test.ts
  1:43  warning  'afterAll' is defined but never used. Allowed unused vars must match /^_/u      @typescript-eslint/no-unused-vars
  2:10  warning  'createServer' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  3:10  warning  'parse' is defined but never used. Allowed unused vars must match /^_/u         @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\__tests__\integration\websocket.test.ts
  445:13  warning  'client1' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  446:13  warning  'client2' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  447:13  warning  'client3' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  448:13  warning  'client4' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  449:13  warning  'client5' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(auth)\verify-email\page.tsx
  53:6  warning  React Hook useEffect has a missing dependency: 'verifyEmail'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

D:\thanawy\frontend\src\app\(common)\hooks\useTokenStreamBuffer.ts
  92:65  warning  The ref value 'bufferRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'bufferRef.current' to a variable inside the effect, and use that variable in the cleanup function  react-hooks/exhaustive-deps

D:\thanawy\frontend\src\app\(dashboard)\achievements\page.tsx
  54:4  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

D:\thanawy\frontend\src\app\(dashboard)\achievements\page.tsx:54:4
  52 | 	useEffect(() => {
  53 | 		if (hasRecentEarning) {
> 54 | 			setShowCelebration(true);
     | 			^^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  55 | 		}
  56 | 	}, [hasRecentEarning]);
  57 |  react-hooks/set-state-in-effect

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

D:\thanawy\frontend\src\app\(dashboard)\analytics\page.tsx
  41:21  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

D:\thanawy\frontend\src\app\(dashboard)\analytics\page.tsx:41:21
  39 |   const [data, setData] = useState<{ summary: SummaryData | null; weekly: WeeklyData | null; predictions: PredictionsData[]; performance: Record<string, unknown> | null } | null>(null);
  40 |
> 41 |   useEffect(() => { setMounted(true); }, []);
 

... output truncated ...
```

</details>

## FAIL Frontend tests
Command exited with a non-zero status.
Command: `npm test`
Duration: 1968ms

<details>
<summary>Output</summary>

```text
> thanawy@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.5 [39m[90mD:/thanawy/frontend[39m

 [32m✓[39m src/__tests__/lib/api-error-utils.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/request-cache.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/__tests__/integration/websocket.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 32[2mms[22m[39m
 [31m❯[39m src/__tests__/integration/api-endpoints.test.ts [2m([22m[2m22 tests[22m[2m | [22m[31m2 failed[39m[2m | [22m[33m20 skipped[39m[2m)[22m[32m 116[2mms[22m[39m
       [2m[90m↓[39m[22m GET /admin/dashboard - should return dashboard stats
       [2m[90m↓[39m[22m GET /admin/analytics - should return analytics data
       [2m[90m↓[39m[22m GET /admin/users - should list users with pagination
       [2m[90m↓[39m[22m POST /admin/users - should create a new user
       [2m[90m↓[39m[22m GET /admin/users/:id - should get user details
       [2m[90m↓[39m[22m PATCH /admin/users/:id - should update user
       [2m[90m↓[39m[22m DELETE /admin/users/:id - should delete user
       [2m[90m↓[39m[22m POST /admin/users/search - should search users
       [2m[90m↓[39m[22m POST /admin/subjects - should create subject
       [2m[90m↓[39m[22m GET /admin/subjects - should list subjects
       [2m[90m↓[39m[22m POST /admin/exams - should create exam
       [2m[90m↓[39m[22m GET /admin/exams - should list exams
       [2m[90m↓[39m[22m POST /admin/notifications/broadcast - should send broadcast
       [2m[90m↓[39m[22m GET /admin/broadcasts - should list broadcasts
       [2m[90m↓[39m[22m POST /admin/reports - should create custom report
       [2m[90m↓[39m[22m GET /admin/reports - should list reports
       [2m[90m↓[39m[22m should return 401 without token
       [2m[90m↓[39m[22m should return 403 for insufficient permissions
       [2m[90m↓[39m[22m should return 404 for non-existent resource
       [2m[90m↓[39m[22m should return 400 for invalid data
[31m     [31m×[31m should enforce rate limits[39m[32m 68[2mms[22m[39m
[31m     [31m×[31m should include rate limit headers[39m[32m 21[2mms[22m[39m

[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m3 passed[39m[22m[90m (4)[39m
[2m      Tests [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m22 passed[39m[22m[2m | [22m[33m20 skipped[39m[90m (44)[39m
[2m   Start at [22m 08:02:26
[2m   Duration [22m 1.31s[2m (transform 96ms, setup 0ms, import 181ms, tests 164ms, environment 3.94s)[22m


[31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Suites 1 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/__tests__/integration/api-endpoints.test.ts[2m > [22mAdmin API Endpoints
[31m[1mTypeError[22m: fetch failed[39m
[36m [2m❯[22m makeRequest src/__tests__/integration/api-endpoints.test.ts:[2m22:20[22m[39m
    [90m 20|[39m   }
    [90m 21|[39m
    [90m 22|[39m   [35mconst[39m response [33m=[39m [35mawait[39m [34mfetch[39m([32m`[39m[36m${[39m[33mAPI_BASE[39m[36m}[39m[32m[39m[36m${[39mendpoint[36m}[39m[32m`[39m[33m,[39m {
    [90m   |[39m                    [31m^[39m
    [90m 23|[39m     [33m...[39moptions[33m,[39m
    [90m 24|[39m     headers[33m,[39m
[90m [2m❯[22m src/__tests__/integration/api-endpoints.test.ts:[2m41:27[22m[39m

{
  stack: 'AggregateError: \n' +
    '    at internalConnectMultiple (node:net:1134:18)\n' +
    '    at afterConnectMultiple (node:net:1715:7)',
  errors: [
    {
      stack: 'Error: connect ECONNREFUSED ::1:8082\n' +
        '    at createConnectionError (node:net:1678:14)\n' +
        '    at afterConnectMultiple (node:net:1708:16)',
      message: 'connect ECONNREFUSED ::1:8082',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 8082,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    },
    {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:8082\n' +
        '    at createConnectionError (node:net:1678:14)\n' +
        '    at afterConnectMultiple (node:net:1708:16)',
      message: 'connect ECONNREFUSED 127.0.0.1:8082',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 8082,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    }
  ],
  code: 'ECONNREFUSED',
  constructor: 'Function<AggregateError>',
  name: 'Caused by: AggregateError',
  message: '',
  toString: 'Function<toString>',
  stacks: []
}
[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[22m[39m
[31m[1mSerialized Error:[22m[39m [90m{ errors: [ { stack: 'Error: connect ECONNREFUSED ::1:8082\n    at createConnectionError (node:net:1678:14)\n    at afterConnectMultiple (node:net:1708:16)', message: 'connect ECONNREFUSED ::1:8082', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 8082, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED 127.0.0.1:8082\n    at createConnectionError (node:net:1678:14)\n    at afterConnectMultiple (node:net:1708:16)', message: 'connect ECONNREFUSED 127.0.0.1:8082', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 8082, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }[39m
[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯[22m[39m


[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 2 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/__tests__/integration/api-endpoints.test.ts[2m > [22mAPI Rate Limiting[2m > [22mshould enforce rate limits
[31m[1mTypeError[22m: fetch failed[39m
[36m [2m❯[22m makeRequest src/__tests__/integration/api-endpoints.test.ts:[2m22:20[22m[39m
    [90m 20|[39m   }
    [90m 21|[39m
    [90m 22|[39m   [35mconst[39m response [33m=[39m [35mawait[39m [34mfetch[39m([32m`[39m[36m${[39m[33mAPI_BASE[39m[36m}[39m[32m[39m[36m${[39mendpoint[36m}[39m[32m`[39m[33m,[39m {
    [90m   |[39m                    [31m^[39m
    [90m 23|[39m     [33m...[39moptions[33m,[39m
    [90m 24|[39m     headers[33m,[39m
[90m [2m❯[22m src/__tests__/integration/api-endpoints.test.ts:[2m289:23[22m[39m

{
  stack: 'AggregateError: \n' +
    '    at internalConnectMultiple (node:net:1134:18)\n' +
    '    at afterConnectMultiple (node:net:1715:7)',
  errors: [
    {
      stack: 'Error: connect ECONNREFUSED ::1:8082\n' +
        '    at createConnectionError (node:net:1678:14)\n' +
        '    at afterConnectMultiple (node:net:1708:16)',
      message: 'connect ECONNREFUSED ::1:8082',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 8082,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    },
    {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:8082\n' +
        '    at createConnectionError (node:net:1678:14)\n' +
        '    at afterConnectMultiple (node:net:1708:16)',
      message: 'connect ECONNREFUSED 127.0.0.1:8082',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 8082,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    }
  ],
  code: 'ECONNREFUSED',
  constructor: 'Function<AggregateError>',
  name: 'Caused by: AggregateError',
  message: '',
  toString: 'Function<toString>',
  stacks: []
}
[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[22m[39m
[31m[1mSerialized Error:[22m[39m [90m{ errors: [ { stack: 'Error: connect ECONNREFUSED ::1:8082\n    at createConnectionError (node:net:1678:14)\n    at afterConnectMultiple (node:net:1708:16)', message: 'connect ECONNREFUSED ::1:8082', errno: -40

... output truncated ...
```

</details>

## PASS Next production build
Completed successfully.
Command: `npm run build`
Duration: 30729ms

<details>
<summary>Output</summary>

```text
> thanawy@0.1.0 build
> next build

▲ Next.js 16.2.6 (Turbopack)
- Environments: .env.local, .env.production, .env
- Experiments (use with caution):
  ✓ optimizeCss
  · optimizePackageImports
  · proxyClientMaxBodySize: "35mb"
  ✓ scrollRestoration

  Creating an optimized production build ...
✓ Compiled successfully in 9.4s
  Running TypeScript ...
  Finished TypeScript in 16.5s ...
  Collecting page data using 15 workers ...
  Generating static pages using 15 workers (0/63) ...
  Generating static pages using 15 workers (15/63) 
  Generating static pages using 15 workers (31/63) 
  Generating static pages using 15 workers (47/63) 
✓ Generating static pages using 15 workers (63/63) in 462ms
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

⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
```

</details>

## WARN Secret and credential scan
4 possible secret references found.
Duration: 157ms

<details>
<summary>Output</summary>

```text
.env:7 - JWT-like token
.env.local:2 - JWT-like token
.env.production:10 - JWT-like token
.env.vercel.check:26 - JWT-like token
```

</details>

## PASS npm dependency audit
Completed successfully.
Command: `npm audit --audit-level=moderate --omit=dev`
Duration: 1138ms

<details>
<summary>Output</summary>

```text
found 0 vulnerabilities
```

</details>

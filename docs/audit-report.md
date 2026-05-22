# Thanawy Project Audit Report

Generated: 2026-05-22T19:48:59.022Z
Mode: check

## Summary

- Passed: 5
- Warnings: 1
- Failed: 0

## PASS TypeScript type-check
Completed successfully.
Command: `npx tsc --noEmit`
Duration: 20945ms

## PASS ESLint
Completed successfully.
Command: `npx eslint .`
Duration: 24320ms

<details>
<summary>Output</summary>

```text
D:\thanawy\frontend\src\__tests__\integration\api-endpoints.test.ts
  1:43  warning  'afterAll' is defined but never used. Allowed unused vars must match /^_/u      @typescript-eslint/no-unused-vars
  2:10  warning  'createServer' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  3:10  warning  'parse' is defined but never used. Allowed unused vars must match /^_/u         @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(auth)\login\_components\background-layers.tsx
   7:32  warning  Error: Cannot call impure function during render

`Math.random` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

D:\thanawy\frontend\src\app\(auth)\login\_components\background-layers.tsx:7:32
   5 |
   6 | export function BackgroundLayers() {
>  7 |   const randomPosition = () => Math.random() * 100;
     |                                ^^^^^^^^^^^^^ Cannot call impure function
   8 |
   9 |   return (
  10 |     <div className="absolute inset-0 pointer-events-none">  react-hooks/purity
  24:33  warning  Error: Cannot call impure function during render

`Math.random` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

D:\thanawy\frontend\src\app\(auth)\login\_components\background-layers.tsx:24:33
  22 |             top: `${randomPosition()}%`
  23 |           }}>
> 24 |             <SecurityBit delay={Math.random() * 5} />
     |                                 ^^^^^^^^^^^^^ Cannot call impure function
  25 |           </div>
  26 |         ))}
  27 |       </div>         react-hooks/purity

D:\thanawy\frontend\src\app\(auth)\login\_components\security-bit.tsx
  13:16  warning  Error: Cannot call impure function during render

`Math.random` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

D:\thanawy\frontend\src\app\(auth)\login\_components\security-bit.tsx:13:16
  11 |         scale: [0.5, 1.2, 0.5],
  12 |         y: [-20, -100],
> 13 |         x: [0, Math.random() * 40 - 20]
     |                ^^^^^^^^^^^^^ Cannot call impure function
  14 |       }}
  15 |       transition={{
  16 |         duration: 4,  react-hooks/purity

D:\thanawy\frontend\src\app\(auth)\login\page.tsx
  55:21  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

D:\thanawy\frontend\src\app\(auth)\login\page.tsx:55:21
  53 |   const [deviceInfo, setDeviceInfo] = useState({ os: '', browser: '' });
  54 |
> 55 |   useEffect(() => { setDeviceInfo(getDeviceInfo()); }, []);
     |                     ^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  56 |
  57 |   const redirectUrl = useMemo(
  58 |     () => sanitizeRedirectPath(searchParams.get('redirect'), DEFAULT_AUTHENTICATED_ROUTE),  react-hooks/set-state-in-effect

D:\thanawy\frontend\src\app\(auth)\register\page.tsx
  3:10  warning  'useCallback' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(auth)\verify-email\page.tsx
  48:6  warning  React Hook useEffect has a missing dependency: 'verifyEmail'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

D:\thanawy\frontend\src\app\(community)\chat\new\page.tsx
  58:7  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

D:\thanawy\frontend\src\app\(community)\chat\new\page.tsx:58:7
  56 |   useEffect(() => {
  57 |     if (!searchTerm) {
> 58 |       setFilteredUsers(users);
     |       ^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  59 |       return;
  60 |     }
  61 |  react-hooks/set-state-in-effect

D:\thanawy\frontend\src\app\(dashboard)\achievements\hooks\useAchievements.ts
  104:3  warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

D:\thanawy\frontend\src\app\(dashboard)\achievements\hooks\useAchievements.ts:104:3
  102 |
  103 | 	useEffect(() => {
> 104 | 		fetchAchievements();
      | 		^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  105 | 	}, [fetchAchievements]);
  106 |
  107 | 	// Calculate filtered achievements and stats  react-hooks/set-state-in-effect

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

D:\thanawy\frontend\src\app\(dashboard)\ai\components\AIAssistant.tsx
   38:16  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u                                                                                                                                         

... output truncated ...
```

</details>

## PASS Frontend tests
Completed successfully.
Command: `npm test`
Duration: 1937ms

<details>
<summary>Output</summary>

```text
> thanawy@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.5 [39m[90mD:/thanawy/frontend[39m

 [32m✓[39m src/__tests__/lib/api-error-utils.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/request-cache.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 12[2mms[22m[39m

[2m Test Files [22m [1m[32m2 passed[39m[22m[90m (2)[39m
[2m      Tests [22m [1m[32m6 passed[39m[22m[90m (6)[39m
[2m   Start at [22m 22:49:44
[2m   Duration [22m 1.25s[2m (transform 58ms, setup 0ms, import 89ms, tests 16ms, environment 2.04s)[22m
```

</details>

## PASS Next production build
Completed successfully.
Command: `npm run build`
Duration: 35517ms

<details>
<summary>Output</summary>

```text
> thanawy@0.1.0 build
> next build

▲ Next.js 16.2.6 (Turbopack)
- Environments: .env.local, .env.production
- Experiments (use with caution):
  ✓ optimizeCss
  · optimizePackageImports
  · proxyClientMaxBodySize: "35mb"
  ✓ scrollRestoration

  Creating an optimized production build ...
✓ Compiled successfully in 12.1s
  Running TypeScript ...
  Finished TypeScript in 18.2s ...
  Collecting page data using 15 workers ...
  Generating static pages using 15 workers (0/56) ...
  Generating static pages using 15 workers (14/56) 
  Generating static pages using 15 workers (28/56) 
  Generating static pages using 15 workers (42/56) 
✓ Generating static pages using 15 workers (56/56) in 681ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ƒ /_not-found
├ ƒ /academy
├ ƒ /achievements
├ ƒ /admin-login
├ ƒ /ai
├ ƒ /analytics
├ ƒ /announcements
├ ƒ /announcements/new
├ ƒ /api/[...path]
├ ƒ /api/cache/revalidate
├ ƒ /billing
├ ƒ /billing/referrals
├ ƒ /blog
├ ƒ /blog/new-post
├ ƒ /blog/post/[id]
├ ƒ /certificates/[id]
├ ƒ /chat
├ ƒ /chat/new
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
├ ƒ /sign-in/[[...sign-in]]
├ ƒ /sign-up/[[...sign-up]]
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

Setting a custom Cache-Control header can break Next.js development behavior.
```

</details>

## WARN Secret and credential scan
2 possible secret references found.
Duration: 224ms

<details>
<summary>Output</summary>

```text
.claude\settings.local.json:4 - OpenAI API key
frontend\.env.local:2 - JWT-like token
```

</details>

## PASS npm dependency audit
Completed successfully.
Command: `npm audit --audit-level=moderate --omit=dev`
Duration: 1322ms

<details>
<summary>Output</summary>

```text
found 0 vulnerabilities
```

</details>

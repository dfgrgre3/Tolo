# Thanawy Project Audit Report

Generated: 2026-06-05T01:17:44.414Z
Mode: check

## Summary

- Passed: 2
- Warnings: 2
- Failed: 2

## FAIL TypeScript type-check
Command exited with a non-zero status.
Command: `npx tsc --noEmit`
Duration: 4324ms

<details>
<summary>Output</summary>

```text
src/components/layout/global-settings-applier.tsx(10,10): error TS2305: Module '"@/hooks"' has no exported member 'useGlobalSettings'.
src/components/upload/index.ts(2,15): error TS2724: '"./upload-zone"' has no exported member named 'UploadZoneProps'. Did you mean 'UploadZone'?
src/components/upload/index.ts(2,32): error TS2724: '"./upload-zone"' has no exported member named 'SingleFileUploadProps'. Did you mean 'SingleFileUpload'?
src/components/video/player/components/AmbientBackground.tsx(5,10): error TS2305: Module '"@/hooks"' has no exported member 'useEfficiencyMode'.
src/components/video/player/components/PlayerControls.tsx(28,10): error TS2305: Module '"@/hooks"' has no exported member 'useEfficiencyMode'.
src/components/video/player/components/PlayerPanels.tsx(14,10): error TS2305: Module '"@/hooks"' has no exported member 'useEfficiencyMode'.
src/lib/storage/client.ts(49,16): error TS2339: Property 'etag' does not exist on type '{ id: string; path: string; fullPath: string; }'.
src/lib/storage/client.ts(105,6): error TS2339: Property 'createManifest' does not exist on type 'StorageFileApi'.
src/lib/storage/client.ts(155,19): error TS2339: Property 'transform' does not exist on type 'Promise<{ data: { signedUrl: string; }; error: null; } | { data: null; error: StorageError; }>'.
src/lib/storage/client.ts(187,3): error TS2322: Type 'FileObject[]' is not assignable to type 'FileListItem[]'.
  Property 'size' is missing in type 'FileObject' but required in type 'FileListItem'.
src/lib/storage/client.ts(279,69): error TS2345: Argument of type 'Partial<CreateBucketOptions>' is not assignable to parameter of type '{ public: boolean; fileSizeLimit?: string | number | null | undefined; allowedMimeTypes?: string[] | null | undefined; }'.
  Types of property 'public' are incompatible.
    Type 'boolean | undefined' is not assignable to type 'boolean'.
      Type 'undefined' is not assignable to type 'boolean'.
src/lib/storage/client.ts(285,10): error TS2352: Conversion of type '{ message: string; }' to type 'BucketInfo' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type '{ message: string; }' is missing the following properties from type 'BucketInfo': id, name, owner, created_at, and 4 more.
src/lib/storage/index.ts(3,1): error TS2308: Module "./client" has already exported a member named 'formatFileSize'. Consider explicitly re-exporting to resolve the ambiguity.
src/lib/storage/index.ts(3,1): error TS2308: Module "./client" has already exported a member named 'generatePublicPath'. Consider explicitly re-exporting to resolve the ambiguity.
src/lib/storage/index.ts(3,1): error TS2308: Module "./client" has already exported a member named 'generateUserPath'. Consider explicitly re-exporting to resolve the ambiguity.
src/lib/storage/index.ts(3,1): error TS2308: Module "./client" has already exported a member named 'validateFileSize'. Consider explicitly re-exporting to resolve the ambiguity.
src/lib/storage/index.ts(3,1): error TS2308: Module "./client" has already exported a member named 'validateFileType'. Consider explicitly re-exporting to resolve the ambiguity.
src/lib/storage/server.ts(50,16): error TS2339: Property 'etag' does not exist on type '{ id: string; path: string; fullPath: string; }'.
src/lib/storage/server.ts(70,19): error TS2339: Property 'transform' does not exist on type 'Promise<{ data: { signedUrl: string; }; error: null; } | { data: null; error: StorageError; }>'.
src/lib/storage/server.ts(102,3): error TS2322: Type 'FileObject[]' is not assignable to type 'FileListItem[]'.
  Property 'size' is missing in type 'FileObject' but required in type 'FileListItem'.
src/lib/storage/server.ts(194,69): error TS2345: Argument of type 'Partial<CreateBucketOptions>' is not assignable to parameter of type '{ public: boolean; fileSizeLimit?: string | number | null | undefined; allowedMimeTypes?: string[] | null | undefined; }'.
  Types of property 'public' are incompatible.
    Type 'boolean | undefined' is not assignable to type 'boolean'.
      Type 'undefined' is not assignable to type 'boolean'.
src/lib/storage/server.ts(200,10): error TS2352: Conversion of type '{ message: string; }' to type 'BucketInfo' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type '{ message: string; }' is missing the following properties from type 'BucketInfo': id, name, owner, created_at, and 4 more.
```

</details>

## WARN ESLint
Command exited with a non-zero status.
Command: `npx eslint .`
Duration: 129856ms

<details>
<summary>Output</summary>

```text
D:\thanawy\frontend\public\sw.js
   3:35  warning  'event' is defined but never used. Allowed unused args must match /^_/u           @typescript-eslint/no-unused-vars
  14:17  warning  'query' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  14:24  warning  'scope' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\__tests__\integration\api-endpoints.test.ts
  1:43  warning  'afterAll' is defined but never used. Allowed unused vars must match /^_/u      @typescript-eslint/no-unused-vars
  2:10  warning  'createServer' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  3:10  warning  'parse' is defined but never used. Allowed unused vars must match /^_/u         @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(admin)\admin\ab-testing\page.tsx
   7:17  warning  'BarChart3' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                @typescript-eslint/no-unused-vars
  29:5   warning  Error: Cannot access variable before it is declared

`loadExperiments` is accessed before it is declared, which prevents the earlier access from updating when this value changes over time.

D:\thanawy\frontend\src\app\(admin)\admin\ab-testing\page.tsx:29:5
  27 |   // Load experiments on mount
  28 |   useEffect(() => {
> 29 |     loadExperiments();
     |     ^^^^^^^^^^^^^^^ `loadExperiments` accessed before it is declared
  30 |   }, []);
  31 |
  32 |   // Apply filters whenever experiments, status filter, or search term changes

D:\thanawy\frontend\src\app\(admin)\admin\ab-testing\page.tsx:52:3
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
  49:5   warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

D:\thanawy\frontend\src\app\(admin)\admin\ab-testing\page.tsx:49:5
  47 |     }
  48 |
> 49 |     setFilteredExperiments(result);
     |     ^^^^^^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  50 |   }, [experiments, statusFilter, searchTerm]);
  51 |
  52 |   const loadExperiments = async () => {                                      react-hooks/set-state-in-effect

D:\thanawy\frontend\src\app\(admin)\admin\achievements\AchievementFormDialog.tsx
  32:10  warning  'Award' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
  32:34  warning  'Medal' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(admin)\admin\achievements\AchievementTable.tsx
  14:3   warning  'Award' is defined but never used. Allowed unused vars must match /^_/u   @typescript-eslint/no-unused-vars
  14:67  warning  'Target' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

D:\thanawy\frontend\src\app\(admin)\admin\achievements\page.tsx
   7:16  warning  'Trophy' is defined but never used. Allowed unused vars must match /^_/u                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     @typescript-eslint/no-unused-vars
  49:5   warning  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

D:\thanawy\frontend\src\app\(admin)\admin\achievements\page.tsx:49:5
  47 |
  48 |   React.useEffect(() => {
> 49 |     fetchAchievements();
     |     ^^^^^^^^^^^^^^^^^ Avoid calling setState() directly within an effect
  50 |   }, [fetchAchievements]);
  51 |
  52 |   const handleOpenDialog = (achievement?: Achievement) => {  react-hooks/set-state-in-effect

D:\thanawy\frontend\src\app\(admin)\admin\analytics\page.tsx
   16:30  warning  'Trophy' is defined but never used. Allowed unused vars must match /^_/u                                                          @typescript-eslint/no-unused-vars
  259:25  error    React Hook "React.useMemo" is called conditionally. React Hooks must be called in the exact same order in every component render  react-hooks/rules-of-hooks
  265:6   warning  React Hook React.useMemo has a missing dependency: 'roleLabels'. Either include it or remove the dependency array                 react-hooks/exhaustive-deps
  268:28  error    React Hook "React.useMemo" is called conditionally. React Hooks must be called in the exact same order in every component render  react-hooks/rules-of-hooks

D:\thanawy\frontend\src\app\(admin)\admin\announcements\page.tsx
   13:19  warning  'Trash2' is d

... output truncated ...
```

</details>

## PASS Frontend tests
Completed successfully.
Command: `npm test`
Duration: 57861ms

<details>
<summary>Output</summary>

```text
> thanawy@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv4.1.5 [39m[90mD:/thanawy/frontend[39m

 [32m✓[39m src/__tests__/lib/api-error-utils.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m src/__tests__/lib/request-cache.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 18[2mms[22m[39m

[2m Test Files [22m [1m[32m2 passed[39m[22m[90m (2)[39m
[2m      Tests [22m [1m[32m6 passed[39m[22m[90m (6)[39m
[2m   Start at [22m 04:20:15
[2m   Duration [22m 40.62s[2m (transform 129ms, setup 0ms, import 282ms, tests 21ms, environment 77.18s)[22m
```

</details>

## FAIL Next production build
Command exited with a non-zero status.
Command: `npm run build`
Duration: 168541ms

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

> Build error occurred
Error: Turbopack build failed with 10 errors:
./frontend/src/lib/storage/server.ts:2:1
You're importing a module that depends on "next/headers". This API is only available in Server Components in the App Router, but you are using it in the Pages Router.
    Learn more: https://nextjs.org/docs/app/building-your-application/rendering/server-components
  [90m1 |[0m [36mimport[0m { createClient } [36mfrom[0m [32m"@/utils/supabase/server"[0m;
[31m[1m>[0m [90m2 |[0m [36mimport[0m { cookies } [36mfrom[0m [32m"next/headers"[0m;
  [90m  |[0m [31m[1m^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^[0m
  [90m3 |[0m [36mimport[0m [36mtype[0m {
  [90m4 |[0m   [33mUploadOptions[0m,
  [90m5 |[0m   [33mUploadResult[0m,

Ecmascript file had an error

Import traces:
  App Route:
    ./frontend/src/lib/storage/server.ts
    ./frontend/src/app/api/storage/upload/route.ts

  Client Component Browser:
    ./frontend/src/lib/storage/server.ts [Client Component Browser]
    ./frontend/src/hooks/use-upload.ts [Client Component Browser]
    ./frontend/src/hooks/index.ts [Client Component Browser]
    ./frontend/src/components/layout/global-settings-applier.tsx [Client Component Browser]
    ./frontend/src/providers/index.tsx [Client Component Browser]
    ./frontend/src/providers/index.tsx [Server Component]
    ./frontend/src/app/layout.tsx [Server Component]

  Client Component SSR:
    ./frontend/src/lib/storage/server.ts [Client Component SSR]
    ./frontend/src/hooks/use-upload.ts [Client Component SSR]
    ./frontend/src/hooks/index.ts [Client Component SSR]
    ./frontend/src/components/video/player/components/PlayerPanels.tsx [Client Component SSR]
    ./frontend/src/components/video/CourseVideoPlayer.tsx [Client Component SSR]
    ./frontend/src/app/(education)/courses/[id]/_components/lesson-video-area.tsx [Client Component SSR]
    ./frontend/src/app/(education)/courses/[id]/page.tsx [Client Component SSR]
    ./frontend/src/app/(education)/courses/[id]/page.tsx [Server Component]


./frontend/src/utils/supabase/server.ts:2:1
You're importing a module that depends on "next/headers". This API is only available in Server Components in the App Router, but you are using it in the Pages Router.
    Learn more: https://nextjs.org/docs/app/building-your-application/rendering/server-components
  [90m1 |[0m [36mimport[0m { createServerClient } [36mfrom[0m [32m"@supabase/ssr"[0m;
[31m[1m>[0m [90m2 |[0m [36mimport[0m { cookies } [36mfrom[0m [32m"next/headers"[0m;
  [90m  |[0m [31m[1m^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^[0m
  [90m3 |[0m
  [90m4 |[0m [36mconst[0m supabaseUrl = process.env.[33mNEXT_PUBLIC_SUPABASE_URL[0m;
  [90m5 |[0m [36mconst[0m supabaseKey = process.env.[33mNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY[0m;

Ecmascript file had an error

Import traces:
  App Route:
    ./frontend/src/utils/supabase/server.ts
    ./frontend/src/app/api/storage/upload/route.ts

  Client Component Browser:
    ./frontend/src/utils/supabase/server.ts [Client Component Browser]
    ./frontend/src/lib/storage/server.ts [Client Component Browser]
    ./frontend/src/hooks/use-upload.ts [Client Component Browser]
    ./frontend/src/hooks/index.ts [Client Component Browser]
    ./frontend/src/components/layout/global-settings-applier.tsx [Client Component Browser]
    ./frontend/src/providers/index.tsx [Client Component Browser]
    ./frontend/src/providers/index.tsx [Server Component]
    ./frontend/src/app/layout.tsx [Server Component]

  Client Component SSR:
    ./frontend/src/utils/supabase/server.ts [Client Component SSR]
    ./frontend/src/lib/storage/server.ts [Client Component SSR]
    ./frontend/src/hooks/use-upload.ts [Client Component SSR]
    ./frontend/src/hooks/index.ts [Client Component SSR]
    ./frontend/src/components/video/player/components/PlayerPanels.tsx [Client Component SSR]
    ./frontend/src/components/video/CourseVideoPlayer.tsx [Client Component SSR]
    ./frontend/src/app/(education)/courses/[id]/_components/lesson-video-area.tsx [Client Component SSR]
    ./frontend/src/app/(education)/courses/[id]/page.tsx [Client Component SSR]
    ./frontend/src/app/(education)/courses/[id]/page.tsx [Server Component]


./frontend/src/components/video/player/components/AmbientBackground.tsx:5:1
Export useEfficiencyMode doesn't exist in target module
  [90m3 |[0m [36mimport[0m { useEffect, useRef, memo } [36mfrom[0m [32m"react"[0m;
  [90m4 |[0m [36mimport[0m { useCourseVideoPlayerStore } [36mfrom[0m [32m"../store"[0m;
[31m[1m>[0m [90m5 |[0m [36mimport[0m { useEfficiencyMode } [36mfrom[0m [32m"@/hooks"[0m;
  [90m  |[0m [31m[1m^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^[0m
  [90m6 |[0m
  [90m7 |[0m [36mtype[0m [33mAmbientBackgroundProps[0m = {
  [90m8 |[0m   videoRef: [33mReact[0m.[33mRefObject[0m<[33mHTMLVideoElement[0m | [36mnull[0m>;

The export useEfficiencyMode was not found in module [project]/frontend/src/hooks/index.ts [app-client] (ecmascript).
Did you mean to import useFileManager?
All exports of the module are statically known (It doesn't have dynamic exports). So it's known statically that the requested export doesn't exist.

Import traces:
  Client Component Browser:
    ./frontend/src/components/video/player/components/AmbientBackground.tsx [Client Component Browser]
    ./frontend/src/components/video/CourseVideoPlayer.tsx [Client Component Browser]
    ./frontend/src/app/(education)/courses/[id]/_components/lesson-video-area.tsx [Client Component Browser]
    ./frontend/src/app/(education)/courses/[id]/page.tsx [Client Component Browser]
    ./frontend/src/app/(education)/courses/[id]/page.tsx [Server Component]

  Client Component SSR:
    ./frontend/src/components/video/player/components/AmbientBackground.tsx [Client Component SSR]
    ./frontend/src/components/video/CourseVideoPlayer.tsx [Client Component SSR]
    ./frontend/src/app/(education)/courses/[id]/_components/lesson-video-area.tsx [Client Component SSR]
    ./frontend/src/app/(education)/courses/[id]/page.tsx [Client Component SSR]
    ./frontend/src/app/(education)/courses/[id]/page.tsx [Server Component]


./frontend/src/components/video/player/components/AmbientBackground.tsx:5:1
Export useEfficiencyMode doesn't exist in target module
  [90m3 |[0m [36mimport[0m { useEffect, useRef, memo } [36mfrom[0m [32m"react"[0m;
  [90m4 |[0m [36mimport[0m { useCourseVideoPlayerStore } [36mfrom[0m [32m"../store"[0m;
[31m[1m>[0m [90m5 |[0m [36mimport[0m { useEfficiencyMode } [36mfrom[0m [32m"@/hooks"[0m;
  [90m  |[0m [31m[1m^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^[0m
  [90m6 |[0m
  [90m7 |[0m [36mtype[0m [33mAmbientBackgroundProps[0m = {
  [90m8 |[0m   videoRef: [33mReact[0m.[33mRefObject[0m<[33mHTMLVideoElement[0m | [36mnull[0m>;

The export useEfficiencyMode was not found in module [project]/frontend/src/hooks/index.ts [app-ssr] (ecmascript).
Did you mean to import useFileManager?
All exports of the module are statically known (It doesn't have dynamic exports). So it's known statically that the requested export doesn't exist.

Import traces:
  Client Component Browser:
    ./frontend/src/components/video/player/components/AmbientBackground.tsx [Client Component Browser]
    ./frontend/src/components/video/CourseVideoPlayer.tsx [Client Component Browser]
    ./frontend/src/app/(education)/courses/[id]/_components/lesson-video-area.tsx [Client Component Browser]
    ./frontend/src/app/(education)/courses/[id]/page.tsx [Client Component Browser]
    ./frontend/src/app/(education)/courses/[id]/page.tsx [Server Component]

  Client C

... output truncated ...
```

</details>

## WARN Secret and credential scan
10 possible secret references found.
Duration: 31784ms

<details>
<summary>Output</summary>

```text
.claude\settings.local.json:4 - OpenAI API key
.codex\config.toml:6 - OpenAI API key
.env.check:2 - JWT-like token
.env.local:2 - JWT-like token
.env.prod:26 - JWT-like token
.env.production:2 - JWT-like token
.vercel\.env.development.local:2 - JWT-like token
.vercel\.env.production.local:22 - JWT-like token
frontend\.env.local:2 - JWT-like token
frontend\.env.vercel.check:26 - JWT-like token
```

</details>

## PASS npm dependency audit
Completed successfully.
Command: `npm audit --audit-level=moderate --omit=dev`
Duration: 6183ms

<details>
<summary>Output</summary>

```text
found 0 vulnerabilities
```

</details>

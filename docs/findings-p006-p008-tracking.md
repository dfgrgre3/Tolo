# Tracking: architecture findings requiring product/backend decisions

These items were confirmed during review but need a decision from the team
(product, backend, or perf trade-off) rather than a safe unilateral frontend
patch. Do not "fix" these without agreeing the target behavior first.

## P006 — Progress pipeline has competing local/server state

**Where:** `useProgressPersistence.ts` (local pending queue, up to 20 items,
flushed periodically + on `online`) → `updateLessonProgress()` → server →
`useLearningHub` (manual merge of server response with previous client
state) → `CourseDetailClient`.

**Status:** Likely / Medium. Not a proven bug in all cases — conflict
resolution is timing-sensitive (local event → pending queue → server
response → next hydration), but no concrete repro found yet.

**What's already right:** completion events are not double-sent from the
player; the parent owns authoritative completion state.

**Needed before any fix:** a concrete repro (e.g. two tabs, or offline →
online race) showing stale/incorrect progress displayed. Until then, treat
as a design smell to watch, not a bug to patch.

---

## P007 — Global `refetchOnMount: false`

**Where:** `frontend/src/providers/index.tsx` — `staleTime: 60_000`,
`gcTime: 600_000`, `refetchOnMount: false` set globally for React Query.

**Status:** Likely Issue / Medium. With this config, a query can go stale
and a component can remount without refetching; freshness then depends
entirely on explicit invalidation, `refetchOnReconnect`, or manual refetch.
Not all pages are affected equally — some flows already invalidate
explicitly.

**Needed before any fix:** decide, per-surface, whether staleness is
acceptable (e.g. static content) or must refetch on mount (e.g. dashboards,
grades, exam results). A global flip to `true` risks reintroducing the
redundant-refetch problem this setting was added to solve — the fix should
be a targeted `refetchOnMount: true` override on the specific queries that
need it, not a global change.

**Validation plan:** E2E — open dashboard, wait >60s, mutate backend state
directly, navigate away and back, assert UI reflects the change.

---

## P008 — Dual API contract architecture

**Where:** two parallel HTTP layers coexist:
- Legacy/internal: `apiRoutes` + `apiClient` (`frontend/src/lib/api/api-client.ts`)
- Typed OpenAPI: `@thanawy/contracts` (`packages/contracts`) exporting
  `client`, `createContractsClient`, `paths`, `components`, `operations`,
  used via `openapi-fetch` + generated `api.ts`. Some services (e.g.
  teaching) already use the generated request/response types; others still
  use `apiClient`.

**Status:** Confirmed architecture duplication. Any API contract change
must be verified against both paths independently, which is a real
maintenance and correctness-drift risk.

**Recommended target state:**

```
UI
 ↓
domain service
 ↓
typed contract client   (packages/contracts)
 ↓
shared transport        (apiClient's CSRF/retry/timeout/auth logic, kept as transport only)
 ↓
Next proxy
```

`apiClient` should end up as the transport implementation used *under* the
typed contract client, not a parallel abstraction competing with it.

**Needed before any fix:** this is a multi-week migration (audit every
`apiRoutes.*` caller, generate/verify contract coverage for each, migrate
call sites incrementally, keep both working during transition). Needs
scoping and prioritization, not a single patch — recommend picking one
bounded domain (e.g. teaching, already partially migrated) to finish first
as a template for the rest.

# Frontend calls to endpoints missing on backend (P010 / C002-C004)

Generated for cross-reference by whoever is fixing the backend routes
(D:\backend is owned by a separate agent — not touched here). This file
only documents call sites; no frontend behavior was changed for these.

Each entry: frontend file + line, the exact path called (as built at
runtime), and the underlying `apiRoutes` constant if any.

## Resolved (verified against now-wired backend routes — 2026-09-13)

These endpoints were confirmed wired on the backend in a prior session.
Frontend call sites were re-checked line-by-line against `apiRoutes` in
`frontend/src/lib/api/routes.ts`; all of them already use the correct
path/method via `apiClient` (which auto-unwraps the `{success, data}`
envelope in `unwrapApplicationPayload`). No frontend code changes were
needed — everything below was verified-correct, not fixed.

- **teaching/settings** — `SettingsPanel.tsx:29,44,58` use `apiClient.get/patch/post`
  on `/api/teaching/settings` and `/api/teaching/settings/api-key`. Correct.
- **teaching/calendar** — `use-teaching-data.ts:558,570` use `apiClient.get/post`
  on `/api/teaching/calendar`. Correct.
- **teaching/conversations** — `use-teaching-data.ts:508,520` use `apiClient.get/post`
  on `/api/teaching/conversations` and `/api/teaching/conversations/{convId}/messages`.
  Correct.
- **blog/posts** — `blog-client.tsx:89` and `new-post/page.tsx:67` call
  `apiRoutes.blog.posts` (`/api/blog/posts`) via `apiClient`. Correct.
  `blog/page.tsx:59` calls `apiClient.get("/blog/posts")` (no `/api` prefix) —
  previously flagged as a possible bug, but this is SSR code and `apiClient`'s
  `normalizeEndpoint` routes server-side calls through `getBackendApiUrl()`,
  which strips/re-adds the `/api/v1` prefix regardless of what's passed in.
  Verified NOT a bug.
- **payments/by-order/:orderId** — `subscription/success/page.tsx:33` calls
  `apiRoutes.payments.byOrder(orderId)` → `/api/payments/by-order/{orderId}`,
  matching the backend's registered `/api/v1/payments/by-order/:orderId`
  (path param name doesn't matter to callers). Correct, via `apiClient`.
- **users/referrals** — `billing/referrals/page.tsx:38` calls
  `apiRoutes.users.referrals` → `/api/users/referrals` via `apiClient`. Correct.
- **community/users** — `chat/new/page.tsx:42` and `chat/page.tsx:313` call
  `apiRoutes.community.users` / `apiRoutes.community.userById(id)` via
  `apiClient`. Correct. Note: both files apply an extra manual `unwrap()`
  helper on top of `apiClient`'s own envelope unwrapping. This is redundant
  (by the time `apiClient.get` returns, the envelope is already stripped) but
  harmless — the manual `unwrap` is a no-op passthrough in this case since the
  returned payload has no `data` key of its own. Left as-is; not in scope to
  refactor working code.
- **events/:id** — `events/[id]/page.tsx:59` calls `apiRoutes.events.byId(id)`
  → `/api/events/{id}` via `apiClient`. Correct.
- **cart / cart/items** — `HeaderCartIcon.tsx:30` calls `apiClient.get("/cart")`
  (no `/api` prefix) — previously flagged, but `apiClient`'s browser-side
  `normalizeEndpoint` auto-prepends `/api` to any endpoint that doesn't
  already start with `/api/`, so this resolves to `/api/cart` correctly.
  Verified NOT a bug. `wishlist/page.tsx:60` (`POST /api/cart/items`) already
  matches `apiRoutes.cart.items`.

## Still open — pending concurrent backend work (verify before use)

A separate backend session is implementing these concurrently. Frontend call
sites already exist and already go through `apiClient` (envelope-unwrapping
is in place), but the **response shape** has not been confirmed against the
real implementation yet. Do not assume the shape — verify against the actual
backend response once that session's work lands, before relying on any field
names read off these responses in the frontend.

### events/:id/attendees, events/:id/attend
- `frontend/src/app/(community)/events/[id]/page.tsx:69` — `GET /api/events/{id}/attendees` (via `apiRoutes.events.attendees`)
- `frontend/src/app/(community)/events/[id]/page.tsx:95` — `POST /api/events/{id}/attend` (via `apiRoutes.events.attend`)
- `frontend/src/app/(community)/events/[id]/page.tsx:127` — `DELETE /api/events/{id}/attend` (via `apiRoutes.events.attend`)
- Constants: `frontend/src/lib/api/routes.ts:388-389`
- Backend implementation in progress (EventAttendee model, RSVP with status+capacity) — verify response shape (e.g. whether `attendees` is a bare array or an object with pagination/status fields, and whether `attend`/`unattend` return the updated attendee record or just a status) before trusting the current frontend's assumptions (`Attendee[]` array, `{id,name,avatar,joinedAt}` shape).

### grades
- `frontend/src/app/(education)/teacher-exams/page.tsx:82` — `GET /api/grades` (via `apiRoutes.grades.list`)
- `frontend/src/app/(education)/teacher-exams/page.tsx:123` — `POST /api/grades` (via `apiRoutes.grades.list`)
- `frontend/src/app/(education)/teacher-exams/page.tsx:150` — `GET /api/grades` (via `apiRoutes.grades.list`)
- `frontend/src/app/(education)/teacher-exams/page.tsx:171` — `DELETE /api/grades/{id}` (via `apiRoutes.grades.byId`)
- Constants: `frontend/src/lib/api/routes.ts:148-149`
- Backend implementation in progress (new `Grade` model) — verify response shape once the model lands; the frontend currently assumes a `UserGrade[]` array with fields like `subject`, `grade`, `maxGrade`, `date`, `notes`, `isOnline`, `assignmentType`, `teacherId`. Do not fabricate a fix if the real shape differs — confirm against the backend first.

## cart/checkout
- No direct call site found in `frontend/src/app` at present; constant exists at `frontend/src/lib/api/routes.ts:238` (`/api/cart/checkout`) and is referenced by `frontend/src/__tests__/lib/idempotency-policy.test.ts:9`.

## Notes
- All paths in `frontend/src/lib/api/routes.ts` use the corrected `/api` prefix
  (not `/api/v1`) — this is intentional: `apiClient`'s `normalizeEndpoint`
  (browser) and `getBackendApiUrl` (server) both compose the final
  `/api/v1/...` URL, so `apiRoutes` constants must stay at the `/api/...`
  level. Do not "fix" these to `/api/v1/...`.
- No frontend features were removed or altered while compiling this list or
  performing the 2026-09-13 verification pass above.

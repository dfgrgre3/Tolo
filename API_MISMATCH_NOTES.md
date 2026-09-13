# Frontend calls to endpoints missing on backend (P010 / C002-C004)

Generated for cross-reference by whoever is fixing the backend routes
(D:\backend is owned by a separate agent — not touched here). This file
only documents call sites; no frontend behavior was changed for these.

Each entry: frontend file + line, the exact path called (as built at
runtime), and the underlying `apiRoutes` constant if any.

## teaching/settings
- `frontend/src/app/teaching/components/SettingsPanel.tsx:29` — `GET /api/teaching/settings`
- `frontend/src/app/teaching/components/SettingsPanel.tsx:44` — `PATCH /api/teaching/settings`
- `frontend/src/app/teaching/components/SettingsPanel.tsx:58` — `POST /api/teaching/settings/api-key`

## teaching/calendar
- `frontend/src/app/teaching/hooks/use-teaching-data.ts:558` — `GET /api/teaching/calendar`
- `frontend/src/app/teaching/hooks/use-teaching-data.ts:570` — `POST /api/teaching/calendar`

## teaching/conversations
- `frontend/src/app/teaching/hooks/use-teaching-data.ts:508` — `GET /api/teaching/conversations`
- `frontend/src/app/teaching/hooks/use-teaching-data.ts:520` — `POST /api/teaching/conversations/{convId}/messages`

## grades
- `frontend/src/app/(education)/teacher-exams/page.tsx:82` — `GET /api/grades` (via `apiRoutes.grades.list`)
- `frontend/src/app/(education)/teacher-exams/page.tsx:123` — `POST /api/grades` (via `apiRoutes.grades.list`)
- `frontend/src/app/(education)/teacher-exams/page.tsx:150` — `GET /api/grades` (via `apiRoutes.grades.list`)
- `frontend/src/app/(education)/teacher-exams/page.tsx:171` — `DELETE /api/grades/{id}` (via `apiRoutes.grades.byId`)
- Constants: `frontend/src/lib/api/routes.ts:148-149`

## cart / cart/items
- `frontend/src/app/(education)/wishlist/page.tsx:60` — `POST /api/cart/items`
- `frontend/src/components/header/HeaderCartIcon.tsx:30` — `GET /cart` (note: missing `/api` prefix here too — this call is likely also broken independent of the backend-route question; worth a follow-up fix once backend contract is confirmed)
- Constants: `frontend/src/lib/api/routes.ts:236-238` (`items`, `item`, `checkout`)

## cart/checkout
- No direct call site found in `frontend/src/app` at present; constant exists at `frontend/src/lib/api/routes.ts:238` (`/api/cart/checkout`) and is referenced by `frontend/src/__tests__/lib/idempotency-policy.test.ts:9`.

## events/:id, events/:id/attendees, events/:id/attend
- `frontend/src/app/(community)/events/[id]/page.tsx:59` — `GET /api/events/{id}` (via `apiRoutes.events.byId`)
- `frontend/src/app/(community)/events/[id]/page.tsx:69` — `GET /api/events/{id}/attendees` (via `apiRoutes.events.attendees`)
- `frontend/src/app/(community)/events/[id]/page.tsx:95` — `POST /api/events/{id}/attend` (via `apiRoutes.events.attend`)
- `frontend/src/app/(community)/events/[id]/page.tsx:127` — `DELETE /api/events/{id}/attend` (via `apiRoutes.events.attend`)
- Constants: `frontend/src/lib/api/routes.ts:388-389`

## blog/posts
- `frontend/src/app/(community)/blog/blog-client.tsx:89` — `GET /api/blog/posts` (via `apiRoutes.blog.posts`)
- `frontend/src/app/(community)/blog/new-post/page.tsx:67` — `POST /api/blog/posts` (via `apiRoutes.blog.posts`)
- `frontend/src/app/(community)/blog/page.tsx:59` — `GET /blog/posts` (note: missing `/api` prefix — likely a separate bug from the missing-backend-route issue; flagging here since it's adjacent)
- Constants: `frontend/src/lib/api/routes.ts:377-379`

## payments/by-order/:id
- `frontend/src/app/(dashboard)/subscription/success/page.tsx:33` — `GET /api/payments/by-order/{orderId}` (via `apiRoutes.payments.byOrder`)
- Constant: `frontend/src/lib/api/routes.ts:248`

## users/referrals
- `frontend/src/app/(dashboard)/billing/referrals/page.tsx:38` — `GET /api/users/referrals` (via `apiRoutes.users.referrals`)
- Constant: `frontend/src/lib/api/routes.ts:206`

## community/users
- `frontend/src/app/(community)/chat/new/page.tsx:42` — `GET /api/community/users` (via `apiRoutes.community.users`)
- `frontend/src/app/(community)/chat/page.tsx:313` — `GET /api/community/users/{id}` (via `apiRoutes.community.userById`)
- Constants: `frontend/src/lib/api/routes.ts:321-322`

## Notes
- All paths above already use the corrected `/api` prefix (not `/api/v1`) except the two flagged missing-prefix call sites (`HeaderCartIcon.tsx:30`, `blog/page.tsx:59`), which look like pre-existing bugs unrelated to the P001 `/api/v1` fix and are called out for awareness only — not changed here per the read-only scope of this task.
- No frontend features were removed or altered while compiling this list.

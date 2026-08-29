# Thanawy — Educational Platform (Frontend Monorepo)

Next.js frontend for **Thanawy/Tolo**, an Arabic-first education platform for Egyptian
secondary-school students (ثانوية عامة): courses, live streams, exams/quizzes,
AI study tools, gamification, and a full teacher workspace.

## Repository layout

```
thanawy/
├── frontend/          # Next.js 16 (App Router) + React 19 + TypeScript strict
├── shared/            # Shared TypeScript types (workspace package)
├── docs/              # Internal audit reports
├── .github/workflows/ # CI (lint / types / tests / build / knip / audit)
├── docker-compose.production.yml
└── Dockerfile.frontend
```

The Go backend lives in a **separate repository** (`backend/`) and is reached
through the API proxy — see "Talking to the backend" below.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, webpack build), React 19 |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| Styling | Tailwind CSS 4 |
| State/data | Zustand, TanStack Query (with persistence) |
| Realtime | WebSocket layer (`src/lib/realtime/`) feeding notifications |
| Auth | Supabase (GoTrue) — HttpOnly cookies, MFA; JWT verified at the edge |
| Storage | Supabase Storage (direct + chunked upload routes) |
| Quality | ESLint (flat config, warning ratchet), Vitest, knip, Sentry |

## Getting started

**Prerequisites:** Node.js 20+, npm. The Go backend on `localhost:8082` for full
functionality (auth, courses, …). Supabase project env vars.

```bash
npm install            # from the repo root (workspaces: frontend + shared)

cd frontend
cp .env.example .env.local   # fill in the values (see below)
npm run dev                  # http://localhost:3000
```

### Environment variables

`frontend/.env.local` (dev) / configured per-environment in production:

- `NEXT_PUBLIC_API_URL` — backend base URL (e.g. `http://localhost:8082/api`)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `JWT_SECRET` — **must match the backend's HS256 signing secret**; the edge
  middleware fails closed without it (tokens are rejected, not decoded)
- `IMPERSONATION_SECRET` — admin impersonation signing secret (shared with backend)
- `REDIS_URL` — optional server-side cache

Never commit `.env*` files (already git-ignored). Secrets in `.env.production`
must be rotated if the file was ever exposed.

## Scripts (run inside `frontend/`)

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (webpack) |
| `npm run dev:turbo` | Dev server (Turbopack) |
| `npm run build` / `build:turbo` | Production build |
| `npm run lint` | ESLint **with a warning ratchet** (`--max-warnings=177`) |
| `npm run type-check` | `tsc --noEmit` |
| `npm run test:ci` | Vitest unit tests |
| `npm run knip` | Dead-code report (repo root) |
| `npm run check:errors` | type-check + lint + tests together |

### The lint warning ratchet

`no-explicit-any` was re-enabled as a **warning** with a hard ceiling: the lint
script fails if the codebase produces **more than 177 warnings**. Existing
violations (mostly historical `any`s) are being typed away incrementally — when
the count drops, lower the number in `package.json` until the rule can be
flipped to `error`. **Do not raise the ceiling.**

## Project conventions

- **API routes**: all backend endpoints are registered in
  `frontend/src/lib/api/routes.ts` — import paths from there (`apiRoutes.*`)
  instead of hand-writing URL strings. Calls go through `apiClient`
  (`src/lib/api/api-client.ts`), which handles auth cookies, retries, and
  idempotency.
- **Logging**: use the unified logger (`src/lib/logging/unified-logger.ts`),
  not raw `console.*`.
- **Route groups**: `(education)`, `(dashboard)`, `(community)`, `(common)` are
  App Router groups — they do **not** appear in URLs. `/teachers` is
  `src/app/(education)/teachers/`.
- **HTML from the backend** (lesson content) must be rendered through
  `sanitizeHtml()` (`src/lib/security/sanitize-html.ts`) — never inject raw.
- **i18n**: user-facing strings go through the i18n dictionaries, not inline text.
- **Canonical URLs**: the teacher workspace is `/teaching` (`/teach` redirects
  to it); the teachers directory is `/teachers` (`/contacts` redirects to it).

## CI

`.github/workflows/ci.yml` runs on pushes/PRs to `main`/`develop`:

1. **frontend** — lint → type-check → unit tests → production build
2. **knip** — dead-code report (non-blocking until the backlog is cleared)
3. **audit** — `npm audit --omit=dev`; critical vulns block, high ones report

## Deployment

Two supported paths:

- **Vercel** (primary): frontend + backend deployed as Vercel projects;
  environment variables managed in the Vercel dashboard.
- **Docker/VPS**: `docker-compose.production.yml` + `Dockerfile.frontend`
  (multi-stage, non-root, standalone output). Set the real API domain before
  using it — placeholders remain in the compose file.

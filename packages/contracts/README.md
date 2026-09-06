# @thanawy/contracts

Generated API contract for the Thanawy backend (OpenAPI 2.0).

## Layout

```
packages/contracts/
  swagger.json         # Source of truth — fetched from backend CI artifact
  src/
    generated/
      api.ts           # AUTO-GENERATED — do not edit. Run `npm run generate`.
    index.ts           # Re-exports types + client
    client.ts          # Configured openapi-fetch client (auth, base URL, …)
```

## How it stays in sync

1. Backend CI (`d:\backend\.github\workflows\ci.yml`) produces
   `backend/docs/swagger.json` and uploads it as a GitHub Actions artifact.
2. The artifact is downloaded by `scripts/fetch-swagger.mjs` into this
   directory's `swagger.json`.
3. `openapi-typescript` turns the spec into a strict TS module:
   `src/generated/api.ts`.
4. `src/client.ts` wraps `openapi-fetch` with the runtime config the
   frontend needs (base URL, auth header injection, retry policy).

## Local workflow

```bash
# One-off: regenerate from a local backend checkout.
npm run contracts:fetch -- --source ../backend/docs/swagger.json
npm run generate:api-types

# CI workflow: download artifact + generate + type-check.
npm run contracts:generate
```

## Long-term direction

- Replace the hand-written `src/lib/api/*.ts` helpers and per-domain
  service files (`src/services/auth-service.ts`, `src/services/courses-service.ts`,
  …) with thin wrappers around the generated client. Each wrapper keeps
  the same exported function names so call sites don't move, but every
  request/response is type-checked against `openapi-fetch`.
- When every endpoint is migrated, the runtime contract test
  (`frontend/src/__tests__/integration/api-contract.test.ts`) becomes
  unnecessary — the TS compiler enforces the same guarantee at build time.

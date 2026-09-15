# Authentication lifecycle E2E

Start the disposable infrastructure first:

```bash
docker compose --profile dev up -d postgres redis mailpit
# start the backend and frontend with the test database/migrations
E2E_AUTH_LIFECYCLE=true npm run test:e2e -- auth-lifecycle.integration.spec.ts
```

The suite uses the real frontend proxy, PostgreSQL-backed API, Redis session
and rate-limit state, and Mailpit verification messages. It is skipped by
default. OAuth tests should run in the same environment with a local OIDC
stub and `E2E_OAUTH=true`; real provider credentials are never committed.

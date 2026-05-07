# Database Migrations Contract

The production database schema is controlled only by SQL migration files in:

`backend/internal/db/migrations`

## Production

- Run SQL migrations from one release job or one application instance with `RUN_DB_MIGRATIONS=true`.
- Do not enable `DB_AUTO_MIGRATE` in production. The backend refuses to run AutoMigrate when `NODE_ENV`, `APP_ENV`, `GO_ENV`, or `ENVIRONMENT` is `production`.
- Do not edit a migration after it has been applied. Create a new numbered migration instead.
- Migration checksum mismatches fail startup by default. Use `ALLOW_MIGRATION_CHECKSUM_UPDATE=true` only after a deliberate manual database reconciliation.

## Development

- SQL migrations run by default before the optional AutoMigrate path.
- AutoMigrate is allowed only as a local-development convenience to keep models easy to iterate on.
- Any new table, column, index, constraint, or enum needed by production must still be represented by an explicit SQL migration.

## New Schema Checklist

1. Add or update the Go model.
2. Add a new SQL migration with the next number.
3. Include indexes, unique constraints, foreign keys, and safe defaults in the migration.
4. Keep the migration idempotent when possible.
5. Run `go test ./internal/... ./pkg/... ./cmd/api`.

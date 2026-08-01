# PostgreSQL Migrations

SDKWork Web Server uses the `baseline-plus-migrations` strategy declared in
`database/database.manifest.json`:

- `database/ddl/baseline/postgres/0001_web_baseline.sql` is the authoritative
  schema snapshot for fresh installations. It is also the source for the
  `database/contract/schema.yaml` contract.
- This directory holds expand-only migrations for already-installed databases.
  The first applied migration (`0001_web_schema_hardening`) carries the
  production-readiness schema changes (partial slug uniqueness, tenant list
  indexes, credential GIN index, and referential integrity).

Conventions:

- File names must match `\d{4}_[a-z0-9_]+.up.sql` / `.down.sql` (four-digit
  zero-padded sequence).
- Up migrations must be idempotent where PostgreSQL allows (`IF NOT EXISTS` /
  `DROP ... IF EXISTS` before creating), because the module may be re-applied.
- Every DDL change ships with a paired down migration.
- After changing the baseline, regenerate the contract:

  ```powershell
  pnpm db:materialize:contract
  pnpm db:validate
  ```

- Apply and verify with the database CLI:

  ```powershell
  pnpm db:migrate
  pnpm db:drift:check
  ```

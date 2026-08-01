# WEB Database Module

Canonical lifecycle assets for the `sdkwork-web-server` PostgreSQL control-plane authority.

- moduleId: `web`
- serviceCode: `WEB`
- owner: `web-platform`
- databaseRole: `authoritative-server`
- engine: PostgreSQL 16 or later
- required extensions: none
- tablePrefix: `web_`

## Initialization State

This module is in initialization state for greenfield PostgreSQL deployments:

1. `database/ddl/baseline/postgres/0001_web_baseline.sql` is the full PostgreSQL DDL snapshot.
2. `database/migrations/postgres/` contains checksum-tracked forward migrations for every schema
   change made after the initial baseline. Existing databases must never be upgraded by replaying
   or editing the baseline.
3. Production and staging use explicit migration commands; `lifecycle.autoMigrate` defaults to `false`.
4. `pnpm db:drift:check` verifies the deployed schema before release.

The pre-launch `1.1.0` reconciliation migration upgrades databases initialized before the Website
runtime control plane and `application_type` were added. It preserves existing sites as `WEB` and
refuses to invent tenant-scope hashes for legacy Web Nodes; operators must supply those hashes from
their authoritative tenant assignments before rerunning the migration.

SQLite is not an authoritative server engine or deployment profile. This Web Server repository
does not provide a server-side SQLite repository or SQLite release profile. Any future SQLite
fixture must be declared separately as `client-local`; it cannot be used as server parity evidence,
an authority fallback, or a rollback target.

## Commands

```bash
pnpm run db:validate
pnpm run db:materialize:contract
pnpm run db:plan
pnpm run db:init
pnpm run db:migrate
pnpm run db:seed
pnpm run db:status
pnpm run db:drift:check
SDKWORK_DATABASE_TEST_POSTGRES_URL=<disposable-url> pnpm run db:test:postgres
pnpm run test:database:recovery
pnpm run test:postgres:ha
```

`db:test:postgres` requires an explicit, disposable, empty PostgreSQL database and refuses to continue if the target schema already contains
`web_*` tables.

`test:database:recovery` is a destructive drill scoped to its temporary test directory and disposable
PostgreSQL container. PostgreSQL recovery is the authoritative release evidence. SQLite client-local
tests, if introduced by a client component, cannot establish server backup, transaction, or
compatibility support.

`test:postgres:ha` owns two disposable PostgreSQL containers and one internal Docker network. It proves
physical base backup, asynchronous WAL streaming, replay to a recorded flush LSN, primary shutdown,
standby promotion, and post-promotion tenant writes. It does not establish automatic leader election,
client rerouting, synchronous-replication RPO, split-brain fencing, managed-provider behavior,
multi-zone capacity, or production RTO.

Related standards: `../sdkwork-specs/DATABASE_SPEC.md`,
`../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md`, and `../sdkwork-specs/MIGRATION_SPEC.md`.

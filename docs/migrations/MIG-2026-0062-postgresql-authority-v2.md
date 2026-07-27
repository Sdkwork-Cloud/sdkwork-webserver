# MIG-2026-0062 PostgreSQL Authority V2

```yaml
id: MIG-2026-0062
owner: web-platform
status: active
requirement: REQ-2026-0004
type: database
scope:
  producers:
    - sdkwork-web-server
    - database/database.manifest.json
  consumers:
    - sdkwork-webserver-database-host
    - sdkwork-api-web-server-standalone-gateway
    - sdkwork-webserver-certificate-worker
compatibility_window:
  starts_at: 2026-07-26
  ends_at: 2026-08-31
strategy: cutover
postgresql_target:
  minimum_version: 16
  required_extensions: []
  authoritative_contract: database/contract/schema.yaml
legacy_sqlite:
  classification: non-compliant-server-migration-input
  retained_surface: isolated-repository-test-fixture-only
  fixture: tests/fixtures/database/sqlite/0001_web_baseline.sql
  removal_milestone: 2026-08-31
  prohibited_uses:
    - deployment profile
    - release package asset
    - shared control-plane authority
    - production backup or rollback target
data_cutover:
  method: maintenance-window-copy
  identity: preserve all web_* primary keys and UUIDs
  validation:
    - compare per-table row counts
    - compare tenant-scoped checksums for canonical columns
    - validate constraints and indexes after copy
  cdc: not-enabled
  dual_write: not-enabled
rollback:
  supported: true
  steps:
    - stop Web control-plane writers
    - restore the last verified PostgreSQL backup or forward-fix PostgreSQL
    - deploy the prior compatible service build against PostgreSQL
    - reconcile writes captured after the backup boundary
  forbidden:
    - return authority to a SQLite file
verification:
  - pnpm db:validate
  - pnpm db:test:sqlite
  - SDKWORK_WEB_POSTGRES_TEST_DATABASE_URL=<disposable-url> pnpm db:test:postgres
  - pnpm test:postgres:required
```

The manifest v2 cutover makes PostgreSQL the only declared authority. The historical SQLite
baseline remains available solely to exercise SQLx repository semantics in a disposable test
database. It is intentionally outside `database/` so lifecycle discovery and release packaging
cannot treat it as an authoritative engine.

Production cutover requires PostgreSQL backup/restore evidence, the disposable PostgreSQL
repository parity gate, and an operator-approved maintenance window. This record does not claim
that an existing SQLite deployment has already been copied; operators must complete and retain
the row-count, checksum, constraint, and backup evidence before switching a live installation.

-- sdkwork:migration
-- id: 0003_detach_custom_domain_assets
-- engine: postgres
-- module: web
-- purpose: Allow custom domain assets to exist before application binding
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: access-exclusive-short
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 1.3.0
-- rewrite: Metadata-only NOT NULL relaxation plus validated check constraint
-- replication_impact: Bounded DDL only; existing rows and foreign keys remain unchanged
-- backfill_plan: Existing domains remain bound to their current applications
-- observability: Verify detached domain creation, binding, and db:drift:check after migration
-- cancellation_point: Cancel before the migration transaction commits
-- recovery_command: Fix the reported precondition and rerun pnpm db:migrate

ALTER TABLE web_domain
    ALTER COLUMN site_id DROP NOT NULL;

ALTER TABLE web_domain
    ADD CONSTRAINT chk_web_domain_primary_binding
    CHECK (site_id IS NOT NULL OR is_primary = false)
    NOT VALID;

ALTER TABLE web_domain
    VALIDATE CONSTRAINT chk_web_domain_primary_binding;

COMMENT ON COLUMN web_domain.site_id IS 'Optional current application binding';

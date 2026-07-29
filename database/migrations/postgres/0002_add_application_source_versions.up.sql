-- sdkwork:migration
-- id: 0002_add_application_source_versions
-- engine: postgres
-- module: web
-- purpose: Add immutable Drive-backed source versions and release provenance
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: access-exclusive-short
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 1.2.0
-- rewrite: New table plus nullable metadata-only deployment column
-- replication_impact: Bounded DDL only; no deployment backfill is required
-- backfill_plan: Existing deployments retain artifact snapshots with a null source_version_id
-- observability: Verify with db:status and db:drift:check after migration
-- cancellation_point: Cancel before the migration transaction commits
-- recovery_command: Fix the reported precondition and rerun pnpm db:migrate

CREATE TABLE IF NOT EXISTS web_source_version (
    id              BIGINT       NOT NULL,
    uuid            VARCHAR(64)  NOT NULL,
    tenant_id       BIGINT       NOT NULL,
    organization_id BIGINT       NOT NULL DEFAULT 0,
    user_id         BIGINT,
    site_id         BIGINT       NOT NULL,
    version_tag     VARCHAR(100) NOT NULL,
    source_type     VARCHAR(16)  NOT NULL,
    source_ref      VARCHAR(500),
    commit_hash     VARCHAR(64),
    artifact_path   VARCHAR(500) NOT NULL,
    artifact_size   BIGINT       NOT NULL,
    artifact_hash   VARCHAR(64)  NOT NULL,
    config_snapshot JSONB        NOT NULL DEFAULT '{}',
    status          INTEGER      NOT NULL DEFAULT 1,
    pruned_at       TIMESTAMPTZ,
    pruned_by       BIGINT,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_source_version_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_source_version_site_tag UNIQUE (tenant_id, site_id, version_tag),
    CONSTRAINT chk_web_source_version_type CHECK (source_type IN ('ARCHIVE', 'DIRECTORY', 'GIT')),
    CONSTRAINT chk_web_source_version_status CHECK (status IN (0, 1, 2, 3)),
    CONSTRAINT fk_web_source_version_site FOREIGN KEY (site_id) REFERENCES web_site(id)
);

COMMENT ON TABLE web_source_version IS 'Immutable Drive-backed application source version';
COMMENT ON COLUMN web_source_version.status IS 'Status: 0=preparing, 1=ready, 2=failed, 3=pruned';

CREATE INDEX IF NOT EXISTS idx_web_source_version_site_created
    ON web_source_version (site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_web_source_version_retention
    ON web_source_version (tenant_id, site_id, status, created_at DESC);

ALTER TABLE web_deployment
    ADD COLUMN IF NOT EXISTS source_version_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'web_deployment'::regclass
          AND conname = 'fk_web_deployment_source_version'
    ) THEN
        ALTER TABLE web_deployment
            ADD CONSTRAINT fk_web_deployment_source_version
            FOREIGN KEY (source_version_id) REFERENCES web_source_version(id);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_web_deployment_source_version
    ON web_deployment (source_version_id);

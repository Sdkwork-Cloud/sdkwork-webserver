-- sdkwork:migration
-- id: 0004_add_root_domain_zones
-- engine: postgres
-- module: web
-- purpose: Add explicit root-domain Zones and hostname ownership
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: access-exclusive-short
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 1.4.0
-- rewrite: New table plus nullable metadata-only foreign-key column
-- replication_impact: Bounded DDL; existing flat domain rows remain ungrouped and compatible
-- backfill_plan: Do not infer root domains from public suffix heuristics; operators define Zones explicitly
-- observability: Verify root-domain paging, child creation, deployment projection, and db:drift:check
-- cancellation_point: Cancel before the migration transaction commits
-- recovery_command: Fix the reported precondition and rerun pnpm db:migrate

CREATE TABLE IF NOT EXISTS web_root_domain (
    id              BIGINT       NOT NULL,
    uuid            VARCHAR(64)  NOT NULL,
    tenant_id       BIGINT       NOT NULL DEFAULT 0,
    organization_id BIGINT       NOT NULL DEFAULT 0,
    hostname        VARCHAR(253) NOT NULL,
    status          INTEGER      NOT NULL DEFAULT 1,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    deleted_at      TIMESTAMPTZ,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_root_domain_uuid UNIQUE (uuid),
    CONSTRAINT chk_web_root_domain_status CHECK (status BETWEEN 0 AND 2)
);

COMMENT ON TABLE web_root_domain IS 'Tenant-owned root-domain Zone';
COMMENT ON COLUMN web_root_domain.hostname IS 'Explicit normalized root domain';
COMMENT ON COLUMN web_root_domain.status IS 'Status: 0=pending, 1=active, 2=disabled';

CREATE UNIQUE INDEX IF NOT EXISTS uk_web_root_domain_tenant_hostname
    ON web_root_domain (tenant_id, hostname)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_web_root_domain_tenant_updated
    ON web_root_domain (tenant_id, updated_at DESC, id DESC);

ALTER TABLE web_domain
    ADD COLUMN IF NOT EXISTS root_domain_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'web_domain'::regclass
          AND conname = 'fk_web_domain_root_domain'
    ) THEN
        ALTER TABLE web_domain
            ADD CONSTRAINT fk_web_domain_root_domain
            FOREIGN KEY (root_domain_id) REFERENCES web_root_domain(id);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_web_domain_root_updated
    ON web_domain (tenant_id, root_domain_id, updated_at DESC, id DESC);

COMMENT ON COLUMN web_domain.root_domain_id IS 'Optional explicit root-domain Zone owner';

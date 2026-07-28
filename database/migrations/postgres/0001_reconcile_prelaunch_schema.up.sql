-- sdkwork:migration
-- id: 0001_reconcile_prelaunch_schema
-- engine: postgres
-- module: web
-- purpose: Reconcile pre-launch databases with the current Web control-plane schema
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: access-exclusive-short
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 1.1.0
-- rewrite: Metadata-only column additions and empty pre-launch runtime tables
-- replication_impact: Bounded DDL only; no bulk row rewrite is expected
-- backfill_plan: Default existing sites to WEB; require explicit tenant scope hashes for legacy servers
-- observability: Verify with db:status and db:drift:check after migration
-- cancellation_point: Cancel before the migration transaction commits
-- recovery_command: Fix the reported precondition and rerun pnpm db:migrate

ALTER TABLE web_site
    ADD COLUMN IF NOT EXISTS application_type VARCHAR(16);

UPDATE web_site
SET application_type = 'WEB'
WHERE application_type IS NULL;

ALTER TABLE web_site
    ALTER COLUMN application_type SET DEFAULT 'WEB',
    ALTER COLUMN application_type SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'web_site'::regclass
          AND conname = 'chk_web_site_application_type'
    ) THEN
        ALTER TABLE web_site
            ADD CONSTRAINT chk_web_site_application_type
            CHECK (application_type IN ('WEB', 'API'));
    END IF;
END
$$;

COMMENT ON COLUMN web_site.application_type IS
    'Application traffic category: WEB or API';

CREATE INDEX IF NOT EXISTS idx_web_site_tenant_application_type_updated
    ON web_site (tenant_id, application_type, updated_at DESC);

ALTER TABLE web_server
    ADD COLUMN IF NOT EXISTS tenant_scope_hash VARCHAR(64);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM web_server
        WHERE tenant_scope_hash IS NULL
    ) THEN
        RAISE EXCEPTION USING
            MESSAGE = 'web_server.tenant_scope_hash requires an explicit lowercase SHA-256 backfill',
            HINT = 'Backfill every legacy Web Node from its authoritative tenant scope, then rerun pnpm db:migrate.';
    END IF;
END
$$;

ALTER TABLE web_server
    ALTER COLUMN tenant_scope_hash SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'web_server'::regclass
          AND conname = 'uk_web_server_tenant_id'
    ) THEN
        ALTER TABLE web_server
            ADD CONSTRAINT uk_web_server_tenant_id
            UNIQUE (tenant_id, id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'web_server'::regclass
          AND conname = 'chk_web_server_tenant_scope_hash'
    ) THEN
        ALTER TABLE web_server
            ADD CONSTRAINT chk_web_server_tenant_scope_hash
            CHECK (tenant_scope_hash ~ '^[0-9a-f]{64}$');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS web_runtime_assignment (
    id                  BIGINT        NOT NULL,
    uuid                VARCHAR(64)   NOT NULL,
    tenant_id           BIGINT        NOT NULL,
    server_id           BIGINT        NOT NULL,
    environment         VARCHAR(32)   NOT NULL,
    generation          BIGINT        NOT NULL,
    snapshot_uuid       VARCHAR(128)  NOT NULL,
    snapshot_sha256     VARCHAR(64)   NOT NULL,
    runtime_set         JSONB         NOT NULL,
    runtime_set_bytes   BIGINT        NOT NULL,
    assigned_by_subject VARCHAR(128)  NOT NULL,
    created_at          TIMESTAMPTZ   NOT NULL,
    updated_at          TIMESTAMPTZ   NOT NULL,
    version             BIGINT        NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_runtime_assignment_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_runtime_assignment_tenant_id
        UNIQUE (tenant_id, id, server_id),
    CONSTRAINT uk_web_runtime_assignment_generation
        UNIQUE (tenant_id, server_id, environment, generation),
    CONSTRAINT uk_web_runtime_assignment_snapshot UNIQUE (snapshot_uuid),
    CONSTRAINT fk_web_runtime_assignment_server
        FOREIGN KEY (tenant_id, server_id) REFERENCES web_server (tenant_id, id),
    CONSTRAINT chk_web_runtime_assignment_environment
        CHECK (environment IN ('development', 'test', 'staging', 'production')),
    CONSTRAINT chk_web_runtime_assignment_generation
        CHECK (generation BETWEEN 1 AND 9007199254740991),
    CONSTRAINT chk_web_runtime_assignment_snapshot_sha256
        CHECK (snapshot_sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT chk_web_runtime_assignment_runtime_set
        CHECK (jsonb_typeof(runtime_set) = 'object'),
    CONSTRAINT chk_web_runtime_assignment_runtime_set_bytes
        CHECK (runtime_set_bytes BETWEEN 1 AND 67108864)
);

COMMENT ON TABLE web_runtime_assignment IS
    'Immutable Website runtime-set assignment delivered to one Web Node environment';

CREATE INDEX IF NOT EXISTS idx_web_runtime_assignment_current
    ON web_runtime_assignment (tenant_id, server_id, environment, generation DESC);

CREATE TABLE IF NOT EXISTS web_runtime_observation (
    id              BIGINT        NOT NULL,
    uuid            VARCHAR(64)   NOT NULL,
    tenant_id       BIGINT        NOT NULL,
    assignment_id   BIGINT        NOT NULL,
    server_id       BIGINT        NOT NULL,
    state           VARCHAR(16)   NOT NULL,
    node_version    VARCHAR(64),
    reason_code     VARCHAR(64),
    detail          VARCHAR(512),
    observed_at     TIMESTAMPTZ   NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL,
    updated_at      TIMESTAMPTZ   NOT NULL,
    version         BIGINT        NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_runtime_observation_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_runtime_observation_state
        UNIQUE (tenant_id, assignment_id, state),
    CONSTRAINT fk_web_runtime_observation_assignment
        FOREIGN KEY (tenant_id, assignment_id, server_id)
        REFERENCES web_runtime_assignment (tenant_id, id, server_id),
    CONSTRAINT chk_web_runtime_observation_state
        CHECK (state IN ('RECEIVED', 'VALIDATED', 'STAGED', 'ACTIVE', 'REJECTED')),
    CONSTRAINT chk_web_runtime_observation_reason
        CHECK (
            (state = 'REJECTED' AND reason_code IS NOT NULL)
            OR (state <> 'REJECTED' AND reason_code IS NULL AND detail IS NULL)
        )
);

COMMENT ON TABLE web_runtime_observation IS
    'Append-only Web Node activation observations for an immutable runtime assignment';

CREATE INDEX IF NOT EXISTS idx_web_runtime_observation_assignment
    ON web_runtime_observation (tenant_id, assignment_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_web_runtime_observation_node_time
    ON web_runtime_observation (tenant_id, server_id, observed_at DESC);

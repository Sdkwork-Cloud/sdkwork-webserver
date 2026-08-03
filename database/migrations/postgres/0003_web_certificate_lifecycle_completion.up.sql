-- sdkwork:migration
-- version: 0003
-- engine: postgres
-- module: web
-- description: Certificate lifecycle completion for pre-1.6.0 databases: operation,
--   node-state, and secret-bundle tables, certificate/domain owner columns, and
--   listener binding version columns, FKs, CHECKs, and index predicates.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: access-exclusive
-- lock_timeout: 30s
-- statement_timeout: 120s

-- Certificate and domain records gain an owning user column.
ALTER TABLE web_certificate
    ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE web_domain
    ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- Listener bindings: the pre-1.6.0 shape tracked only a single version
-- (certificate_version_id). The current contract pairs desired_version_id with
-- current_version_id, so the legacy column is migrated and replaced.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'web_listener_certificate_binding'
          AND column_name = 'certificate_version_id'
    ) THEN
        ALTER TABLE web_listener_certificate_binding
            DROP CONSTRAINT IF EXISTS fk_web_listener_certificate_binding_version;
        ALTER TABLE web_listener_certificate_binding
            ADD COLUMN desired_version_id BIGINT;
        UPDATE web_listener_certificate_binding
           SET desired_version_id = certificate_version_id;
        ALTER TABLE web_listener_certificate_binding
            ALTER COLUMN desired_version_id SET NOT NULL;
        ALTER TABLE web_listener_certificate_binding
            ADD COLUMN current_version_id BIGINT;
        -- The legacy CHECKs reference the removed column and the retired
        -- status vocabulary; the current shapes are restored below.
        ALTER TABLE web_listener_certificate_binding
            DROP CONSTRAINT IF EXISTS chk_web_listener_certificate_binding_active_version;
        ALTER TABLE web_listener_certificate_binding
            DROP CONSTRAINT IF EXISTS chk_web_listener_certificate_binding_status;
        ALTER TABLE web_listener_certificate_binding
            DROP COLUMN certificate_version_id;
    END IF;
END
$$;

-- Version reference FKs on the binding.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'web_listener_certificate_binding'::regclass
          AND conname = 'fk_web_listener_certificate_binding_desired_version'
    ) THEN
        ALTER TABLE web_listener_certificate_binding
            ADD CONSTRAINT fk_web_listener_certificate_binding_desired_version
            FOREIGN KEY (certificate_id, desired_version_id)
            REFERENCES web_certificate_version(certificate_id, id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'web_listener_certificate_binding'::regclass
          AND conname = 'fk_web_listener_certificate_binding_current_version'
    ) THEN
        ALTER TABLE web_listener_certificate_binding
            ADD CONSTRAINT fk_web_listener_certificate_binding_current_version
            FOREIGN KEY (certificate_id, current_version_id)
            REFERENCES web_certificate_version(certificate_id, id);
    END IF;
END
$$;

-- Current status and active-version CHECK shapes.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'web_listener_certificate_binding'::regclass
          AND conname = 'chk_web_listener_certificate_binding_status'
    ) THEN
        ALTER TABLE web_listener_certificate_binding
            ADD CONSTRAINT chk_web_listener_certificate_binding_status
            CHECK (status IN ('PENDING', 'DEPLOYING', 'ACTIVE', 'PAUSED', 'FAILED', 'ARCHIVED'));
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'web_listener_certificate_binding'::regclass
          AND conname = 'chk_web_listener_certificate_binding_active_version'
    ) THEN
        ALTER TABLE web_listener_certificate_binding
            ADD CONSTRAINT chk_web_listener_certificate_binding_active_version
            CHECK (
                status <> 'ACTIVE'
                OR (
                    current_version_id = desired_version_id
                    AND activated_at IS NOT NULL
                )
            );
    END IF;
END
$$;

-- Active-version and default-binding uniqueness now treat every non-archived
-- row as live instead of only ACTIVE rows.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'web_listener_certificate_binding'::regclass
          AND conname = 'uk_web_listener_certificate_binding_active_algorithm'
    ) THEN
        ALTER TABLE web_listener_certificate_binding
            DROP CONSTRAINT uk_web_listener_certificate_binding_active_algorithm;
    ELSE
        DROP INDEX IF EXISTS uk_web_listener_certificate_binding_active_algorithm;
    END IF;
END
$$;
CREATE UNIQUE INDEX uk_web_listener_certificate_binding_active_algorithm
    ON web_listener_certificate_binding (site_binding_id, key_algorithm)
    WHERE status <> 'ARCHIVED' AND deleted_at IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'web_listener_certificate_binding'::regclass
          AND conname = 'uk_web_listener_certificate_binding_default'
    ) THEN
        ALTER TABLE web_listener_certificate_binding
            DROP CONSTRAINT uk_web_listener_certificate_binding_default;
    ELSE
        DROP INDEX IF EXISTS uk_web_listener_certificate_binding_default;
    END IF;
END
$$;
CREATE UNIQUE INDEX uk_web_listener_certificate_binding_default
    ON web_listener_certificate_binding (site_binding_id)
    WHERE is_default = true AND status <> 'ARCHIVED' AND deleted_at IS NULL;

-- Certificate lifecycle completion tables (folded into the 1.6.0 baseline).
CREATE TABLE IF NOT EXISTS web_certificate_operation (
    id                   BIGINT       NOT NULL,
    uuid                 VARCHAR(64)  NOT NULL,
    tenant_id            BIGINT       NOT NULL,
    certificate_id       BIGINT       NOT NULL,
    requested_by         BIGINT,
    operation_type       VARCHAR(16)  NOT NULL,
    status               VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    attempt_count        INTEGER      NOT NULL DEFAULT 0,
    max_attempts         INTEGER      NOT NULL DEFAULT 5,
    next_attempt_at      TIMESTAMPTZ  NOT NULL,
    lease_owner          VARCHAR(128),
    lease_expires_at     TIMESTAMPTZ,
    fencing_token        BIGINT       NOT NULL DEFAULT 0,
    failure_code         VARCHAR(64),
    idempotency_key_hash VARCHAR(64),
    request_sha256       VARCHAR(64)  NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL,
    updated_at           TIMESTAMPTZ  NOT NULL,
    completed_at         TIMESTAMPTZ,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_certificate_operation_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_certificate_operation_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT fk_web_certificate_operation_certificate FOREIGN KEY (tenant_id, certificate_id)
        REFERENCES web_certificate(tenant_id, id),
    CONSTRAINT chk_web_certificate_operation_type CHECK (operation_type IN ('ISSUE', 'RENEW')),
    CONSTRAINT chk_web_certificate_operation_status CHECK (status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED')),
    CONSTRAINT chk_web_certificate_operation_attempts CHECK (
        max_attempts BETWEEN 1 AND 10
        AND attempt_count BETWEEN 0 AND max_attempts
    ),
    CONSTRAINT chk_web_certificate_operation_fencing CHECK (fencing_token >= 0),
    CONSTRAINT chk_web_certificate_operation_hashes CHECK (
        request_sha256 ~ '^[0-9a-f]{64}$'
        AND (idempotency_key_hash IS NULL OR idempotency_key_hash ~ '^[0-9a-f]{64}$')
    ),
    CONSTRAINT chk_web_certificate_operation_lease CHECK (
        (status = 'RUNNING' AND lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
        OR (status <> 'RUNNING' AND lease_owner IS NULL AND lease_expires_at IS NULL)
    ),
    CONSTRAINT chk_web_certificate_operation_completion CHECK (
        (status IN ('SUCCEEDED', 'FAILED') AND completed_at IS NOT NULL)
        OR (status IN ('PENDING', 'RUNNING') AND completed_at IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS web_certificate_node_state (
    id                     BIGINT       NOT NULL,
    uuid                   VARCHAR(64)  NOT NULL,
    tenant_id              BIGINT       NOT NULL,
    server_id              BIGINT       NOT NULL,
    certificate_id         BIGINT       NOT NULL,
    certificate_version_id BIGINT       NOT NULL,
    state                  VARCHAR(16)  NOT NULL,
    fingerprint_sha256     VARCHAR(64)  NOT NULL,
    sync_version           VARCHAR(80)  NOT NULL,
    failure_code           VARCHAR(64),
    observed_at            TIMESTAMPTZ  NOT NULL,
    created_at             TIMESTAMPTZ  NOT NULL,
    updated_at             TIMESTAMPTZ  NOT NULL,
    version                BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_certificate_node_state_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_certificate_node_state_version
        UNIQUE (tenant_id, server_id, certificate_version_id),
    CONSTRAINT fk_web_certificate_node_state_server FOREIGN KEY (tenant_id, server_id)
        REFERENCES web_server(tenant_id, id),
    CONSTRAINT fk_web_certificate_node_state_certificate FOREIGN KEY (tenant_id, certificate_id)
        REFERENCES web_certificate(tenant_id, id),
    CONSTRAINT fk_web_certificate_node_state_version FOREIGN KEY (certificate_id, certificate_version_id)
        REFERENCES web_certificate_version(certificate_id, id),
    CONSTRAINT chk_web_certificate_node_state_phase CHECK (
        state IN ('STAGED', 'ACTIVE', 'SERVED', 'FAILED')
    ),
    CONSTRAINT chk_web_certificate_node_state_fingerprint CHECK (
        fingerprint_sha256 ~ '^[0-9a-f]{64}$'
    ),
    CONSTRAINT chk_web_certificate_node_state_sync_version CHECK (
        sync_version ~ '^sv1:[0-9a-f]{64}$'
    ),
    CONSTRAINT chk_web_certificate_node_state_failure_code CHECK (
        failure_code IS NULL OR failure_code ~ '^[A-Z0-9][A-Z0-9_.-]{0,63}$'
    )
);

CREATE TABLE IF NOT EXISTS web_certificate_secret_bundle (
    id                     BIGINT       NOT NULL,
    uuid                   VARCHAR(64)  NOT NULL,
    tenant_id              BIGINT       NOT NULL,
    certificate_version_id BIGINT       NOT NULL,
    encryption_algorithm   VARCHAR(32)  NOT NULL,
    bundle_encrypted       TEXT         NOT NULL,
    created_at             TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_certificate_secret_bundle_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_certificate_secret_bundle_version UNIQUE (tenant_id, certificate_version_id),
    CONSTRAINT fk_web_certificate_secret_bundle_version FOREIGN KEY (tenant_id, certificate_version_id)
        REFERENCES web_certificate_version(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT chk_web_certificate_secret_bundle_algorithm CHECK (
        encryption_algorithm = 'AES_256_GCM_V1'
    ),
    CONSTRAINT chk_web_certificate_secret_bundle_payload CHECK (
        OCTET_LENGTH(bundle_encrypted) BETWEEN 64 AND 2097152
    )
);

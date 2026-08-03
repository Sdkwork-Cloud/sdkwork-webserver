-- sdkwork:migration
-- version: 0003
-- engine: postgres
-- module: web
-- description: Revert certificate lifecycle completion to the pre-1.6.0 shape.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: access-exclusive
-- lock_timeout: 30s
-- statement_timeout: 120s

-- Certificate lifecycle completion tables.
DROP TABLE IF EXISTS web_certificate_secret_bundle;
DROP TABLE IF EXISTS web_certificate_node_state;
DROP TABLE IF EXISTS web_certificate_operation;

-- Listener bindings revert to the single certificate_version_id column.
ALTER TABLE web_listener_certificate_binding
    DROP CONSTRAINT IF EXISTS fk_web_listener_certificate_binding_current_version;
ALTER TABLE web_listener_certificate_binding
    DROP CONSTRAINT IF EXISTS fk_web_listener_certificate_binding_desired_version;
ALTER TABLE web_listener_certificate_binding
    DROP CONSTRAINT IF EXISTS chk_web_listener_certificate_binding_active_version;
ALTER TABLE web_listener_certificate_binding
    DROP CONSTRAINT IF EXISTS chk_web_listener_certificate_binding_status;
ALTER TABLE web_listener_certificate_binding
    ADD COLUMN certificate_version_id BIGINT;
UPDATE web_listener_certificate_binding
   SET certificate_version_id = desired_version_id;
ALTER TABLE web_listener_certificate_binding
    ALTER COLUMN certificate_version_id SET NOT NULL;
ALTER TABLE web_listener_certificate_binding
    ADD CONSTRAINT fk_web_listener_certificate_binding_version
    FOREIGN KEY (certificate_id, certificate_version_id)
    REFERENCES web_certificate_version(certificate_id, id);
ALTER TABLE web_listener_certificate_binding
    DROP COLUMN IF EXISTS current_version_id;
ALTER TABLE web_listener_certificate_binding
    DROP COLUMN IF EXISTS desired_version_id;
ALTER TABLE web_listener_certificate_binding
    ADD CONSTRAINT chk_web_listener_certificate_binding_status
    CHECK (status IN ('CANDIDATE', 'ACTIVE', 'PAUSED', 'FAILED', 'ARCHIVED'));
ALTER TABLE web_listener_certificate_binding
    ADD CONSTRAINT chk_web_listener_certificate_binding_active_version
    CHECK (
        status <> 'ACTIVE'
        OR (
            certificate_version_id IS NOT NULL
            AND activated_at IS NOT NULL
        )
    );
DROP INDEX IF EXISTS uk_web_listener_certificate_binding_active_algorithm;
CREATE UNIQUE INDEX uk_web_listener_certificate_binding_active_algorithm
    ON web_listener_certificate_binding (site_binding_id, key_algorithm)
    WHERE status = 'ACTIVE' AND deleted_at IS NULL;
DROP INDEX IF EXISTS uk_web_listener_certificate_binding_default;
CREATE UNIQUE INDEX uk_web_listener_certificate_binding_default
    ON web_listener_certificate_binding (site_binding_id)
    WHERE is_default = true AND status = 'ACTIVE' AND deleted_at IS NULL;

-- Owner columns introduced with the certificate lifecycle completion.
ALTER TABLE web_domain
    DROP COLUMN IF EXISTS user_id;
ALTER TABLE web_certificate
    DROP COLUMN IF EXISTS user_id;

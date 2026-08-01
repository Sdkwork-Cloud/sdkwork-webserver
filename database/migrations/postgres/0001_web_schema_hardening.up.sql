-- sdkwork:migration
-- version: 0001
-- engine: postgres
-- module: web
-- description: Schema hardening for production readiness: partial slug uniqueness,
--   tenant list indexes, Web Node credential GIN index, and referential integrity.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: access-exclusive
-- lock_timeout: 30s
-- statement_timeout: 120s

-- Active slugs are unique per tenant; soft-deleted sites release their slug.
DROP INDEX IF EXISTS uk_web_site_slug;
CREATE UNIQUE INDEX uk_web_site_slug
    ON web_site (tenant_id, slug)
    WHERE deleted_at IS NULL;

-- Tenant-scoped Nginx config listing order.
CREATE INDEX IF NOT EXISTS idx_web_nginx_config_tenant_updated
    ON web_nginx_config (tenant_id, updated_at DESC, id DESC);

-- Tenant-scoped audit log listing order.
CREATE INDEX IF NOT EXISTS idx_web_audit_log_tenant_created
    ON web_audit_log (tenant_id, created_at DESC, id DESC);

-- Web Node credential (metadata agentTokenHash) lookups.
CREATE INDEX IF NOT EXISTS idx_web_server_metadata_gin
    ON web_server USING GIN (metadata);

-- Environment variables belong to a site.
ALTER TABLE web_env_variable
    ADD CONSTRAINT fk_web_env_variable_site
    FOREIGN KEY (site_id) REFERENCES web_site(id);

-- Health results need stable identities and referential integrity.
ALTER TABLE web_health_result
    ADD CONSTRAINT uk_web_health_result_uuid UNIQUE (uuid);
ALTER TABLE web_health_result
    ADD CONSTRAINT fk_web_health_result_check
    FOREIGN KEY (health_check_id) REFERENCES web_health_check(id);
ALTER TABLE web_health_result
    ADD CONSTRAINT fk_web_health_result_site
    FOREIGN KEY (site_id) REFERENCES web_site(id);

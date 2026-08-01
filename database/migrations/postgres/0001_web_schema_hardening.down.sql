-- Rollback: 0001_web_schema_hardening

ALTER TABLE web_health_result
    DROP CONSTRAINT IF EXISTS fk_web_health_result_site;
ALTER TABLE web_health_result
    DROP CONSTRAINT IF EXISTS fk_web_health_result_check;
ALTER TABLE web_health_result
    DROP CONSTRAINT IF EXISTS uk_web_health_result_uuid;
ALTER TABLE web_env_variable
    DROP CONSTRAINT IF EXISTS fk_web_env_variable_site;
DROP INDEX IF EXISTS idx_web_server_metadata_gin;
DROP INDEX IF EXISTS idx_web_audit_log_tenant_created;
DROP INDEX IF EXISTS idx_web_nginx_config_tenant_updated;
DROP INDEX IF EXISTS uk_web_site_slug;
CREATE UNIQUE INDEX uk_web_site_slug
    ON web_site (tenant_id, slug);

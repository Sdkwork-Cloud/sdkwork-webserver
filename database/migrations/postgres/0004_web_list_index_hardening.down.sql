-- sdkwork:migration
-- version: 0004
-- engine: postgres
-- module: web
-- description: Revert list-query index hardening.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: access-exclusive
-- lock_timeout: 30s
-- statement_timeout: 120s

DROP INDEX IF EXISTS idx_web_listener_certificate_binding_site_sort;
DROP INDEX IF EXISTS idx_web_server_tenant_updated;
DROP INDEX IF EXISTS idx_web_source_version_tenant_site_created;
DROP INDEX IF EXISTS idx_web_deployment_tenant_site_created;

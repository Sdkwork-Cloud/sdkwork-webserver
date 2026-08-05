-- sdkwork:migration
-- version: 0004
-- engine: postgres
-- module: web
-- description: List-query index hardening: tenant-prefixed site-ordered deployment and
--   source-version indexes, a tenant/updated server index for keyset listing without a
--   status filter, and a listener-certificate-binding sort index matching the
--   is_default/priority/id listing contract. Expand-only; existing indexes are kept.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: access-exclusive
-- lock_timeout: 30s
-- statement_timeout: 120s

-- Deployment listing filters by tenant then site and sorts by created_at DESC:
-- a tenant prefix makes the index directly usable for the (tenant, site) predicate
-- (PAGINATION_SPEC/DATABASE_SPEC §20.5).
CREATE INDEX IF NOT EXISTS idx_web_deployment_tenant_site_created
    ON web_deployment (tenant_id, site_id, created_at DESC);

-- Source-version listing filters by tenant then site and sorts by created_at DESC.
CREATE INDEX IF NOT EXISTS idx_web_source_version_tenant_site_created
    ON web_source_version (tenant_id, site_id, created_at DESC);

-- Web Node keyset listing orders by (updated_at DESC, id DESC) without a status
-- predicate; the existing (tenant_id, status, updated_at) index cannot serve the
-- prefix. A dedicated (tenant_id, updated_at DESC) index covers the keyset seek.
CREATE INDEX IF NOT EXISTS idx_web_server_tenant_updated
    ON web_server (tenant_id, updated_at DESC);

-- Listener certificate binding listing orders by (is_default DESC, priority ASC, id ASC)
-- per site binding; the existing unique indexes do not cover that ordering.
CREATE INDEX IF NOT EXISTS idx_web_listener_certificate_binding_site_sort
    ON web_listener_certificate_binding (site_binding_id, is_default, priority, id)
    WHERE deleted_at IS NULL;

-- SDKWork Web Server PostgreSQL authoritative baseline.
-- Contract authority: database/contract/schema.yaml

-- source: migrations/001_create_web_site.sql
-- Migration: 001_create_web_site
-- Description: Web site registry table
-- Author: SDKWork Web Server
-- Date: 2026-06-14

CREATE TABLE web_site (
    id              BIGINT       NOT NULL,
    uuid            VARCHAR(64)  NOT NULL,
    tenant_id       BIGINT       NOT NULL DEFAULT 0,
    organization_id BIGINT       NOT NULL DEFAULT 0,
    data_scope      INTEGER      NOT NULL DEFAULT 1,
    user_id         BIGINT,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    description     VARCHAR(500),
    application_type VARCHAR(16) NOT NULL DEFAULT 'WEB',
    site_type       INTEGER      NOT NULL DEFAULT 1,
    status          INTEGER      NOT NULL DEFAULT 0,
    runtime_config  JSONB        NOT NULL DEFAULT '{}',
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    deleted_at      TIMESTAMPTZ,
    deleted_by      BIGINT,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_site_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_site_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT uk_web_site_slug UNIQUE (tenant_id, slug),
    CONSTRAINT chk_web_site_application_type CHECK (application_type IN ('WEB', 'API')),
    CONSTRAINT chk_web_site_type CHECK (site_type BETWEEN 1 AND 6),
    CONSTRAINT chk_web_site_status CHECK (status BETWEEN 0 AND 3)
);

COMMENT ON TABLE web_site IS 'Web site registry';
COMMENT ON COLUMN web_site.id IS 'Snowflake primary key';
COMMENT ON COLUMN web_site.uuid IS 'Globally unique identifier';
COMMENT ON COLUMN web_site.tenant_id IS 'Tenant ID; 0 = platform-shared data per contract';
COMMENT ON COLUMN web_site.organization_id IS 'Organization ID; 0 = tenant-level data';
COMMENT ON COLUMN web_site.data_scope IS 'Data scope: 1=tenant, 2=organization, 3=user, 4=platform';
COMMENT ON COLUMN web_site.user_id IS 'Owning user ID (nullable)';
COMMENT ON COLUMN web_site.name IS 'Site display name';
COMMENT ON COLUMN web_site.slug IS 'URL-friendly unique slug within tenant';
COMMENT ON COLUMN web_site.application_type IS 'Application traffic category: WEB or API';
COMMENT ON COLUMN web_site.site_type IS 'Site type: 1=static, 2=SPA, 3=Node, 4=PHP, 5=Python, 6=other';
COMMENT ON COLUMN web_site.status IS 'Status: 0=draft, 1=active, 2=paused, 3=archived';
COMMENT ON COLUMN web_site.runtime_config IS 'Runtime configuration JSON';
COMMENT ON COLUMN web_site.version IS 'Optimistic concurrency version';

CREATE INDEX idx_web_site_tenant_status_updated
    ON web_site (tenant_id, organization_id, status, updated_at DESC);

CREATE INDEX idx_web_site_tenant_application_type_updated
    ON web_site (tenant_id, application_type, updated_at DESC);

CREATE INDEX idx_web_site_user_updated
    ON web_site (tenant_id, user_id, updated_at DESC);

CREATE INDEX idx_web_site_slug
    ON web_site (tenant_id, slug);

CREATE TABLE web_root_domain (
    id              BIGINT       NOT NULL,
    uuid            VARCHAR(64)  NOT NULL,
    tenant_id       BIGINT       NOT NULL DEFAULT 0,
    organization_id BIGINT       NOT NULL DEFAULT 0,
    hostname        VARCHAR(253) NOT NULL,
    display_name    VARCHAR(200),
    dns_provider    VARCHAR(64),
    provider_zone_ref VARCHAR(512),
    status          INTEGER      NOT NULL DEFAULT 1,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    deleted_at      TIMESTAMPTZ,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_root_domain_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_root_domain_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT chk_web_root_domain_status CHECK (status BETWEEN 0 AND 2)
);

COMMENT ON TABLE web_root_domain IS 'Tenant-owned root-domain Zone';
COMMENT ON COLUMN web_root_domain.hostname IS 'Explicit normalized root domain';
COMMENT ON COLUMN web_root_domain.status IS 'Status: 0=pending, 1=active, 2=disabled';

CREATE UNIQUE INDEX uk_web_root_domain_active_hostname
    ON web_root_domain (hostname)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_web_root_domain_tenant_updated
    ON web_root_domain (tenant_id, updated_at DESC, id DESC);

CREATE TABLE web_domain (
    id              BIGINT       NOT NULL,
    uuid            VARCHAR(64)  NOT NULL,
    tenant_id       BIGINT       NOT NULL DEFAULT 0,
    organization_id BIGINT       NOT NULL DEFAULT 0,
    user_id         BIGINT,
    root_domain_id  BIGINT       NOT NULL,
    hostname        VARCHAR(255) NOT NULL,
    hostname_type   VARCHAR(16)  NOT NULL DEFAULT 'EXACT',
    verification_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    verified_at     TIMESTAMPTZ,
    status          INTEGER      NOT NULL DEFAULT 0,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    deleted_at      TIMESTAMPTZ,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_domain_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_domain_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT fk_web_domain_root_domain FOREIGN KEY (tenant_id, root_domain_id)
        REFERENCES web_root_domain(tenant_id, id),
    CONSTRAINT chk_web_domain_hostname_type CHECK (hostname_type IN ('EXACT', 'WILDCARD')),
    CONSTRAINT chk_web_domain_verification_status CHECK (
        verification_status IN ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED')
    ),
    CONSTRAINT chk_web_domain_verified_at CHECK (
        (verification_status = 'VERIFIED' AND verified_at IS NOT NULL)
        OR (verification_status <> 'VERIFIED' AND verified_at IS NULL)
    ),
    CONSTRAINT chk_web_domain_status CHECK (status BETWEEN 0 AND 2)
);

COMMENT ON TABLE web_domain IS 'Root-domain owned hostname asset independent of application routing and TLS';
COMMENT ON COLUMN web_domain.hostname IS 'Normalized lowercase ASCII hostname';
COMMENT ON COLUMN web_domain.status IS 'Status: 0=pending, 1=active, 2=disabled';

CREATE UNIQUE INDEX uk_web_domain_active_hostname
    ON web_domain (hostname)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_web_domain_tenant_status
    ON web_domain (tenant_id, status, updated_at DESC, id DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_web_domain_root_updated
    ON web_domain (tenant_id, root_domain_id, updated_at DESC, id DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_web_domain_user_updated
    ON web_domain (tenant_id, user_id, updated_at DESC, id DESC)
    WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE web_domain_verification (
    id                BIGINT       NOT NULL,
    uuid              VARCHAR(64)  NOT NULL,
    tenant_id         BIGINT       NOT NULL,
    domain_id         BIGINT       NOT NULL,
    method            VARCHAR(16)  NOT NULL,
    record_name       VARCHAR(253) NOT NULL,
    proof_sha256      VARCHAR(64)  NOT NULL,
    status            VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    observed_sha256   VARCHAR(64),
    attempt_count     INTEGER      NOT NULL DEFAULT 0,
    next_attempt_at   TIMESTAMPTZ,
    expires_at        TIMESTAMPTZ  NOT NULL,
    checked_at        TIMESTAMPTZ,
    verified_at       TIMESTAMPTZ,
    failure_code      VARCHAR(64),
    created_at        TIMESTAMPTZ  NOT NULL,
    updated_at        TIMESTAMPTZ  NOT NULL,
    version           BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_domain_verification_uuid UNIQUE (uuid),
    CONSTRAINT fk_web_domain_verification_domain FOREIGN KEY (tenant_id, domain_id)
        REFERENCES web_domain(tenant_id, id),
    CONSTRAINT chk_web_domain_verification_method CHECK (method IN ('DNS_TXT', 'DNS_CNAME', 'HTTP_FILE')),
    CONSTRAINT chk_web_domain_verification_status CHECK (status IN ('PENDING', 'CHECKING', 'VERIFIED', 'FAILED', 'EXPIRED')),
    CONSTRAINT chk_web_domain_verification_hash CHECK (
        proof_sha256 ~ '^[0-9a-f]{64}$'
        AND (observed_sha256 IS NULL OR observed_sha256 ~ '^[0-9a-f]{64}$')
    ),
    CONSTRAINT chk_web_domain_verification_attempts CHECK (attempt_count BETWEEN 0 AND 1000)
);

CREATE UNIQUE INDEX uk_web_domain_verification_active
    ON web_domain_verification (domain_id)
    WHERE status IN ('PENDING', 'CHECKING');

CREATE INDEX idx_web_domain_verification_due
    ON web_domain_verification (status, next_attempt_at, expires_at, id)
    WHERE status IN ('PENDING', 'CHECKING');

CREATE TABLE web_site_binding (
    id                BIGINT        NOT NULL,
    uuid              VARCHAR(64)   NOT NULL,
    tenant_id         BIGINT        NOT NULL,
    organization_id   BIGINT        NOT NULL DEFAULT 0,
    site_id           BIGINT        NOT NULL,
    domain_id         BIGINT        NOT NULL,
    environment       VARCHAR(16)   NOT NULL DEFAULT 'production',
    path_prefix       VARCHAR(4096) NOT NULL DEFAULT '/',
    action_type       VARCHAR(16)   NOT NULL DEFAULT 'SERVE',
    is_primary        BOOLEAN       NOT NULL DEFAULT false,
    redirect_scheme   VARCHAR(8),
    redirect_hostname VARCHAR(253),
    redirect_path_prefix VARCHAR(4096),
    redirect_status_code INTEGER,
    preserve_path     BOOLEAN       NOT NULL DEFAULT true,
    preserve_query    BOOLEAN       NOT NULL DEFAULT true,
    status            VARCHAR(16)   NOT NULL DEFAULT 'PENDING',
    activated_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ   NOT NULL,
    updated_at        TIMESTAMPTZ   NOT NULL,
    version           BIGINT        NOT NULL DEFAULT 0,
    deleted_at        TIMESTAMPTZ,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_site_binding_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_site_binding_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT fk_web_site_binding_site FOREIGN KEY (tenant_id, site_id)
        REFERENCES web_site(tenant_id, id),
    CONSTRAINT fk_web_site_binding_domain FOREIGN KEY (tenant_id, domain_id)
        REFERENCES web_domain(tenant_id, id),
    CONSTRAINT chk_web_site_binding_environment CHECK (environment IN ('development', 'test', 'staging', 'production')),
    CONSTRAINT chk_web_site_binding_action CHECK (action_type IN ('SERVE', 'REDIRECT')),
    CONSTRAINT chk_web_site_binding_status CHECK (status IN ('PENDING', 'ACTIVE', 'PAUSED', 'FAILED', 'ARCHIVED')),
    CONSTRAINT chk_web_site_binding_redirect_status CHECK (redirect_status_code IS NULL OR redirect_status_code IN (301, 302, 307, 308)),
    CONSTRAINT chk_web_site_binding_redirect CHECK (
        (action_type = 'SERVE' AND redirect_scheme IS NULL AND redirect_hostname IS NULL AND redirect_path_prefix IS NULL AND redirect_status_code IS NULL)
        OR (action_type = 'REDIRECT' AND redirect_status_code IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uk_web_site_binding_active_route
    ON web_site_binding (domain_id, environment, path_prefix)
    WHERE status IN ('PENDING', 'ACTIVE', 'PAUSED') AND deleted_at IS NULL;

CREATE UNIQUE INDEX uk_web_site_binding_primary
    ON web_site_binding (site_id, environment)
    WHERE is_primary = true AND status = 'ACTIVE' AND deleted_at IS NULL;

CREATE INDEX idx_web_site_binding_site_status
    ON web_site_binding (tenant_id, site_id, environment, status, updated_at DESC, id DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_web_site_binding_domain_status
    ON web_site_binding (tenant_id, domain_id, environment, status, updated_at DESC, id DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE web_tls_policy (
    id                  BIGINT       NOT NULL,
    uuid                VARCHAR(64)  NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    site_binding_id     BIGINT       NOT NULL,
    certificate_source  VARCHAR(16)  NOT NULL DEFAULT 'MANAGED',
    challenge_method    VARCHAR(16)  NOT NULL DEFAULT 'AUTO',
    minimum_tls_version VARCHAR(8)   NOT NULL DEFAULT 'TLS1.2',
    maximum_tls_version VARCHAR(8)   NOT NULL DEFAULT 'TLS1.3',
    alpn_json           JSONB        NOT NULL DEFAULT '["h2","http/1.1"]',
    auto_renew          BOOLEAN      NOT NULL DEFAULT true,
    renew_before_days   INTEGER      NOT NULL DEFAULT 30,
    status              VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMPTZ  NOT NULL,
    updated_at          TIMESTAMPTZ  NOT NULL,
    version             BIGINT       NOT NULL DEFAULT 0,
    deleted_at          TIMESTAMPTZ,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_tls_policy_uuid UNIQUE (uuid),
    CONSTRAINT fk_web_tls_policy_binding FOREIGN KEY (tenant_id, site_binding_id)
        REFERENCES web_site_binding(tenant_id, id),
    CONSTRAINT chk_web_tls_policy_source CHECK (certificate_source IN ('MANAGED', 'CUSTOM', 'EXTERNAL')),
    CONSTRAINT chk_web_tls_policy_challenge CHECK (challenge_method IN ('AUTO', 'HTTP_01', 'DNS_01')),
    CONSTRAINT chk_web_tls_policy_versions CHECK (
        minimum_tls_version IN ('TLS1.2', 'TLS1.3')
        AND maximum_tls_version IN ('TLS1.2', 'TLS1.3')
        AND minimum_tls_version <= maximum_tls_version
    ),
    CONSTRAINT chk_web_tls_policy_renewal CHECK (renew_before_days BETWEEN 14 AND 90),
    CONSTRAINT chk_web_tls_policy_status CHECK (status IN ('ACTIVE', 'PAUSED', 'ARCHIVED'))
);

CREATE UNIQUE INDEX uk_web_tls_policy_active_binding
    ON web_tls_policy (site_binding_id)
    WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- source: migrations/003_create_web_nginx_config.sql
-- Migration: 003_create_web_nginx_config
-- Description: Nginx configuration artifact table
-- Author: SDKWork Web Server
-- Date: 2026-06-14

CREATE TABLE web_nginx_config (
    id              BIGINT       NOT NULL,
    uuid            VARCHAR(64)  NOT NULL,
    tenant_id       BIGINT       NOT NULL DEFAULT 0,
    site_id         BIGINT       NOT NULL,
    domain_id       BIGINT,
    config_type     INTEGER      NOT NULL DEFAULT 1,
    config_name     VARCHAR(200) NOT NULL,
    config_content  TEXT         NOT NULL,
    config_hash     VARCHAR(64)  NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT false,
    version_no      INTEGER      NOT NULL DEFAULT 1,
    deployed_at     TIMESTAMPTZ,
    status          INTEGER      NOT NULL DEFAULT 0,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_nginx_config_uuid UNIQUE (uuid),
    CONSTRAINT fk_web_nginx_config_site FOREIGN KEY (site_id) REFERENCES web_site(id)
);

COMMENT ON TABLE web_nginx_config IS 'Nginx configuration artifact';
COMMENT ON COLUMN web_nginx_config.config_type IS 'Config type: 1=server, 2=location, 3=ssl, 4=upstream';
COMMENT ON COLUMN web_nginx_config.config_content IS 'Nginx configuration content';
COMMENT ON COLUMN web_nginx_config.config_hash IS 'Content SHA-256 hash';
COMMENT ON COLUMN web_nginx_config.is_active IS 'Whether this is the currently active config';
COMMENT ON COLUMN web_nginx_config.version_no IS 'Config revision number';
COMMENT ON COLUMN web_nginx_config.deployed_at IS 'Deployed at timestamp';
COMMENT ON COLUMN web_nginx_config.status IS 'Status: 0=draft, 1=active, 2=deploying, 3=failed';

CREATE INDEX idx_web_nginx_config_site_active
    ON web_nginx_config (site_id, is_active);

CREATE INDEX idx_web_nginx_config_type_status
    ON web_nginx_config (config_type, status);

CREATE TABLE web_certificate (
    id                      BIGINT       NOT NULL,
    uuid                    VARCHAR(64)  NOT NULL,
    tenant_id               BIGINT       NOT NULL,
    organization_id         BIGINT       NOT NULL DEFAULT 0,
    user_id                 BIGINT,
    cert_name               VARCHAR(200) NOT NULL,
    cert_type               INTEGER      NOT NULL DEFAULT 1,
    ca_profile              VARCHAR(32)  NOT NULL DEFAULT 'LETS_ENCRYPT_PRODUCTION',
    preferred_key_algorithm VARCHAR(16)  NOT NULL DEFAULT 'ECDSA',
    auto_renew              BOOLEAN      NOT NULL DEFAULT true,
    renewal_status          INTEGER      NOT NULL DEFAULT 0,
    status                  INTEGER      NOT NULL DEFAULT 0,
    current_version_id      BIGINT,
    metadata                JSONB        NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ  NOT NULL,
    updated_at              TIMESTAMPTZ  NOT NULL,
    version                 BIGINT       NOT NULL DEFAULT 0,
    deleted_at              TIMESTAMPTZ,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_certificate_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_certificate_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT chk_web_certificate_type CHECK (cert_type IN (1, 2, 3)),
    CONSTRAINT chk_web_certificate_ca_profile CHECK (ca_profile IN ('LETS_ENCRYPT_STAGING', 'LETS_ENCRYPT_PRODUCTION', 'CUSTOM', 'SELF_SIGNED')),
    CONSTRAINT chk_web_certificate_key_algorithm CHECK (preferred_key_algorithm IN ('RSA', 'ECDSA')),
    CONSTRAINT chk_web_certificate_renewal_status CHECK (renewal_status BETWEEN 0 AND 3),
    CONSTRAINT chk_web_certificate_status CHECK (status BETWEEN 0 AND 4)
);

COMMENT ON TABLE web_certificate IS 'TLS certificate lifecycle aggregate without private material';
COMMENT ON COLUMN web_certificate.cert_type IS 'Cert type: 1=Lets Encrypt, 2=custom, 3=self-signed';
COMMENT ON COLUMN web_certificate.auto_renew IS 'Whether auto-renewal is enabled';
COMMENT ON COLUMN web_certificate.renewal_status IS 'Renewal status: 0=idle, 1=renewing, 2=pending, 3=failed';
COMMENT ON COLUMN web_certificate.status IS 'Asset status: 0=pending, 1=issued, 2=expired, 3=revoked, 4=archived';

CREATE INDEX idx_web_certificate_renewal
    ON web_certificate (tenant_id, renewal_status, updated_at, id)
    WHERE auto_renew = true AND status IN (1, 2) AND deleted_at IS NULL;

CREATE INDEX idx_web_certificate_tenant_updated
    ON web_certificate (tenant_id, updated_at DESC, id DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_web_certificate_user_updated
    ON web_certificate (tenant_id, user_id, updated_at DESC, id DESC)
    WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE web_certificate_identifier (
    id              BIGINT       NOT NULL,
    uuid            VARCHAR(64)  NOT NULL,
    tenant_id       BIGINT       NOT NULL,
    certificate_id  BIGINT       NOT NULL,
    domain_id       BIGINT       NOT NULL,
    identifier_type VARCHAR(16)  NOT NULL,
    hostname        VARCHAR(253) NOT NULL,
    position        INTEGER      NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_certificate_identifier_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_certificate_identifier_name UNIQUE (certificate_id, hostname),
    CONSTRAINT uk_web_certificate_identifier_position UNIQUE (certificate_id, position),
    CONSTRAINT fk_web_certificate_identifier_certificate FOREIGN KEY (tenant_id, certificate_id)
        REFERENCES web_certificate(tenant_id, id),
    CONSTRAINT fk_web_certificate_identifier_domain FOREIGN KEY (tenant_id, domain_id)
        REFERENCES web_domain(tenant_id, id),
    CONSTRAINT chk_web_certificate_identifier_type CHECK (identifier_type IN ('EXACT', 'WILDCARD')),
    CONSTRAINT chk_web_certificate_identifier_position CHECK (position BETWEEN 0 AND 7)
);

CREATE INDEX idx_web_certificate_identifier_domain
    ON web_certificate_identifier (tenant_id, domain_id, certificate_id);

CREATE TABLE web_certificate_version (
    id                 BIGINT        NOT NULL,
    uuid               VARCHAR(64)   NOT NULL,
    tenant_id          BIGINT        NOT NULL,
    certificate_id     BIGINT        NOT NULL,
    version_no         BIGINT        NOT NULL,
    serial_sha256      VARCHAR(64)   NOT NULL,
    fingerprint_sha256 VARCHAR(64)   NOT NULL,
    spki_sha256        VARCHAR(64)   NOT NULL,
    chain_sha256       VARCHAR(64)   NOT NULL,
    issuer             VARCHAR(500)  NOT NULL,
    subject            VARCHAR(500)  NOT NULL,
    key_algorithm      VARCHAR(16)   NOT NULL,
    not_before         TIMESTAMPTZ   NOT NULL,
    not_after          TIMESTAMPTZ   NOT NULL,
    secret_bundle_ref  VARCHAR(64)   NOT NULL,
    status             VARCHAR(16)   NOT NULL DEFAULT 'ACTIVE',
    created_at         TIMESTAMPTZ   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_certificate_version_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_certificate_version_id UNIQUE (certificate_id, id),
    CONSTRAINT uk_web_certificate_version_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT uk_web_certificate_version_no UNIQUE (certificate_id, version_no),
    CONSTRAINT uk_web_certificate_version_fingerprint UNIQUE (tenant_id, fingerprint_sha256),
    CONSTRAINT fk_web_certificate_version_certificate FOREIGN KEY (tenant_id, certificate_id)
        REFERENCES web_certificate(tenant_id, id),
    CONSTRAINT chk_web_certificate_version_key_algorithm CHECK (key_algorithm IN ('RSA', 'ECDSA')),
    CONSTRAINT chk_web_certificate_version_status CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'REVOKED', 'EXPIRED')),
    CONSTRAINT chk_web_certificate_version_validity CHECK (not_after > not_before),
    CONSTRAINT chk_web_certificate_version_hashes CHECK (
        serial_sha256 ~ '^[0-9a-f]{64}$'
        AND fingerprint_sha256 ~ '^[0-9a-f]{64}$'
        AND spki_sha256 ~ '^[0-9a-f]{64}$'
        AND chain_sha256 ~ '^[0-9a-f]{64}$'
    ),
    CONSTRAINT chk_web_certificate_version_secret_ref CHECK (
        secret_bundle_ref ~ '^secret:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
);

CREATE INDEX idx_web_certificate_version_lifecycle
    ON web_certificate_version (tenant_id, status, not_after, id);

CREATE TABLE web_certificate_secret_bundle (
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

ALTER TABLE web_certificate
    ADD CONSTRAINT fk_web_certificate_current_version
        FOREIGN KEY (id, current_version_id) REFERENCES web_certificate_version(certificate_id, id);

CREATE TABLE web_listener_certificate_binding (
    id                     BIGINT      NOT NULL,
    uuid                   VARCHAR(64) NOT NULL,
    tenant_id              BIGINT      NOT NULL,
    site_binding_id        BIGINT      NOT NULL,
    certificate_id         BIGINT      NOT NULL,
    desired_version_id     BIGINT      NOT NULL,
    current_version_id     BIGINT,
    key_algorithm          VARCHAR(16) NOT NULL,
    priority               INTEGER     NOT NULL DEFAULT 100,
    is_default             BOOLEAN     NOT NULL DEFAULT false,
    status                 VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    activated_at           TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL,
    updated_at             TIMESTAMPTZ NOT NULL,
    version                BIGINT      NOT NULL DEFAULT 0,
    deleted_at             TIMESTAMPTZ,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_listener_certificate_binding_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_listener_certificate_binding_certificate UNIQUE (site_binding_id, certificate_id),
    CONSTRAINT fk_web_listener_certificate_binding_route FOREIGN KEY (tenant_id, site_binding_id)
        REFERENCES web_site_binding(tenant_id, id),
    CONSTRAINT fk_web_listener_certificate_binding_certificate FOREIGN KEY (tenant_id, certificate_id)
        REFERENCES web_certificate(tenant_id, id),
    CONSTRAINT fk_web_listener_certificate_binding_desired_version FOREIGN KEY (certificate_id, desired_version_id)
        REFERENCES web_certificate_version(certificate_id, id),
    CONSTRAINT fk_web_listener_certificate_binding_current_version FOREIGN KEY (certificate_id, current_version_id)
        REFERENCES web_certificate_version(certificate_id, id),
    CONSTRAINT chk_web_listener_certificate_binding_algorithm CHECK (key_algorithm IN ('RSA', 'ECDSA')),
    CONSTRAINT chk_web_listener_certificate_binding_priority CHECK (priority BETWEEN 0 AND 10000),
    CONSTRAINT chk_web_listener_certificate_binding_status CHECK (status IN ('PENDING', 'DEPLOYING', 'ACTIVE', 'PAUSED', 'FAILED', 'ARCHIVED')),
    CONSTRAINT chk_web_listener_certificate_binding_active_version CHECK (
        status <> 'ACTIVE'
        OR (
            current_version_id = desired_version_id
            AND activated_at IS NOT NULL
        )
    )
);

CREATE UNIQUE INDEX uk_web_listener_certificate_binding_active_algorithm
    ON web_listener_certificate_binding (site_binding_id, key_algorithm)
    WHERE status <> 'ARCHIVED' AND deleted_at IS NULL;

CREATE UNIQUE INDEX uk_web_listener_certificate_binding_default
    ON web_listener_certificate_binding (site_binding_id)
    WHERE is_default = true AND status <> 'ARCHIVED' AND deleted_at IS NULL;

CREATE INDEX idx_web_listener_certificate_binding_certificate
    ON web_listener_certificate_binding (tenant_id, certificate_id, status)
    WHERE deleted_at IS NULL;

CREATE TABLE web_source_version (
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

CREATE INDEX idx_web_source_version_site_created
    ON web_source_version (site_id, created_at DESC);

CREATE INDEX idx_web_source_version_retention
    ON web_source_version (tenant_id, site_id, status, created_at DESC);

-- source: migrations/005_create_web_deployment.sql
-- Migration: 005_create_web_deployment
-- Description: Web deployment record table
-- Author: SDKWork Web Server
-- Date: 2026-06-14

CREATE TABLE web_deployment (
    id              BIGINT       NOT NULL,
    uuid            VARCHAR(64)  NOT NULL,
    tenant_id       BIGINT       NOT NULL DEFAULT 0,
    organization_id BIGINT       NOT NULL DEFAULT 0,
    user_id         BIGINT,
    site_id         BIGINT       NOT NULL,
    source_version_id BIGINT,
    deploy_type     INTEGER      NOT NULL DEFAULT 1,
    version_tag     VARCHAR(100),
    commit_hash     VARCHAR(64),
    source_ref      VARCHAR(500),
    build_log       TEXT,
    deploy_log      TEXT,
    artifact_path   VARCHAR(500),
    artifact_size   BIGINT,
    artifact_hash   VARCHAR(64),
    environment     VARCHAR(32)  NOT NULL DEFAULT 'production',
    status          INTEGER      NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     BIGINT,
    rollback_from   BIGINT,
    idempotency_key VARCHAR(200),
    request_id      VARCHAR(128),
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_deployment_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_deployment_idempotency UNIQUE (tenant_id, idempotency_key),
    CONSTRAINT fk_web_deployment_site FOREIGN KEY (site_id) REFERENCES web_site(id),
    CONSTRAINT fk_web_deployment_source_version FOREIGN KEY (source_version_id) REFERENCES web_source_version(id)
);

COMMENT ON TABLE web_deployment IS 'Web deployment record';
COMMENT ON COLUMN web_deployment.deploy_type IS 'Deploy type: 1=manual, 2=git, 3=ci-cd, 4=api';
COMMENT ON COLUMN web_deployment.status IS 'Status: 0=pending, 1=deploying, 2=success, 3=failed, 4=rolled-back, 5=rolled-back-source, 6=cancelled';
COMMENT ON COLUMN web_deployment.duration_ms IS 'Deployment duration in milliseconds';
COMMENT ON COLUMN web_deployment.rollback_from IS 'Source deployment ID for rollback';
COMMENT ON COLUMN web_deployment.idempotency_key IS 'Client-provided idempotency key';

CREATE INDEX idx_web_deployment_site_created
    ON web_deployment (site_id, created_at DESC);

CREATE INDEX idx_web_deployment_source_version
    ON web_deployment (source_version_id);

CREATE INDEX idx_web_deployment_tenant_status
    ON web_deployment (tenant_id, status, created_at DESC);

CREATE INDEX idx_web_deployment_status
    ON web_deployment (status)
    WHERE status IN (0, 1, 2);

-- source: migrations/006_create_web_env_variable.sql
-- Migration: 006_create_web_env_variable
-- Description: Web environment variable table
-- Author: SDKWork Web Server
-- Date: 2026-06-14

CREATE TABLE web_env_variable (
    id              BIGINT       NOT NULL,
    uuid            VARCHAR(64)  NOT NULL,
    tenant_id       BIGINT       NOT NULL DEFAULT 0,
    site_id         BIGINT       NOT NULL,
    environment     VARCHAR(32)  NOT NULL DEFAULT 'production',
    key             VARCHAR(200) NOT NULL,
    value_encrypted TEXT         NOT NULL,
    is_secret       BOOLEAN      NOT NULL DEFAULT true,
    status          INTEGER      NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_env_variable_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_env_variable_key UNIQUE (site_id, environment, key)
);

COMMENT ON TABLE web_env_variable IS 'Web environment variable';
COMMENT ON COLUMN web_env_variable.key IS 'Variable key name';
COMMENT ON COLUMN web_env_variable.value_encrypted IS 'AES-256-GCM encrypted value (base64)';
COMMENT ON COLUMN web_env_variable.is_secret IS 'Whether the value is a secret';
COMMENT ON COLUMN web_env_variable.environment IS 'Environment name';

CREATE INDEX idx_web_env_variable_site_env
    ON web_env_variable (site_id, environment);

-- source: migrations/007_create_web_health_check.sql
-- Migration: 007_create_web_health_check
-- Description: Web health check configuration table
-- Author: SDKWork Web Server
-- Date: 2026-06-14

CREATE TABLE web_health_check (
    id              BIGINT       NOT NULL,
    uuid            VARCHAR(64)  NOT NULL,
    tenant_id       BIGINT       NOT NULL DEFAULT 0,
    site_id         BIGINT       NOT NULL,
    domain_id       BIGINT,
    check_type      INTEGER      NOT NULL DEFAULT 1,
    check_url       VARCHAR(2000),
    check_interval  INTEGER      NOT NULL DEFAULT 60,
    timeout_ms      INTEGER      NOT NULL DEFAULT 5000,
    retry_count     INTEGER      NOT NULL DEFAULT 3,
    expected_status INTEGER,
    expected_body   VARCHAR(500),
    status          INTEGER      NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_health_check_uuid UNIQUE (uuid),
    CONSTRAINT fk_web_health_check_site FOREIGN KEY (site_id) REFERENCES web_site(id)
);

COMMENT ON TABLE web_health_check IS 'Web health check configuration';
COMMENT ON COLUMN web_health_check.check_type IS 'Check type: 1=HTTP, 2=TCP, 3=Ping';
COMMENT ON COLUMN web_health_check.check_interval IS 'Check interval in seconds';
COMMENT ON COLUMN web_health_check.timeout_ms IS 'Check timeout in milliseconds';
COMMENT ON COLUMN web_health_check.retry_count IS 'Retry count on failure';

CREATE INDEX idx_web_health_check_site
    ON web_health_check (site_id);

-- source: migrations/008_create_web_health_result.sql
-- Migration: 008_create_web_health_result
-- Description: Web health check result table
-- Author: SDKWork Web Server
-- Date: 2026-06-14

CREATE TABLE web_health_result (
    id              BIGINT       NOT NULL,
    uuid            VARCHAR(64)  NOT NULL,
    tenant_id       BIGINT       NOT NULL DEFAULT 0,
    health_check_id BIGINT       NOT NULL,
    site_id         BIGINT       NOT NULL,
    is_healthy      BOOLEAN      NOT NULL,
    response_ms     INTEGER,
    status_code     INTEGER,
    error_message   VARCHAR(1000),
    checked_at      TIMESTAMPTZ  NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (id)
);

COMMENT ON TABLE web_health_result IS 'Web health check result';
COMMENT ON COLUMN web_health_result.is_healthy IS 'Whether the check was healthy';
COMMENT ON COLUMN web_health_result.response_ms IS 'Response time in milliseconds';
COMMENT ON COLUMN web_health_result.status_code IS 'HTTP status code';
COMMENT ON COLUMN web_health_result.checked_at IS 'Check execution timestamp';

CREATE INDEX idx_web_health_result_check_time
    ON web_health_result (health_check_id, checked_at DESC);

CREATE INDEX idx_web_health_result_site_time
    ON web_health_result (site_id, checked_at DESC);

-- source: migrations/009_create_web_audit_log.sql
-- Migration: 009_create_web_audit_log
-- Description: Web audit log table
-- Author: SDKWork Web Server
-- Date: 2026-06-14

CREATE TABLE web_audit_log (
    id              BIGINT       NOT NULL,
    uuid            VARCHAR(64)  NOT NULL,
    tenant_id       BIGINT       NOT NULL DEFAULT 0,
    organization_id BIGINT       NOT NULL DEFAULT 0,
    operator_id     BIGINT       NOT NULL,
    operator_type   VARCHAR(32)  NOT NULL DEFAULT 'USER',
    action          VARCHAR(100) NOT NULL,
    target_type     VARCHAR(100) NOT NULL,
    target_id       BIGINT,
    target_uuid     VARCHAR(64),
    request_id      VARCHAR(128),
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    changes         JSONB,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (id)
);

COMMENT ON TABLE web_audit_log IS 'Web audit log';
COMMENT ON COLUMN web_audit_log.operator_id IS 'Operator ID';
COMMENT ON COLUMN web_audit_log.operator_type IS 'Operator type: USER, SYSTEM, ADMIN, JOB, SERVICE';
COMMENT ON COLUMN web_audit_log.action IS 'Action name';
COMMENT ON COLUMN web_audit_log.target_type IS 'Target resource type';
COMMENT ON COLUMN web_audit_log.target_id IS 'Target resource ID';
COMMENT ON COLUMN web_audit_log.changes IS 'Field changes JSON: {"field": {"old": x, "new": y}}';

CREATE INDEX idx_web_audit_log_target
    ON web_audit_log (target_type, target_id, created_at DESC);

CREATE INDEX idx_web_audit_log_operator
    ON web_audit_log (operator_id, created_at DESC);

CREATE INDEX idx_web_audit_log_tenant_action
    ON web_audit_log (tenant_id, action, created_at DESC);

-- source: migrations/010_create_web_server.sql
-- Migration: 010_create_web_server
-- Description: Web edge server registry table
-- Author: SDKWork Web Server
-- Date: 2026-06-23

CREATE TABLE web_server (
    id              BIGINT       NOT NULL,
    uuid            VARCHAR(64)  NOT NULL,
    tenant_id       BIGINT       NOT NULL DEFAULT 0,
    name            VARCHAR(200) NOT NULL,
    host            VARCHAR(255) NOT NULL,
    tenant_scope_hash VARCHAR(64) NOT NULL,
    ssh_port        INTEGER      NOT NULL DEFAULT 22,
    status          INTEGER      NOT NULL DEFAULT 0,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_web_server_uuid UNIQUE (uuid),
    CONSTRAINT uk_web_server_host UNIQUE (tenant_id, host),
    CONSTRAINT uk_web_server_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT chk_web_server_tenant_scope_hash
        CHECK (tenant_scope_hash ~ '^[0-9a-f]{64}$')
);

COMMENT ON TABLE web_server IS 'Web edge server registry';
COMMENT ON COLUMN web_server.status IS 'Status: 0=offline, 1=online, 2=deploying, 3=error, 4=maintenance';

CREATE INDEX idx_web_server_tenant_status
    ON web_server (tenant_id, status, updated_at DESC);

CREATE TABLE web_certificate_node_state (
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

CREATE INDEX idx_web_certificate_node_state_version
    ON web_certificate_node_state (tenant_id, certificate_version_id, state, server_id);

CREATE INDEX idx_web_certificate_node_state_server
    ON web_certificate_node_state (tenant_id, server_id, state, observed_at DESC);

CREATE TABLE web_runtime_assignment (
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

CREATE INDEX idx_web_runtime_assignment_current
    ON web_runtime_assignment (tenant_id, server_id, environment, generation DESC);

CREATE TABLE web_runtime_observation (
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

CREATE INDEX idx_web_runtime_observation_assignment
    ON web_runtime_observation (tenant_id, assignment_id, id DESC);

CREATE INDEX idx_web_runtime_observation_node_time
    ON web_runtime_observation (tenant_id, server_id, observed_at DESC);

pub const PREFIX: &str = "/app/v3/api";

pub const SITES: &str = "/app/v3/api/sites";
pub const SITE: &str = "/app/v3/api/sites/{siteId}";
pub const SITE_ACTIVATE: &str = "/app/v3/api/sites/{siteId}/activate";
pub const SITE_PAUSE: &str = "/app/v3/api/sites/{siteId}/pause";
pub const SITE_DOMAINS: &str = "/app/v3/api/sites/{siteId}/domains";
pub const SITE_DOMAIN: &str = "/app/v3/api/sites/{siteId}/domains/{domainId}";
pub const SITE_DOMAIN_VERIFY: &str = "/app/v3/api/sites/{siteId}/domains/{domainId}/verify";
pub const SITE_DOMAIN_LISTENER_CERTIFICATE_BINDINGS: &str =
    "/app/v3/api/sites/{siteId}/domains/{domainId}/listener_certificate_bindings";
pub const SITE_DOMAIN_LISTENER_CERTIFICATE_BINDING: &str =
    "/app/v3/api/sites/{siteId}/domains/{domainId}/listener_certificate_bindings/{bindingId}";
pub const SITE_SOURCE_VERSIONS: &str = "/app/v3/api/sites/{siteId}/source_versions";
pub const SITE_SOURCE_VERSION: &str =
    "/app/v3/api/sites/{siteId}/source_versions/{sourceVersionId}";
pub const SITE_SOURCE_VERSION_GIT_IMPORT: &str =
    "/app/v3/api/sites/{siteId}/source_versions/git_import";
pub const SITE_DEPLOYMENTS: &str = "/app/v3/api/sites/{siteId}/deployments";
pub const SITE_DEPLOYMENT: &str = "/app/v3/api/sites/{siteId}/deployments/{deploymentId}";
pub const SITE_DEPLOYMENT_ROLLBACK: &str =
    "/app/v3/api/sites/{siteId}/deployments/{deploymentId}/rollback";
pub const SITE_ENV_VARIABLES: &str = "/app/v3/api/sites/{siteId}/env_variables";
pub const SITE_ENV_VARIABLE: &str = "/app/v3/api/sites/{siteId}/env_variables/{variableId}";
pub const CERTIFICATES: &str = "/app/v3/api/certificates";
pub const CERTIFICATES_ISSUE: &str = "/app/v3/api/certificates/issue";
pub const CERTIFICATE_OPERATION: &str = "/app/v3/api/certificates/operations/{operationId}";
pub const SITE_HEALTH_CHECKS: &str = "/app/v3/api/sites/{siteId}/health_checks";

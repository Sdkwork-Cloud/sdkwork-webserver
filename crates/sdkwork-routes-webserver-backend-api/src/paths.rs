pub const PREFIX: &str = "/backend/v3/api";

pub const APPLICATIONS: &str = "/backend/v3/api/applications";
pub const APPLICATION: &str = "/backend/v3/api/applications/{applicationId}";
pub const APPLICATION_ACTIVATE: &str = "/backend/v3/api/applications/{applicationId}/activate";
pub const APPLICATION_PAUSE: &str = "/backend/v3/api/applications/{applicationId}/pause";
pub const APPLICATION_DOMAINS: &str = "/backend/v3/api/applications/{applicationId}/domains";
pub const APPLICATION_DOMAIN: &str =
    "/backend/v3/api/applications/{applicationId}/domains/{domainId}";
pub const APPLICATION_DOMAIN_VERIFY: &str =
    "/backend/v3/api/applications/{applicationId}/domains/{domainId}/verify";
pub const APPLICATION_SOURCE_VERSIONS: &str =
    "/backend/v3/api/applications/{applicationId}/source_versions";
pub const APPLICATION_SOURCE_VERSION_IMPORT_GIT: &str =
    "/backend/v3/api/applications/{applicationId}/source_versions/git_import";
pub const APPLICATION_SOURCE_VERSION: &str =
    "/backend/v3/api/applications/{applicationId}/source_versions/{sourceVersionId}";
pub const APPLICATION_DEPLOYMENTS: &str =
    "/backend/v3/api/applications/{applicationId}/deployments";
pub const APPLICATION_DEPLOYMENT_ROLLBACK: &str =
    "/backend/v3/api/applications/{applicationId}/deployments/{deploymentId}/rollback";
pub const CERTIFICATES: &str = "/backend/v3/api/certificates";
pub const CERTIFICATE: &str = "/backend/v3/api/certificates/{certificateId}";
pub const CERTIFICATE_RENEW: &str = "/backend/v3/api/certificates/{certificateId}/renew";
pub const CERTIFICATE_DISTRIBUTION: &str = "/backend/v3/api/certificate_distribution";

pub const NGINX_CONFIGS: &str = "/backend/v3/api/nginx/configs";
pub const NGINX_CONFIG: &str = "/backend/v3/api/nginx/etc/{configId}";
pub const NGINX_CONFIG_VALIDATE: &str = "/backend/v3/api/nginx/etc/{configId}/validate";
pub const NGINX_CONFIG_DEPLOY: &str = "/backend/v3/api/nginx/etc/{configId}/deploy";
pub const NGINX_RELOAD: &str = "/backend/v3/api/nginx/reload";
pub const NGINX_STATUS: &str = "/backend/v3/api/nginx/status";
pub const SERVERS: &str = "/backend/v3/api/servers";
pub const AUDIT_LOGS: &str = "/backend/v3/api/audit_logs";
pub const AGENT_HEARTBEAT: &str = "/backend/v3/api/agent/heartbeat";
pub const AGENT_SYNC: &str = "/backend/v3/api/agent/sync";

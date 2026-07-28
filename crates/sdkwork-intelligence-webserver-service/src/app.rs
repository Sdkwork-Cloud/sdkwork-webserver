//! App-api service surface implementation.

use async_trait::async_trait;
use sdkwork_webserver_contract::{
    CreateCertificateRequest, CreateDeploymentRequest, CreateDomainRequest,
    CreateEnvVariableRequest, CreateHealthCheckRequest, CreateSiteRequest, ListSitesQuery,
    UpdateSiteRequest, WebAppApi, WebAppRequestContext, WebAppResourceScope, WebServiceResult,
};

use crate::{AuditLogWrite, WebService};

const MAX_DEPLOYMENT_ARTIFACT_BYTES: i64 = 64 * 1024 * 1024;
const MAX_ENV_VARIABLE_VALUE_BYTES: usize = 64 * 1024;

impl WebService {
    fn require_tenant(context: &WebAppRequestContext) -> WebServiceResult<i64> {
        if context.tenant_id <= 0 {
            return Err(sdkwork_webserver_contract::WebServiceError::Forbidden);
        }
        Ok(context.tenant_id)
    }

    pub(crate) fn owner_filter(context: &WebAppRequestContext) -> WebServiceResult<Option<i64>> {
        match context.resource_scope {
            WebAppResourceScope::Owner => context
                .actor_id
                .filter(|actor_id| *actor_id > 0)
                .map(Some)
                .ok_or(sdkwork_webserver_contract::WebServiceError::Forbidden),
            WebAppResourceScope::Tenant => Ok(None),
        }
    }

    async fn require_site_access(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
    ) -> WebServiceResult<i64> {
        let tenant_id = Self::require_tenant(context)?;
        let owner_id = Self::owner_filter(context)?;
        self.repository
            .retrieve_site(tenant_id, owner_id, site_id)
            .await?;
        Ok(tenant_id)
    }

    pub(crate) fn validate_application_type(value: &str) -> WebServiceResult<()> {
        if matches!(value, "WEB" | "API") {
            return Ok(());
        }
        Err(sdkwork_webserver_contract::WebServiceError::validation(
            "applicationType must be WEB or API",
        ))
    }

    pub(crate) fn validate_deployment_request(
        request: &CreateDeploymentRequest,
    ) -> WebServiceResult<()> {
        if !matches!(request.deploy_type, 1..=4) {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "deployType must be 1 (manual), 2 (git), 3 (ci-cd), or 4 (api)",
            ));
        }
        if let Some(environment) = request.environment.as_deref() {
            if environment != environment.trim()
                || !matches!(
                    environment,
                    "development" | "test" | "staging" | "production"
                )
            {
                return Err(sdkwork_webserver_contract::WebServiceError::validation(
                    "environment must be development, test, staging, or production",
                ));
            }
        }

        validate_optional_deployment_text("versionTag", request.version_tag.as_deref(), 100)?;
        validate_optional_deployment_text("sourceRef", request.source_ref.as_deref(), 500)?;
        if let Some(commit_hash) = request.commit_hash.as_deref() {
            let hash = commit_hash.trim();
            if hash != commit_hash
                || !(7..=64).contains(&hash.len())
                || !hash
                    .bytes()
                    .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
            {
                return Err(sdkwork_webserver_contract::WebServiceError::validation(
                    "commitHash must be a 7..64 character lowercase hexadecimal digest",
                ));
            }
        }

        let artifact_fields = [
            request.artifact_drive_uri.is_some(),
            request.artifact_size.is_some(),
            request.artifact_hash.is_some(),
        ];
        if !artifact_fields.into_iter().all(|present| present) {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "artifactDriveUri, artifactSize, and artifactHash are required together",
            ));
        }

        if let Some(uri) = request.artifact_drive_uri.as_deref() {
            let uri = uri.trim();
            let Some((space_id, node_id)) = uri
                .strip_prefix("drive://spaces/")
                .and_then(|value| value.split_once("/nodes/"))
            else {
                return Err(sdkwork_webserver_contract::WebServiceError::validation(
                    "artifactDriveUri must use drive://spaces/{spaceId}/nodes/{nodeId}",
                ));
            };
            if space_id.is_empty()
                || node_id.is_empty()
                || space_id.contains('/')
                || node_id.contains('/')
                || uri.contains(['?', '#'])
                || uri.len() > 500
                || !space_id.bytes().all(is_safe_drive_identifier_byte)
                || !node_id.bytes().all(is_safe_drive_identifier_byte)
            {
                return Err(sdkwork_webserver_contract::WebServiceError::validation(
                    "artifactDriveUri must use drive://spaces/{spaceId}/nodes/{nodeId}",
                ));
            }
        }
        if request
            .artifact_size
            .is_some_and(|size| !(1..=MAX_DEPLOYMENT_ARTIFACT_BYTES).contains(&size))
        {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "artifactSize must be between 1 byte and 64 MiB",
            ));
        }
        if let Some(hash) = request.artifact_hash.as_deref() {
            let hash = hash.trim();
            if hash.len() != 64
                || !hash
                    .bytes()
                    .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
            {
                return Err(sdkwork_webserver_contract::WebServiceError::validation(
                    "artifactHash must be a lowercase SHA-256 hexadecimal digest",
                ));
            }
        }
        Ok(())
    }

    pub(crate) fn validate_health_check_request(
        request: &CreateHealthCheckRequest,
    ) -> WebServiceResult<()> {
        if !matches!(request.check_type, 1..=3) {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "checkType must be 1 (HTTP), 2 (TCP), or 3 (ping)",
            ));
        }
        if request.check_url.is_empty()
            || request.check_url != request.check_url.trim()
            || request.check_url.len() > 2_000
            || request.check_url.chars().any(char::is_control)
        {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "checkUrl must contain 1..2000 non-control characters",
            ));
        }
        if !(5..=86_400).contains(&request.check_interval) {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "checkInterval must be between 5 and 86400 seconds",
            ));
        }
        if !(100..=60_000).contains(&request.timeout_ms)
            || i64::from(request.timeout_ms) > i64::from(request.check_interval) * 1_000
        {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "timeoutMs must be between 100 and 60000 and not exceed checkInterval",
            ));
        }
        if !(0..=10).contains(&request.retry_count) {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "retryCount must be between 0 and 10",
            ));
        }
        Ok(())
    }

    pub(crate) fn validate_domain_request(request: &CreateDomainRequest) -> WebServiceResult<()> {
        let hostname = request.hostname.as_str();
        if hostname.is_empty()
            || hostname != hostname.trim()
            || hostname.len() > 253
            || hostname.starts_with('.')
            || hostname.ends_with('.')
            || hostname.split('.').any(|label| {
                label.is_empty()
                    || label.len() > 63
                    || label.starts_with('-')
                    || label.ends_with('-')
                    || !label
                        .bytes()
                        .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
            })
        {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "hostname must be a safe ASCII DNS name",
            ));
        }
        if request
            .ssl_provider
            .as_deref()
            .is_some_and(|provider| !matches!(provider, "letsencrypt" | "custom" | "none"))
        {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "sslProvider must be letsencrypt, custom, or none",
            ));
        }
        Ok(())
    }

    pub(crate) fn validate_env_variable_request(
        request: &CreateEnvVariableRequest,
    ) -> WebServiceResult<()> {
        if request.key.is_empty()
            || request.key.len() > 200
            || !request.key.bytes().enumerate().all(|(index, byte)| {
                byte == b'_' || byte.is_ascii_alphabetic() || (index > 0 && byte.is_ascii_digit())
            })
        {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "key must be a 1..200 character environment variable name",
            ));
        }
        if !matches!(
            request.environment.as_str(),
            "development" | "test" | "staging" | "production"
        ) {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "environment must be development, test, staging, or production",
            ));
        }
        if request.value.len() > MAX_ENV_VARIABLE_VALUE_BYTES || request.value.contains('\0') {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "value must not exceed 64 KiB or contain NUL",
            ));
        }
        Ok(())
    }

    pub(crate) fn validate_certificate_request(
        request: &CreateCertificateRequest,
    ) -> WebServiceResult<()> {
        if !matches!(request.cert_type, 1 | 3) {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "certType must be 1 (Let's Encrypt) or 3 (self-signed)",
            ));
        }
        if request.cert_type == 3 && request.auto_renew {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "automatic renewal is unavailable for self-signed certificates",
            ));
        }
        if request.domain_id.is_empty()
            || request.domain_id != request.domain_id.trim()
            || request.domain_id.len() > 64
            || request.domain_id.chars().any(char::is_control)
        {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "domainId is invalid",
            ));
        }
        Ok(())
    }

    async fn audit_site_action(
        &self,
        context: &WebAppRequestContext,
        action: &str,
        target_uuid: &str,
    ) {
        let operator_id = context.actor_id.unwrap_or(0);
        if let Err(error) = self
            .repository
            .insert_audit_log(AuditLogWrite {
                tenant_id: context.tenant_id,
                organization_id: context.organization_id.unwrap_or(0),
                operator_id,
                operator_type: "USER",
                action,
                target_type: "site",
                target_id: None,
                target_uuid: Some(target_uuid),
                request_id: None,
                metadata_json: "{}",
            })
            .await
        {
            tracing::error!(
                tenant_id = context.tenant_id,
                operator_id,
                action,
                target_uuid,
                error = ?error,
                "failed to persist site business audit"
            );
        }
    }
}

fn validate_optional_deployment_text(
    field: &str,
    value: Option<&str>,
    max_characters: usize,
) -> WebServiceResult<()> {
    if let Some(value) = value {
        if value.is_empty()
            || value != value.trim()
            || value.chars().count() > max_characters
            || value.chars().any(char::is_control)
        {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                format!("{field} must contain 1..{max_characters} non-control characters"),
            ));
        }
    }
    Ok(())
}

fn is_safe_drive_identifier_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.')
}

#[cfg(test)]
mod resource_scope_tests {
    use super::*;
    use sdkwork_webserver_contract::WebServiceError;

    #[test]
    fn owner_scope_requires_a_valid_actor() {
        let context = WebAppRequestContext {
            tenant_id: 1,
            resource_scope: WebAppResourceScope::Owner,
            ..WebAppRequestContext::default()
        };

        assert!(matches!(
            WebService::owner_filter(&context),
            Err(WebServiceError::Forbidden)
        ));
    }

    #[test]
    fn tenant_scope_does_not_apply_an_owner_filter() {
        let context = WebAppRequestContext {
            tenant_id: 1,
            resource_scope: WebAppResourceScope::Tenant,
            ..WebAppRequestContext::default()
        };

        assert_eq!(WebService::owner_filter(&context).unwrap(), None);
    }
}

#[async_trait]
impl WebAppApi for WebService {
    async fn list_sites(
        &self,
        context: &WebAppRequestContext,
        query: &ListSitesQuery,
    ) -> WebServiceResult<sdkwork_webserver_contract::SitePage> {
        let tenant_id = Self::require_tenant(context)?;
        if let Some(application_type) = query.application_type.as_deref() {
            Self::validate_application_type(application_type)?;
        }
        let owner_id = Self::owner_filter(context)?;
        self.repository.list_sites(tenant_id, owner_id, query).await
    }

    async fn create_site(
        &self,
        context: &WebAppRequestContext,
        request: &CreateSiteRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::SiteResponse> {
        let tenant_id = Self::require_tenant(context)?;
        let owner_id = Self::owner_filter(context)?;
        Self::validate_application_type(&request.application_type)?;
        let site = self
            .repository
            .create_site(tenant_id, context.organization_id, owner_id, request)
            .await?;
        self.audit_site_action(context, "sites.create", &site.id)
            .await;
        Ok(site)
    }

    async fn retrieve_site(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::SiteResponse> {
        let tenant_id = Self::require_tenant(context)?;
        let owner_id = Self::owner_filter(context)?;
        self.repository
            .retrieve_site(tenant_id, owner_id, site_id)
            .await
    }

    async fn update_site(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
        request: &UpdateSiteRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::SiteResponse> {
        let tenant_id = self.require_site_access(context, site_id).await?;
        let site = self
            .repository
            .update_site(tenant_id, site_id, request)
            .await?;
        self.audit_site_action(context, "sites.update", site_id)
            .await;
        Ok(site)
    }

    async fn delete_site(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
    ) -> WebServiceResult<()> {
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .delete_site(tenant_id, site_id, context.actor_id)
            .await?;
        self.audit_site_action(context, "sites.delete", site_id)
            .await;
        Ok(())
    }

    async fn activate_site(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::SiteResponse> {
        let tenant_id = self.require_site_access(context, site_id).await?;
        let site = self
            .repository
            .set_site_status(tenant_id, site_id, 1)
            .await?;
        self.audit_site_action(context, "sites.activate", site_id)
            .await;
        Ok(site)
    }

    async fn pause_site(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::SiteResponse> {
        let tenant_id = self.require_site_access(context, site_id).await?;
        let site = self
            .repository
            .set_site_status(tenant_id, site_id, 2)
            .await?;
        self.audit_site_action(context, "sites.pause", site_id)
            .await;
        Ok(site)
    }

    async fn list_domains(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<sdkwork_webserver_contract::DomainPage> {
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .list_domains(tenant_id, site_id, page, page_size)
            .await
    }

    async fn create_domain(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
        request: &CreateDomainRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::DomainResponse> {
        Self::validate_domain_request(request)?;
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .create_domain(tenant_id, site_id, request)
            .await
    }

    async fn retrieve_domain(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
        domain_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::DomainResponse> {
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .retrieve_domain(tenant_id, site_id, domain_id)
            .await
    }

    async fn delete_domain(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
        domain_id: &str,
    ) -> WebServiceResult<()> {
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .delete_domain(tenant_id, site_id, domain_id)
            .await
    }

    async fn verify_domain(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
        domain_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::DomainVerifyResponse> {
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .verify_domain(tenant_id, site_id, domain_id)
            .await
    }

    async fn list_deployments(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
        page: i32,
        page_size: i32,
        status: Option<i32>,
    ) -> WebServiceResult<sdkwork_webserver_contract::DeploymentPage> {
        if status.is_some_and(|status| !(0..=6).contains(&status)) {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "status must be between 0 and 6",
            ));
        }
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .list_deployments(tenant_id, site_id, page, page_size, status)
            .await
    }

    async fn create_deployment(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
        request: &CreateDeploymentRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::DeploymentResponse> {
        let mut request = request.clone();
        if let Some(idempotency_key) = &context.idempotency_key {
            request.idempotency_key = Some(idempotency_key.clone());
        }
        Self::validate_deployment_request(&request)?;
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .create_deployment(tenant_id, site_id, context.actor_id, &request)
            .await
    }

    async fn retrieve_deployment(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
        deployment_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::DeploymentResponse> {
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .retrieve_deployment(tenant_id, site_id, deployment_id)
            .await
    }

    async fn rollback_deployment(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
        deployment_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::DeploymentResponse> {
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .rollback_deployment(
                tenant_id,
                site_id,
                deployment_id,
                context.actor_id,
                context.idempotency_key.as_deref(),
            )
            .await
    }

    async fn list_env_variables(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
        environment: Option<&str>,
    ) -> WebServiceResult<sdkwork_webserver_contract::EnvVariablePage> {
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .list_env_variables(tenant_id, site_id, environment)
            .await
    }

    async fn create_env_variable(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
        request: &CreateEnvVariableRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::EnvVariableResponse> {
        Self::validate_env_variable_request(request)?;
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .create_env_variable(tenant_id, site_id, request)
            .await
    }

    async fn list_certificates(
        &self,
        context: &WebAppRequestContext,
        site_id: Option<&str>,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<sdkwork_webserver_contract::CertificatePage> {
        let tenant_id = if let Some(site_id) = site_id {
            self.require_site_access(context, site_id).await?
        } else {
            Self::require_tenant(context)?
        };
        let owner_id = Self::owner_filter(context)?;
        self.repository
            .list_certificates(tenant_id, owner_id, site_id, page, page_size)
            .await
    }

    async fn create_certificate(
        &self,
        context: &WebAppRequestContext,
        request: &CreateCertificateRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::CertificateResponse> {
        self.issue_certificate(context, request).await
    }

    async fn list_health_checks(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::HealthCheckPage> {
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository.list_health_checks(tenant_id, site_id).await
    }

    async fn create_health_check(
        &self,
        context: &WebAppRequestContext,
        site_id: &str,
        request: &CreateHealthCheckRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::HealthCheckResponse> {
        Self::validate_health_check_request(request)?;
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .create_health_check(tenant_id, site_id, request)
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::{WebService, MAX_DEPLOYMENT_ARTIFACT_BYTES, MAX_ENV_VARIABLE_VALUE_BYTES};
    use sdkwork_webserver_contract::{
        CreateCertificateRequest, CreateDeploymentRequest, CreateDomainRequest,
        CreateEnvVariableRequest, CreateHealthCheckRequest,
    };

    #[test]
    fn application_type_is_limited_to_public_business_types() {
        assert!(WebService::validate_application_type("WEB").is_ok());
        assert!(WebService::validate_application_type("API").is_ok());
        for invalid in ["web", "STATIC", "", "OTHER"] {
            assert!(WebService::validate_application_type(invalid).is_err());
        }
    }

    #[test]
    fn deployment_artifact_identity_is_canonical_and_bounded() {
        let valid = CreateDeploymentRequest {
            artifact_drive_uri: Some("drive://spaces/space-1/nodes/node-1".to_owned()),
            artifact_size: Some(1024),
            artifact_hash: Some("a".repeat(64)),
            ..CreateDeploymentRequest::default()
        };
        assert!(WebService::validate_deployment_request(&valid).is_ok());

        for invalid in [
            CreateDeploymentRequest {
                deploy_type: 0,
                ..valid.clone()
            },
            CreateDeploymentRequest {
                environment: Some("prod".to_string()),
                ..valid.clone()
            },
            CreateDeploymentRequest {
                artifact_hash: Some("A".repeat(64)),
                ..valid.clone()
            },
            CreateDeploymentRequest {
                artifact_size: Some(MAX_DEPLOYMENT_ARTIFACT_BYTES + 1),
                ..valid.clone()
            },
            CreateDeploymentRequest {
                artifact_hash: None,
                ..valid.clone()
            },
            CreateDeploymentRequest {
                version_tag: Some(" release ".to_string()),
                ..valid.clone()
            },
            CreateDeploymentRequest {
                commit_hash: Some("not-a-commit".to_string()),
                ..valid.clone()
            },
        ] {
            assert!(WebService::validate_deployment_request(&invalid).is_err());
        }

        for artifact_drive_uri in [
            "https://example.test/package.zip",
            "drive://spaces/space-1/nodes/",
            "drive://spaces/space-1/nodes/node-1?token=secret",
        ] {
            assert!(
                WebService::validate_deployment_request(&CreateDeploymentRequest {
                    artifact_drive_uri: Some(artifact_drive_uri.to_owned()),
                    ..CreateDeploymentRequest::default()
                })
                .is_err()
            );
        }
    }

    #[test]
    fn health_check_configuration_is_bounded() {
        let valid = CreateHealthCheckRequest {
            check_type: 1,
            check_url: "https://example.test/ready".to_string(),
            check_interval: 30,
            timeout_ms: 5_000,
            retry_count: 3,
        };
        assert!(WebService::validate_health_check_request(&valid).is_ok());

        for invalid in [
            CreateHealthCheckRequest {
                check_type: 0,
                ..valid.clone()
            },
            CreateHealthCheckRequest {
                check_url: "".to_string(),
                ..valid.clone()
            },
            CreateHealthCheckRequest {
                check_interval: 4,
                ..valid.clone()
            },
            CreateHealthCheckRequest {
                timeout_ms: 30_001,
                ..valid.clone()
            },
            CreateHealthCheckRequest {
                retry_count: 11,
                ..valid.clone()
            },
        ] {
            assert!(WebService::validate_health_check_request(&invalid).is_err());
        }
    }

    #[test]
    fn domain_environment_and_certificate_inputs_are_fail_closed() {
        let domain = CreateDomainRequest {
            hostname: "api.example.test".to_owned(),
            is_primary: false,
            ssl_enabled: true,
            ssl_provider: Some("letsencrypt".to_owned()),
        };
        assert!(WebService::validate_domain_request(&domain).is_ok());
        assert!(WebService::validate_domain_request(&CreateDomainRequest {
            hostname: "bad host".to_owned(),
            ..domain.clone()
        })
        .is_err());

        let variable = CreateEnvVariableRequest {
            key: "API_BASE_URL".to_owned(),
            value: "https://api.example.test".to_owned(),
            environment: "production".to_owned(),
            is_secret: false,
        };
        assert!(WebService::validate_env_variable_request(&variable).is_ok());
        assert!(
            WebService::validate_env_variable_request(&CreateEnvVariableRequest {
                key: "INVALID-KEY".to_owned(),
                ..variable.clone()
            })
            .is_err()
        );
        assert!(
            WebService::validate_env_variable_request(&CreateEnvVariableRequest {
                value: "x".repeat(MAX_ENV_VARIABLE_VALUE_BYTES + 1),
                ..variable
            })
            .is_err()
        );

        assert!(
            WebService::validate_certificate_request(&CreateCertificateRequest {
                domain_id: "domain-1".to_owned(),
                cert_type: 1,
                auto_renew: true,
            })
            .is_ok()
        );
        assert!(
            WebService::validate_certificate_request(&CreateCertificateRequest {
                domain_id: "domain-1".to_owned(),
                cert_type: 3,
                auto_renew: true,
            })
            .is_err()
        );
    }
}

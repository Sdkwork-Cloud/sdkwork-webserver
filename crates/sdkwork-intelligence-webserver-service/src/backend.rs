//! Backend-api service surface implementation.

use async_trait::async_trait;
use sdkwork_webserver_contract::{
    CreateCertificateRequest, CreateDeploymentRequest, CreateDomainRequest,
    CreateManagedDomainRequest, CreateNginxConfigRequest, CreateServerRequest, CreateSiteRequest,
    CreateSourceVersionRequest, ImportGitSourceVersionRequest, ListNginxConfigsQuery,
    ListSitesQuery, UpdateCertificateRequest, UpdateDomainApplicationBindingRequest,
    UpdateNginxConfigRequest, UpdateSiteRequest, WebAppApi, WebAppRequestContext,
    WebAppResourceScope, WebBackendApi, WebBackendRequestContext, WebServiceError,
    WebServiceResult,
};

use crate::{AuditLogWrite, WebService};

const MAX_NGINX_CONFIG_BYTES: usize = 1024 * 1024;

impl WebService {
    /// 统一的 fail-closed 租户上下文校验。
    ///
    /// 所有 backend-api 操作（读与写）都必须携带有效 tenant_id（>0），
    /// 防止 `tenant_id=None` 时跨租户读写数据。
    /// 平台级跨租户管理操作应通过独立 platform-admin 鉴权链路实现，不复用此通道。
    fn require_backend_tenant(context: &WebBackendRequestContext) -> WebServiceResult<i64> {
        context
            .tenant_id
            .filter(|tenant_id| *tenant_id > 0)
            .ok_or(WebServiceError::validation(
                "tenant context is required for backend operations",
            ))
    }

    fn backend_app_context(
        context: &WebBackendRequestContext,
    ) -> WebServiceResult<WebAppRequestContext> {
        Ok(WebAppRequestContext {
            tenant_id: Self::require_backend_tenant(context)?,
            actor_id: context.operator_id,
            organization_id: None,
            session_id: None,
            idempotency_key: context.idempotency_key.clone(),
            resource_scope: WebAppResourceScope::Tenant,
        })
    }

    async fn audit_backend_action(
        &self,
        context: &WebBackendRequestContext,
        action: &str,
        target_type: &str,
        target_uuid: &str,
    ) {
        let tenant_id = match Self::require_backend_tenant(context) {
            Ok(tenant_id) => tenant_id,
            Err(error) => {
                tracing::error!(
                    action,
                    target_type,
                    target_uuid,
                    error = ?error,
                    "failed to resolve tenant for backend business audit"
                );
                return;
            }
        };
        if let Err(error) = self
            .repository
            .insert_audit_log(AuditLogWrite {
                tenant_id,
                organization_id: 0,
                operator_id: context.operator_id.unwrap_or(0),
                operator_type: "ADMIN",
                action,
                target_type,
                target_id: None,
                target_uuid: Some(target_uuid),
                request_id: None,
                metadata_json: "{}",
            })
            .await
        {
            tracing::error!(
                tenant_id,
                action,
                target_type,
                target_uuid,
                error = ?error,
                "failed to persist backend business audit"
            );
        }
    }
}

#[async_trait]
impl WebBackendApi for WebService {
    async fn list_applications(
        &self,
        context: &WebBackendRequestContext,
        query: &ListSitesQuery,
    ) -> WebServiceResult<sdkwork_webserver_contract::SitePage> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::list_sites(self, &app_context, query).await
    }

    async fn create_application(
        &self,
        context: &WebBackendRequestContext,
        request: &CreateSiteRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::SiteResponse> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::create_site(self, &app_context, request).await
    }

    async fn retrieve_application(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::SiteResponse> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::retrieve_site(self, &app_context, application_id).await
    }

    async fn update_application(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
        request: &UpdateSiteRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::SiteResponse> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::update_site(self, &app_context, application_id, request).await
    }

    async fn delete_application(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
    ) -> WebServiceResult<()> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::delete_site(self, &app_context, application_id).await
    }

    async fn activate_application(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::SiteResponse> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::activate_site(self, &app_context, application_id).await
    }

    async fn pause_application(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::SiteResponse> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::pause_site(self, &app_context, application_id).await
    }

    async fn list_application_domains(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<sdkwork_webserver_contract::DomainPage> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::list_domains(self, &app_context, application_id, page, page_size).await
    }

    async fn create_application_domain(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
        request: &CreateDomainRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::DomainResponse> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::create_domain(self, &app_context, application_id, request).await
    }

    async fn verify_application_domain(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
        domain_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::DomainVerifyResponse> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::verify_domain(self, &app_context, application_id, domain_id).await
    }

    async fn delete_application_domain(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
        domain_id: &str,
    ) -> WebServiceResult<()> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::delete_domain(self, &app_context, application_id, domain_id).await
    }

    async fn list_managed_domains(
        &self,
        context: &WebBackendRequestContext,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<sdkwork_webserver_contract::DomainPage> {
        let tenant_id = Self::require_backend_tenant(context)?;
        self.repository
            .list_managed_domains(tenant_id, page, page_size)
            .await
    }

    async fn create_managed_domain(
        &self,
        context: &WebBackendRequestContext,
        request: &CreateManagedDomainRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::DomainResponse> {
        Self::validate_domain_request(&CreateDomainRequest {
            hostname: request.hostname.clone(),
            is_primary: request.is_primary,
            ssl_enabled: request.ssl_enabled,
            ssl_provider: request.ssl_provider.clone(),
        })?;
        if request.application_id.is_none() && request.is_primary {
            return Err(WebServiceError::validation(
                "an unbound domain cannot be primary",
            ));
        }
        let tenant_id = Self::require_backend_tenant(context)?;
        let domain = self
            .repository
            .create_managed_domain(tenant_id, request)
            .await?;
        self.audit_backend_action(context, "domains.create", "domain", &domain.id)
            .await;
        Ok(domain)
    }

    async fn delete_managed_domain(
        &self,
        context: &WebBackendRequestContext,
        domain_id: &str,
    ) -> WebServiceResult<()> {
        let tenant_id = Self::require_backend_tenant(context)?;
        self.repository
            .delete_managed_domain(tenant_id, domain_id)
            .await?;
        self.audit_backend_action(context, "domains.delete", "domain", domain_id)
            .await;
        Ok(())
    }

    async fn verify_managed_domain(
        &self,
        context: &WebBackendRequestContext,
        domain_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::DomainVerifyResponse> {
        let tenant_id = Self::require_backend_tenant(context)?;
        let verification = self
            .repository
            .verify_managed_domain(tenant_id, domain_id)
            .await?;
        self.audit_backend_action(context, "domains.verify", "domain", domain_id)
            .await;
        Ok(verification)
    }

    async fn update_domain_application_binding(
        &self,
        context: &WebBackendRequestContext,
        domain_id: &str,
        request: &UpdateDomainApplicationBindingRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::DomainResponse> {
        if request.application_id.trim().is_empty() {
            return Err(WebServiceError::validation(
                "applicationId must not be empty",
            ));
        }
        let tenant_id = Self::require_backend_tenant(context)?;
        let domain = self
            .repository
            .bind_managed_domain(tenant_id, domain_id, request)
            .await?;
        self.audit_backend_action(
            context,
            "domains.application_binding.update",
            "domain",
            domain_id,
        )
        .await;
        Ok(domain)
    }

    async fn delete_domain_application_binding(
        &self,
        context: &WebBackendRequestContext,
        domain_id: &str,
    ) -> WebServiceResult<()> {
        let tenant_id = Self::require_backend_tenant(context)?;
        self.repository
            .unbind_managed_domain(tenant_id, domain_id)
            .await?;
        self.audit_backend_action(
            context,
            "domains.application_binding.delete",
            "domain",
            domain_id,
        )
        .await;
        Ok(())
    }

    async fn list_application_source_versions(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<sdkwork_webserver_contract::SourceVersionPage> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::list_source_versions(self, &app_context, application_id, page, page_size).await
    }

    async fn create_application_source_version(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
        request: &CreateSourceVersionRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::SourceVersionResponse> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::create_source_version(self, &app_context, application_id, request).await
    }

    async fn import_application_git_source_version(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
        request: &ImportGitSourceVersionRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::SourceVersionResponse> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::import_git_source_version(self, &app_context, application_id, request).await
    }

    async fn retrieve_application_source_version(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
        source_version_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::SourceVersionResponse> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::retrieve_source_version(self, &app_context, application_id, source_version_id)
            .await
    }

    async fn list_application_deployments(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
        page: i32,
        page_size: i32,
        status: Option<i32>,
    ) -> WebServiceResult<sdkwork_webserver_contract::DeploymentPage> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::list_deployments(self, &app_context, application_id, page, page_size, status)
            .await
    }

    async fn create_application_deployment(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
        request: &CreateDeploymentRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::DeploymentResponse> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::create_deployment(self, &app_context, application_id, request).await
    }

    async fn rollback_application_deployment(
        &self,
        context: &WebBackendRequestContext,
        application_id: &str,
        deployment_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::DeploymentResponse> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::rollback_deployment(self, &app_context, application_id, deployment_id).await
    }

    async fn list_managed_certificates(
        &self,
        context: &WebBackendRequestContext,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<sdkwork_webserver_contract::CertificatePage> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::list_certificates(self, &app_context, None, page, page_size).await
    }

    async fn create_managed_certificate(
        &self,
        context: &WebBackendRequestContext,
        request: &CreateCertificateRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::CertificateResponse> {
        let app_context = Self::backend_app_context(context)?;
        WebAppApi::create_certificate(self, &app_context, request).await
    }

    async fn update_managed_certificate(
        &self,
        context: &WebBackendRequestContext,
        certificate_id: &str,
        request: &UpdateCertificateRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::CertificateResponse> {
        let tenant_id = Self::require_backend_tenant(context)?;
        let certificate = self
            .repository
            .update_certificate_auto_renew(tenant_id, certificate_id, request.auto_renew)
            .await?;
        self.audit_backend_action(
            context,
            "certificates.auto_renew.update",
            "certificate",
            certificate_id,
        )
        .await;
        Ok(certificate)
    }

    async fn renew_managed_certificate(
        &self,
        context: &WebBackendRequestContext,
        certificate_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::CertificateResponse> {
        let tenant_id = Self::require_backend_tenant(context)?;
        let candidate = self
            .repository
            .retrieve_certificate_renewal_candidate(tenant_id, certificate_id)
            .await?;
        let certificate = self.renew_certificate(&candidate, false).await?;
        self.audit_backend_action(
            context,
            "certificates.renew.manual",
            "certificate",
            certificate_id,
        )
        .await;
        Ok(certificate)
    }

    async fn list_certificate_distribution(
        &self,
        context: &WebBackendRequestContext,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<sdkwork_webserver_contract::CertificateDistributionPage> {
        let tenant_id = Self::require_backend_tenant(context)?;
        self.repository
            .list_certificate_distribution(tenant_id, page, page_size)
            .await
    }

    async fn list_nginx_configs(
        &self,
        context: &WebBackendRequestContext,
        query: &ListNginxConfigsQuery,
    ) -> WebServiceResult<sdkwork_webserver_contract::NginxConfigPage> {
        let tenant_id = Self::require_backend_tenant(context)?;
        self.repository
            .list_nginx_configs(Some(tenant_id), query)
            .await
    }

    async fn create_nginx_config(
        &self,
        context: &WebBackendRequestContext,
        request: &CreateNginxConfigRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::NginxConfigResponse> {
        validate_create_nginx_config_request(request)?;
        let tenant_id = Self::require_backend_tenant(context)?;
        self.repository
            .create_nginx_config(tenant_id, request)
            .await
    }

    async fn retrieve_nginx_config(
        &self,
        context: &WebBackendRequestContext,
        config_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::NginxConfigResponse> {
        let tenant_id = Self::require_backend_tenant(context)?;
        self.repository
            .retrieve_nginx_config(Some(tenant_id), config_id)
            .await
    }

    async fn update_nginx_config(
        &self,
        context: &WebBackendRequestContext,
        config_id: &str,
        request: &UpdateNginxConfigRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::NginxConfigResponse> {
        validate_update_nginx_config_request(request)?;
        let tenant_id = Self::require_backend_tenant(context)?;
        self.repository
            .update_nginx_config(Some(tenant_id), config_id, request)
            .await
    }

    async fn validate_nginx_config(
        &self,
        context: &WebBackendRequestContext,
        config_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::NginxValidateResponse> {
        let tenant_id = Self::require_backend_tenant(context)?;
        let content = self
            .repository
            .load_nginx_config_content(Some(tenant_id), config_id)
            .await?;
        match self.validate_nginx_content(&content).await {
            Ok(()) => Ok(sdkwork_webserver_contract::NginxValidateResponse {
                valid: true,
                message: None,
            }),
            Err(error) => Ok(sdkwork_webserver_contract::NginxValidateResponse {
                valid: false,
                message: Some(error.to_string()),
            }),
        }
    }

    async fn web_nginx_config(
        &self,
        context: &WebBackendRequestContext,
        config_id: &str,
    ) -> WebServiceResult<sdkwork_webserver_contract::NginxConfigResponse> {
        let tenant_id = Self::require_backend_tenant(context)?;
        let candidate = self
            .repository
            .retrieve_nginx_config(Some(tenant_id), config_id)
            .await?;
        let domain = self
            .repository
            .resolve_site_primary_hostname(tenant_id, &candidate.site_id)
            .await?;
        let content = self
            .repository
            .load_nginx_config_content(Some(tenant_id), config_id)
            .await?;
        self.validate_nginx_content(&content).await?;

        let response = self
            .repository
            .web_nginx_config(Some(tenant_id), config_id)
            .await?;
        self.deploy_nginx_site(&domain, &content).await?;
        self.reload_nginx_runtime().await?;

        Ok(response)
    }

    async fn reload_nginx(
        &self,
        _context: &WebBackendRequestContext,
    ) -> WebServiceResult<sdkwork_webserver_contract::NginxReloadResponse> {
        self.reload_nginx_runtime().await?;
        Ok(sdkwork_webserver_contract::NginxReloadResponse { reloaded: true })
    }

    async fn retrieve_nginx_status(
        &self,
        context: &WebBackendRequestContext,
    ) -> WebServiceResult<sdkwork_webserver_contract::NginxStatusResponse> {
        let tenant_id = Self::require_backend_tenant(context)?;
        self.repository.retrieve_nginx_status(Some(tenant_id)).await
    }

    async fn list_servers(
        &self,
        context: &WebBackendRequestContext,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<sdkwork_webserver_contract::ServerPage> {
        let tenant_id = Self::require_backend_tenant(context)?;
        self.repository
            .list_servers(tenant_id, page, page_size)
            .await
    }

    async fn create_server(
        &self,
        context: &WebBackendRequestContext,
        request: &CreateServerRequest,
    ) -> WebServiceResult<sdkwork_webserver_contract::CreateServerResponse> {
        let tenant_id = Self::require_backend_tenant(context)?;
        validate_create_server_request(request)?;
        self.repository.create_server(tenant_id, request).await
    }

    async fn list_audit_logs(
        &self,
        context: &WebBackendRequestContext,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<sdkwork_webserver_contract::AuditLogPage> {
        let tenant_id = Self::require_backend_tenant(context)?;
        self.repository
            .list_audit_logs(Some(tenant_id), page, page_size)
            .await
    }
}

fn validate_create_nginx_config_request(
    request: &CreateNginxConfigRequest,
) -> WebServiceResult<()> {
    if !matches!(request.config_type, 1..=4) {
        return Err(WebServiceError::validation(
            "configType must be 1 (server), 2 (location), 3 (ssl), or 4 (upstream)",
        ));
    }
    validate_bounded_text("siteId", &request.site_id, 64)?;
    validate_bounded_text("configName", &request.config_name, 200)?;
    validate_nginx_config_content(&request.config_content)
}

fn validate_update_nginx_config_request(
    request: &UpdateNginxConfigRequest,
) -> WebServiceResult<()> {
    if request.config_name.is_none() && request.config_content.is_none() {
        return Err(WebServiceError::validation(
            "at least one Nginx configuration field is required",
        ));
    }
    if let Some(config_name) = request.config_name.as_deref() {
        validate_bounded_text("configName", config_name, 200)?;
    }
    if let Some(config_content) = request.config_content.as_deref() {
        validate_nginx_config_content(config_content)?;
    }
    Ok(())
}

fn validate_nginx_config_content(value: &str) -> WebServiceResult<()> {
    if value.is_empty() || value.len() > MAX_NGINX_CONFIG_BYTES || value.contains('\0') {
        return Err(WebServiceError::validation(
            "configContent must contain 1 byte to 1 MiB and must not contain NUL",
        ));
    }
    Ok(())
}

fn validate_create_server_request(request: &CreateServerRequest) -> WebServiceResult<()> {
    validate_bounded_text("name", &request.name, 100)?;
    validate_bounded_text("host", &request.host, 255)?;
    if request.host.chars().any(char::is_whitespace) {
        return Err(WebServiceError::validation(
            "host must not contain whitespace",
        ));
    }
    if !(1..=65_535).contains(&request.ssh_port) {
        return Err(WebServiceError::validation(
            "sshPort must be between 1 and 65535",
        ));
    }
    validate_tenant_scope_hash(&request.tenant_scope_hash)
}

fn validate_bounded_text(field: &str, value: &str, maximum: usize) -> WebServiceResult<()> {
    if value.is_empty()
        || value != value.trim()
        || value.chars().count() > maximum
        || value.chars().any(char::is_control)
    {
        return Err(WebServiceError::validation(format!(
            "{field} must contain 1..{maximum} trimmed non-control characters"
        )));
    }
    Ok(())
}

fn validate_tenant_scope_hash(value: &str) -> WebServiceResult<()> {
    if value.len() != 64
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        return Err(WebServiceError::validation(
            "tenantScopeHash must be a lowercase SHA-256 digest",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        validate_create_nginx_config_request, validate_create_server_request,
        validate_tenant_scope_hash, validate_update_nginx_config_request, WebService,
        MAX_NGINX_CONFIG_BYTES,
    };
    use sdkwork_webserver_contract::{
        CreateNginxConfigRequest, CreateServerRequest, UpdateNginxConfigRequest,
        WebAppResourceScope, WebBackendRequestContext,
    };

    #[test]
    fn tenant_scope_hash_is_exact_lowercase_sha256_shape() {
        validate_tenant_scope_hash(&"a".repeat(64)).unwrap();
        for invalid in ["a".repeat(63), "A".repeat(64), "g".repeat(64)] {
            assert!(validate_tenant_scope_hash(&invalid).is_err());
        }
    }

    #[test]
    fn nginx_configuration_requests_are_bounded_and_site_scoped() {
        validate_create_nginx_config_request(&CreateNginxConfigRequest {
            site_id: "site-1".to_owned(),
            config_name: "edge".to_owned(),
            config_type: 1,
            config_content: "server {}".to_owned(),
        })
        .unwrap();
        for request in [
            CreateNginxConfigRequest {
                site_id: String::new(),
                config_name: "edge".to_owned(),
                config_type: 1,
                config_content: "server {}".to_owned(),
            },
            CreateNginxConfigRequest {
                site_id: "site-1".to_owned(),
                config_name: "edge".to_owned(),
                config_type: 0,
                config_content: "server {}".to_owned(),
            },
            CreateNginxConfigRequest {
                site_id: "site-1".to_owned(),
                config_name: "edge".to_owned(),
                config_type: 1,
                config_content: "x".repeat(MAX_NGINX_CONFIG_BYTES + 1),
            },
        ] {
            assert!(validate_create_nginx_config_request(&request).is_err());
        }
        assert!(
            validate_update_nginx_config_request(&UpdateNginxConfigRequest::default()).is_err()
        );
        assert!(
            validate_update_nginx_config_request(&UpdateNginxConfigRequest {
                config_name: None,
                config_content: Some("location / {}".to_owned()),
            })
            .is_ok()
        );
    }

    #[test]
    fn server_registration_rejects_unbounded_hosts_and_invalid_ports() {
        let valid = CreateServerRequest {
            name: "edge-1".to_owned(),
            host: "10.0.0.8".to_owned(),
            tenant_scope_hash: "a".repeat(64),
            ssh_port: 22,
        };
        validate_create_server_request(&valid).unwrap();
        for request in [
            CreateServerRequest {
                ssh_port: 0,
                ..valid.clone()
            },
            CreateServerRequest {
                host: "edge host".to_owned(),
                ..valid.clone()
            },
            CreateServerRequest {
                name: " ".to_owned(),
                ..valid.clone()
            },
        ] {
            assert!(validate_create_server_request(&request).is_err());
        }
    }

    #[test]
    fn backend_application_operations_use_tenant_scope() {
        let context = WebBackendRequestContext {
            tenant_id: Some(42),
            operator_id: Some(7),
            subject_id: Some("7".to_owned()),
            idempotency_key: Some("deployment-create-1".to_owned()),
        };

        let app_context = WebService::backend_app_context(&context).unwrap();

        assert_eq!(app_context.tenant_id, 42);
        assert_eq!(app_context.actor_id, Some(7));
        assert_eq!(
            app_context.idempotency_key.as_deref(),
            Some("deployment-create-1")
        );
        assert_eq!(app_context.resource_scope, WebAppResourceScope::Tenant);
    }
}

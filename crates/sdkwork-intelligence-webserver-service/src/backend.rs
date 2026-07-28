//! Backend-api service surface implementation.

use async_trait::async_trait;
use sdkwork_webserver_contract::{
    CreateCertificateRequest, CreateDeploymentRequest, CreateDomainRequest,
    CreateNginxConfigRequest, CreateServerRequest, CreateSiteRequest, ListNginxConfigsQuery,
    ListSitesQuery, UpdateCertificateRequest, UpdateNginxConfigRequest, UpdateSiteRequest,
    WebAppApi, WebAppRequestContext, WebAppResourceScope, WebBackendApi, WebBackendRequestContext,
    WebServiceError, WebServiceResult,
};

use crate::{AuditLogWrite, WebService};

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
    ) -> WebServiceResult<()> {
        self.repository
            .insert_audit_log(AuditLogWrite {
                tenant_id: Self::require_backend_tenant(context)?,
                organization_id: 0,
                operator_id: context.operator_id.unwrap_or(0),
                action,
                target_type,
                target_id: None,
                target_uuid: Some(target_uuid),
            })
            .await
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
        let _ = self
            .audit_backend_action(
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
        let _ = self
            .audit_backend_action(
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
        validate_tenant_scope_hash(&request.tenant_scope_hash)?;
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
    use super::{validate_tenant_scope_hash, WebService};
    use sdkwork_webserver_contract::{WebAppResourceScope, WebBackendRequestContext};

    #[test]
    fn tenant_scope_hash_is_exact_lowercase_sha256_shape() {
        validate_tenant_scope_hash(&"a".repeat(64)).unwrap();
        for invalid in ["a".repeat(63), "A".repeat(64), "g".repeat(64)] {
            assert!(validate_tenant_scope_hash(&invalid).is_err());
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

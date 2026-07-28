//! App-api service surface implementation.

use async_trait::async_trait;
use sdkwork_webserver_contract::{
    CreateCertificateRequest, CreateDeploymentRequest, CreateDomainRequest,
    CreateEnvVariableRequest, CreateHealthCheckRequest, CreateSiteRequest, ListSitesQuery,
    UpdateSiteRequest, WebAppApi, WebAppRequestContext, WebAppResourceScope, WebServiceResult,
};

use crate::{AuditLogWrite, WebService};

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
            {
                return Err(sdkwork_webserver_contract::WebServiceError::validation(
                    "artifactDriveUri must use drive://spaces/{spaceId}/nodes/{nodeId}",
                ));
            }
        }
        if request.artifact_size.is_some_and(|size| size <= 0) {
            return Err(sdkwork_webserver_contract::WebServiceError::validation(
                "artifactSize must be greater than zero",
            ));
        }
        if let Some(hash) = request.artifact_hash.as_deref() {
            let hash = hash.trim();
            if hash.len() != 64 || !hash.bytes().all(|byte| byte.is_ascii_hexdigit()) {
                return Err(sdkwork_webserver_contract::WebServiceError::validation(
                    "artifactHash must be a SHA-256 hexadecimal digest",
                ));
            }
        }
        Ok(())
    }

    async fn audit_site_action(
        &self,
        context: &WebAppRequestContext,
        action: &str,
        target_uuid: &str,
    ) -> WebServiceResult<()> {
        let operator_id = context.actor_id.unwrap_or(0);
        self.repository
            .insert_audit_log(AuditLogWrite {
                tenant_id: context.tenant_id,
                organization_id: context.organization_id.unwrap_or(0),
                operator_id,
                action,
                target_type: "site",
                target_id: None,
                target_uuid: Some(target_uuid),
            })
            .await
    }
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
        let _ = self
            .audit_site_action(context, "sites.create", &site.id)
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
        let _ = self
            .audit_site_action(context, "sites.update", site_id)
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
        let _ = self
            .audit_site_action(context, "sites.delete", site_id)
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
        let _ = self
            .audit_site_action(context, "sites.activate", site_id)
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
        let _ = self
            .audit_site_action(context, "sites.pause", site_id)
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
            .rollback_deployment(tenant_id, site_id, deployment_id, context.actor_id)
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
        let tenant_id = self.require_site_access(context, site_id).await?;
        self.repository
            .create_health_check(tenant_id, site_id, request)
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::WebService;
    use sdkwork_webserver_contract::CreateDeploymentRequest;

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
}

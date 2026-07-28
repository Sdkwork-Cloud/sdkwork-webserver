use sdkwork_web_core::{
    EnforcePrincipalTenantIsolationPolicy, TenantIsolationPolicy, WebApiSurface, WebFrameworkError,
    WebLoginScope, WebRequestContext,
};

#[derive(Clone, Copy, Debug, Default)]
pub struct WebServerTenantIsolationPolicy;

impl TenantIsolationPolicy for WebServerTenantIsolationPolicy {
    fn enforce(
        &self,
        context: &WebRequestContext,
        operation_id: Option<&str>,
    ) -> Result<(), WebFrameworkError> {
        EnforcePrincipalTenantIsolationPolicy.enforce(context, operation_id)?;
        let principal = context.require_principal()?;
        principal
            .tenant_id()
            .parse::<i64>()
            .ok()
            .filter(|tenant_id| *tenant_id > 0)
            .ok_or_else(|| WebFrameworkError::forbidden("invalid Web tenant context"))?;
        if principal.app_id().trim().is_empty() {
            return Err(WebFrameworkError::forbidden(
                "invalid Web application context",
            ));
        }
        if context.api_surface == WebApiSurface::BackendApi
            && principal.login_scope() == WebLoginScope::Organization
        {
            principal
                .organization_id()
                .and_then(|value| value.parse::<i64>().ok())
                .filter(|organization_id| *organization_id > 0)
                .ok_or_else(|| WebFrameworkError::forbidden("invalid Web organization context"))?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::WebServerTenantIsolationPolicy;
    use sdkwork_web_core::{
        TenantIsolationPolicy, WebApiSurface, WebAuthLevel, WebAuthMode, WebDeploymentMode,
        WebEnvironment, WebLoginScope, WebRequestContext, WebRequestPrincipal, WebSubjectType,
        WebTransportFacts,
    };

    #[test]
    fn rejects_non_numeric_and_zero_tenant_ids() {
        for tenant_id in ["", "0", "-1", "tenant-1"] {
            let context = context(tenant_id, WebLoginScope::Organization, Some("9"));
            assert!(WebServerTenantIsolationPolicy
                .enforce(&context, Some("applications.list"))
                .is_err());
        }
    }

    #[test]
    fn requires_positive_organization_for_backend_scope() {
        for organization_id in [None, Some(""), Some("0"), Some("organization-1")] {
            let context = context("42", WebLoginScope::Organization, organization_id);
            assert!(WebServerTenantIsolationPolicy
                .enforce(&context, Some("applications.list"))
                .is_err());
        }
        let context = context("42", WebLoginScope::Organization, Some("9"));
        assert!(WebServerTenantIsolationPolicy
            .enforce(&context, Some("applications.list"))
            .is_ok());
    }

    fn context(
        tenant_id: &str,
        login_scope: WebLoginScope,
        organization_id: Option<&str>,
    ) -> WebRequestContext {
        let principal = WebRequestPrincipal::builder()
            .tenant_id(tenant_id)
            .organization_id(organization_id.map(str::to_owned))
            .login_scope(login_scope)
            .user_id("7")
            .app_id("web")
            .environment(WebEnvironment::Dev)
            .deployment_mode(WebDeploymentMode::Local)
            .auth_level(WebAuthLevel::Password)
            .subject_type(WebSubjectType::User)
            .build();
        WebRequestContext {
            request_id: sdkwork_web_core::ServerRequestId("request-1".to_owned()),
            api_surface: WebApiSurface::BackendApi,
            auth_mode: WebAuthMode::DualToken,
            transport: WebTransportFacts {
                path: "/backend/v3/api/applications".to_owned(),
                method: "GET".to_owned(),
                auth_token_present: true,
                access_token_present: true,
                api_key_present: false,
                ingress_token_present: false,
                oauth_bearer_present: false,
                agent_token_present: false,
            },
            principal: Some(principal),
            locale: None,
            client_kind: None,
            operation: None,
            trace_id: None,
            idempotency_key: None,
        }
    }
}

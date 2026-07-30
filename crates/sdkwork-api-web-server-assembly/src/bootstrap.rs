//! Business-only gateway bootstrap for sdkwork-web-server.

use axum::{Extension, Router};
use sdkwork_intelligence_webserver_repository_sqlx::bootstrap_web_runtime_from_env;
use sdkwork_intelligence_webserver_service::WebService;
use sdkwork_routes_webserver_app_api::{
    gateway_mount as mount_app, gateway_route_manifest as app_route_manifest,
    web_app_domain_context_injectors,
};
use sdkwork_routes_webserver_backend_api::{
    gateway_mount as mount_backend, gateway_route_manifest as backend_route_manifest,
    web_backend_domain_context_injectors,
};
use sdkwork_routes_webserver_internal_api::{
    gateway_mount as mount_internal, gateway_route_manifest as internal_route_manifest,
    web_internal_domain_context_injectors,
};
use sdkwork_web_bootstrap::{ReadinessCheck, ReadinessFuture};
use sdkwork_web_core::{
    AuditEmitter, DomainContextInjector, HttpRoute, HttpRouteManifest, SecurityEventEmitter,
};
use sdkwork_webserver_contract::MachineCredentialAuthenticator;
use std::sync::Arc;

use crate::framework_observability::{WebFrameworkAuditEmitter, WebFrameworkSecurityEventEmitter};

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
enum ApiAssemblyProfile {
    #[default]
    Standalone,
    CloudGateway,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
#[non_exhaustive]
pub struct ApiAssemblyContext {
    profile: ApiAssemblyProfile,
}

impl ApiAssemblyContext {
    /// Selects the Web Server service-to-service surface for the platform cloud gateway.
    /// Standalone Site, certificate, Nginx, and server management routes remain excluded.
    pub const fn cloud_gateway() -> Self {
        Self {
            profile: ApiAssemblyProfile::CloudGateway,
        }
    }

    const fn includes_standalone_control_plane(self) -> bool {
        matches!(self.profile, ApiAssemblyProfile::Standalone)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ApiAssemblyError {
    #[error("Web Server API assembly initialization failed: {detail}")]
    Initialization { detail: String },
    #[error("Web Server database migration failed: {detail}")]
    DatabaseMigration { detail: String },
}

impl ApiAssemblyError {
    pub const SERVICE_UNAVAILABLE_CODE: i32 = 50301;

    pub fn code(&self) -> i32 {
        Self::SERVICE_UNAVAILABLE_CODE
    }
}

pub struct ApiAssembly {
    pub router: Router,
    pub route_manifest: HttpRouteManifest,
    pub openapi: serde_json::Value,
    pub permission_catalog: Vec<&'static str>,
    pub domain_context_injectors: Vec<Arc<dyn DomainContextInjector>>,
    pub readiness_check: Arc<dyn ReadinessCheck>,
    pub machine_credential_authenticator: Arc<dyn MachineCredentialAuthenticator>,
    pub audit_emitter: Arc<dyn AuditEmitter>,
    pub security_event_emitter: Arc<dyn SecurityEventEmitter>,
}

struct WebServiceReadinessCheck {
    service: Arc<WebService>,
}

impl ReadinessCheck for WebServiceReadinessCheck {
    fn check(&self) -> ReadinessFuture<'_> {
        let service = self.service.clone();
        Box::pin(async move {
            service
                .ready_check()
                .await
                .map_err(|error| error.to_string())
        })
    }
}

pub async fn assemble_business_routes(
    context: ApiAssemblyContext,
) -> Result<ApiAssembly, ApiAssemblyError> {
    let runtime = bootstrap_web_runtime_from_env()
        .await
        .map_err(|detail| ApiAssemblyError::Initialization { detail })?;
    let service = Arc::new(runtime.service);
    let audit_emitter: Arc<dyn AuditEmitter> =
        Arc::new(WebFrameworkAuditEmitter::new(service.clone()));
    let security_event_emitter: Arc<dyn SecurityEventEmitter> =
        Arc::new(WebFrameworkSecurityEventEmitter::new(service.clone()));
    let route_manifest = selected_route_manifest(context);
    let mut router = Router::new();
    let mut domain_context_injectors = Vec::new();
    if context.includes_standalone_control_plane() {
        router = router
            .merge(mount_app(service.clone()))
            .merge(mount_backend(service.clone()));
        domain_context_injectors.extend(web_app_domain_context_injectors());
        domain_context_injectors.extend(web_backend_domain_context_injectors());
    }
    router = router.merge(mount_internal(service.clone()));
    domain_context_injectors.extend(web_internal_domain_context_injectors());
    let permission_catalog = permission_catalog(route_manifest.routes());
    let openapi = sdkwork_web_contract::build_openapi_document(
        "SDKWork Web Server API",
        route_manifest.routes(),
    );
    Ok(ApiAssembly {
        router: router.layer(Extension(service.clone())),
        route_manifest,
        openapi,
        permission_catalog,
        domain_context_injectors,
        readiness_check: Arc::new(WebServiceReadinessCheck {
            service: service.clone(),
        }),
        machine_credential_authenticator: service,
        audit_emitter,
        security_event_emitter,
    })
}

pub async fn assemble_api_router(
    context: ApiAssemblyContext,
) -> Result<ApiAssembly, ApiAssemblyError> {
    assemble_business_routes(context).await
}

pub async fn migrate_database_from_env() -> Result<(), ApiAssemblyError> {
    std::env::set_var("SDKWORK_DATABASE_AUTO_MIGRATE", "true");
    sdkwork_webserver_database_host::bootstrap_web_database_from_env()
        .await
        .map(|_| ())
        .map_err(|detail| ApiAssemblyError::DatabaseMigration { detail })
}

fn permission_catalog(routes: &[HttpRoute]) -> Vec<&'static str> {
    let mut permissions = std::collections::BTreeSet::new();
    for route in routes {
        if let Some(permission) = route.required_permission {
            permissions.insert(permission);
        }
        if let Some(alternate_permissions) = route.alternate_permissions {
            permissions.extend(alternate_permissions.iter().copied());
        }
    }
    permissions.into_iter().collect()
}

fn selected_route_manifest(context: ApiAssemblyContext) -> HttpRouteManifest {
    let mut routes = Vec::new();
    if context.includes_standalone_control_plane() {
        routes.extend_from_slice(app_route_manifest().routes());
        routes.extend_from_slice(backend_route_manifest().routes());
    }
    routes.extend_from_slice(internal_route_manifest().routes());
    HttpRouteManifest::from_owned_routes(routes)
}

#[cfg(test)]
mod tests {
    use super::{selected_route_manifest, ApiAssemblyContext};

    #[test]
    fn cloud_gateway_profile_exposes_only_web_internal_routes() {
        let manifest = selected_route_manifest(ApiAssemblyContext::cloud_gateway());

        assert!(!manifest.routes().is_empty());
        assert!(manifest
            .routes()
            .iter()
            .all(|route| route.path.starts_with("/internal/v3/api/web/")));
    }

    #[test]
    fn standalone_profile_retains_control_plane_routes() {
        let manifest = selected_route_manifest(ApiAssemblyContext::default());

        assert!(manifest
            .routes()
            .iter()
            .any(|route| route.path.starts_with("/app/v3/api/sites")));
        assert!(manifest
            .routes()
            .iter()
            .any(|route| route.path.starts_with("/backend/v3/api/nginx")));
        assert!(manifest
            .routes()
            .iter()
            .any(|route| route.path.starts_with("/internal/v3/api/web/")));
    }
}

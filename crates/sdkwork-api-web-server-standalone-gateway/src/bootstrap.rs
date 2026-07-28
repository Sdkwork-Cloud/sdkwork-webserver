use axum::Router;
use sdkwork_iam_web_adapter::{iam_web_request_context_resolver_from_env, IamAuthorizationPolicy};
use sdkwork_web_axum::{with_web_request_context, WebFrameworkLayer};
use sdkwork_web_bootstrap::{
    mount_openapi_json, service_router, CompositeReadinessCheck, OpenApiMount, ServiceRouterConfig,
};
use sdkwork_web_core::{HttpMetricsRegistry, WebRequestContextProfile};
use sdkwork_webserver_http_host::{
    web_framework_runtime_policy_from_env, with_problem_correlation,
    MachineCredentialResolverDecorator,
};
use std::sync::Arc;
use tracing::info;

use crate::{app_shell::PcAppShellConfig, profile::assemble_standalone_profile};

pub async fn build_router() -> Result<Router, String> {
    let app_shell = PcAppShellConfig::from_env()?;
    let profile = assemble_standalone_profile()
        .await
        .map_err(|error| error.to_string())?;
    let metrics = HttpMetricsRegistry::new();
    let resolver = MachineCredentialResolverDecorator::new(
        iam_web_request_context_resolver_from_env().await,
        profile.machine_authenticator.clone(),
    );
    let (environment, security_policy) = web_framework_runtime_policy_from_env();
    let request_profile = WebRequestContextProfile {
        environment,
        ..WebRequestContextProfile::default()
    };
    profile
        .route_manifest
        .validate_route_auth_for_surfaces(&request_profile)
        .map_err(|error| format!("standalone route auth validation failed: {error}"))?;
    let mut framework = WebFrameworkLayer::new(resolver)
        .with_profile(request_profile)
        .with_security_policy(security_policy)
        .with_authorization_policy(Arc::new(IamAuthorizationPolicy::new(
            profile.route_manifest.clone(),
        )))
        .with_route_manifest(profile.route_manifest.clone())
        .with_metrics(metrics.clone());
    for injector in profile.domain_context_injectors {
        framework = framework.with_domain_injector(injector);
    }
    let protected = with_web_request_context(with_problem_correlation(profile.router), framework);
    let protected = mount_openapi_json(
        protected,
        &[OpenApiMount {
            path: "/openapi.json",
            document: Arc::new(profile.openapi),
        }],
    );
    info!(
        route_count = profile.route_manifest.routes().len(),
        permission_count = profile.permission_catalog.len(),
        "assembled Web Server standalone API profile"
    );
    let readiness_check = match app_shell.as_ref() {
        Some(app_shell) => Arc::new(CompositeReadinessCheck::new(vec![
            profile.readiness_check,
            app_shell.readiness_check(),
        ])) as Arc<dyn sdkwork_web_bootstrap::ReadinessCheck>,
        None => profile.readiness_check,
    };
    let router = service_router(
        protected,
        ServiceRouterConfig::default()
            .with_readiness_check(readiness_check)
            .with_metrics(metrics),
    );
    Ok(match app_shell {
        Some(config) => config.mount(router),
        None => router,
    })
}

pub async fn run_database_migrate_only() -> Result<(), String> {
    sdkwork_api_web_server_assembly::migrate_database_from_env()
        .await
        .map_err(|error| error.to_string())?;
    info!("Web database migration completed");
    Ok(())
}

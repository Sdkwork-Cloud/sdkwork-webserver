use std::sync::Arc;

use axum::Router;
use sdkwork_iam_web_adapter::{IamAuthorizationPolicy, IamWebRequestContextResolver};
use sdkwork_routes_webserver_common::{
    web_auth_mode_from_env, web_framework_runtime_policy_from_env, with_problem_correlation,
    ProductionFailClosedResolver, WebAuthMode, WebServerTenantIsolationPolicy,
};
use sdkwork_web_axum::{with_web_request_context, WebFrameworkLayer};
use sdkwork_web_bootstrap::WebFrameworkBuilder;
use sdkwork_web_core::{
    DefaultWebRequestContextResolver, DomainContextInjector, HttpMetricsRegistry,
    WebRequestContext, WebRequestContextProfile,
};
use sdkwork_webserver_contract::{WebAppRequestContext, WebAppResourceScope};

use crate::http_route_manifest::app_route_manifest;
use crate::paths;

pub fn web_app_api_public_path_prefixes() -> Vec<String> {
    Vec::new()
}

pub fn web_app_api_prefixes() -> Vec<String> {
    vec![paths::PREFIX.to_owned()]
}

#[derive(Clone, Default)]
struct WebAppContextInjector;

impl DomainContextInjector for WebAppContextInjector {
    fn inject(&self, request: &mut axum::extract::Request, context: &WebRequestContext) {
        if let Some(app_context) = web_app_context_from_web_request(context) {
            request.extensions_mut().insert(app_context);
        }
    }
}

pub fn domain_context_injectors() -> Vec<Arc<dyn DomainContextInjector>> {
    vec![Arc::new(WebAppContextInjector)]
}

fn web_app_context_from_web_request(context: &WebRequestContext) -> Option<WebAppRequestContext> {
    let principal = context.principal.as_ref()?;
    let tenant_id = principal.tenant_id().parse().ok()?;
    let actor_id = principal.user_id().parse().ok();
    let organization_id = principal
        .organization_id()
        .and_then(|value| value.parse().ok());
    let session_id = principal.session_id().map(str::to_owned);
    Some(WebAppRequestContext {
        tenant_id,
        actor_id,
        organization_id,
        session_id,
        idempotency_key: context.idempotency_key().map(str::to_owned),
        resource_scope: WebAppResourceScope::Owner,
    })
}

pub fn wrap_router_with_web_framework(
    resolver: DefaultWebRequestContextResolver,
    router: Router,
) -> Router {
    with_web_request_context(
        with_problem_correlation(router),
        build_web_app_api_framework_layer(resolver, None),
    )
}

pub fn wrap_router_with_web_framework_and_metrics(
    resolver: DefaultWebRequestContextResolver,
    router: Router,
    metrics: Arc<HttpMetricsRegistry>,
) -> Router {
    with_web_request_context(
        with_problem_correlation(router),
        build_web_app_api_framework_layer(resolver, Some(metrics)),
    )
}

pub fn wrap_router_with_iam_database_web_framework(
    resolver: IamWebRequestContextResolver,
    router: Router,
) -> Router {
    with_web_request_context(
        with_problem_correlation(router),
        build_web_app_api_framework_layer(resolver, None),
    )
}

fn build_web_app_api_framework_layer<R>(
    resolver: R,
    metrics: Option<Arc<HttpMetricsRegistry>>,
) -> WebFrameworkLayer<R>
where
    R: sdkwork_web_core::WebRequestContextResolver + Clone,
{
    let route_manifest = app_route_manifest();
    let (environment, security_policy) = web_framework_runtime_policy_from_env();
    route_manifest
        .validate_public_path_prefixes(&web_app_api_public_path_prefixes())
        .expect("Web app-api public prefixes must not cover protected manifest routes");

    let mut builder = WebFrameworkBuilder::new(resolver)
        .profile(WebRequestContextProfile {
            app_api_prefix: paths::PREFIX.to_owned(),
            public_path_prefixes: web_app_api_public_path_prefixes(),
            environment,
            ..WebRequestContextProfile::default()
        })
        .security_policy(security_policy)
        .route_manifest(route_manifest.clone())
        .authorization_policy(Arc::new(IamAuthorizationPolicy::new(route_manifest)))
        .tenant_isolation_policy(Arc::new(WebServerTenantIsolationPolicy))
        .domain_injector(Arc::new(WebAppContextInjector));
    if let Some(metrics) = metrics {
        builder = builder.metrics_registry(metrics);
    }
    builder.build().into_layer()
}

pub async fn wrap_router_with_web_framework_from_env(router: Router) -> Router {
    wrap_router_with_web_framework_from_env_and_optional_metrics(router, None).await
}

pub async fn wrap_router_with_web_framework_from_env_and_metrics(
    router: Router,
    metrics: Arc<HttpMetricsRegistry>,
) -> Router {
    wrap_router_with_web_framework_from_env_and_optional_metrics(router, Some(metrics)).await
}

async fn wrap_router_with_web_framework_from_env_and_optional_metrics(
    router: Router,
    metrics: Option<Arc<HttpMetricsRegistry>>,
) -> Router {
    match web_auth_mode_from_env().await {
        WebAuthMode::DevInline => with_web_request_context(
            with_problem_correlation(router),
            build_web_app_api_framework_layer(DefaultWebRequestContextResolver::default(), metrics),
        ),
        WebAuthMode::ProductionFailClosed => with_web_request_context(
            with_problem_correlation(router),
            build_web_app_api_framework_layer(ProductionFailClosedResolver, metrics),
        ),
        WebAuthMode::IamDatabase(resolver) => with_web_request_context(
            with_problem_correlation(router),
            build_web_app_api_framework_layer(resolver, metrics),
        ),
    }
}

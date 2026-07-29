use axum::{
    extract::{Path, Query, State},
    response::Response,
    routing::{get, post},
    Extension, Json, Router,
};
use sdkwork_webserver_contract::{
    CreateCertificateRequest, CreateDeploymentRequest, CreateDomainRequest,
    CreateNginxConfigRequest, CreateServerRequest, CreateSiteRequest, CreateSourceVersionRequest,
    ImportGitSourceVersionRequest, ListNginxConfigsQuery, ListSitesQuery,
    UpdateCertificateRequest, UpdateNginxConfigRequest, UpdateSiteRequest, WebBackendApi,
    WebBackendRequestContext,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::{agent_routes, auth::require_backend_context, paths};
use sdkwork_routes_webserver_common::{
    created_resource, no_content, ok_audit_log_page, ok_certificate_distribution_page,
    ok_certificate_page, ok_deployment_page, ok_domain_page, ok_nginx_config_page, ok_resource,
    ok_server_page, ok_site_page, ok_source_version_page, WebApiError,
};

#[derive(Clone)]
struct BackendState {
    api: Arc<dyn WebBackendApi>,
}

pub fn build_router_with_backend_api<A>(api: A) -> Router
where
    A: WebBackendApi + 'static,
{
    build_router_with_shared_backend_api(Arc::new(api))
}

pub fn build_router_with_shared_backend_api(api: Arc<dyn WebBackendApi>) -> Router {
    Router::new()
        .route(
            paths::APPLICATIONS,
            get(list_applications).post(create_application),
        )
        .route(
            paths::APPLICATION,
            get(retrieve_application)
                .patch(update_application)
                .delete(delete_application),
        )
        .route(paths::APPLICATION_ACTIVATE, post(activate_application))
        .route(paths::APPLICATION_PAUSE, post(pause_application))
        .route(
            paths::APPLICATION_DOMAINS,
            get(list_application_domains).post(create_application_domain),
        )
        .route(
            paths::APPLICATION_DOMAIN,
            axum::routing::delete(delete_application_domain),
        )
        .route(
            paths::APPLICATION_DOMAIN_VERIFY,
            post(verify_application_domain),
        )
        .route(
            paths::APPLICATION_SOURCE_VERSIONS,
            get(list_application_source_versions).post(create_application_source_version),
        )
        .route(
            paths::APPLICATION_SOURCE_VERSION_IMPORT_GIT,
            post(import_application_git_source_version),
        )
        .route(
            paths::APPLICATION_SOURCE_VERSION,
            get(retrieve_application_source_version),
        )
        .route(
            paths::APPLICATION_DEPLOYMENTS,
            get(list_application_deployments).post(create_application_deployment),
        )
        .route(
            paths::APPLICATION_DEPLOYMENT_ROLLBACK,
            post(rollback_application_deployment),
        )
        .route(
            paths::CERTIFICATES,
            get(list_managed_certificates).post(create_managed_certificate),
        )
        .route(
            paths::CERTIFICATE,
            axum::routing::put(update_managed_certificate),
        )
        .route(paths::CERTIFICATE_RENEW, post(renew_managed_certificate))
        .route(
            paths::CERTIFICATE_DISTRIBUTION,
            get(list_certificate_distribution),
        )
        .route(
            paths::NGINX_CONFIGS,
            get(list_nginx_configs).post(create_nginx_config),
        )
        .route(
            paths::NGINX_CONFIG,
            get(retrieve_nginx_config).put(update_nginx_config),
        )
        .route(paths::NGINX_CONFIG_VALIDATE, post(validate_nginx_config))
        .route(paths::NGINX_CONFIG_DEPLOY, post(deploy_nginx_config))
        .route(paths::NGINX_RELOAD, post(reload_nginx))
        .route(paths::NGINX_STATUS, get(retrieve_nginx_status))
        .route(paths::SERVERS, get(list_servers).post(create_server))
        .route(paths::AUDIT_LOGS, get(list_audit_logs))
        // V3 Agent routes (C8-C9) retain their wire header and authenticate through
        // WebFrameworkLayer + MachineCredentialResolverDecorator. Handlers retrieve
        // Arc<WebService> and WebBackendRequestContext from Extension layers.
        .route(paths::AGENT_HEARTBEAT, post(agent_routes::agent_heartbeat))
        .route(paths::AGENT_SYNC, get(agent_routes::agent_sync))
        .with_state(BackendState { api })
}

#[derive(Debug, Deserialize)]
struct PageQuery {
    #[serde(default = "default_page")]
    page: i32,
    #[serde(default = "default_page_size")]
    page_size: i32,
}

#[derive(Debug, Deserialize)]
struct DeploymentPageQuery {
    #[serde(default = "default_page")]
    page: i32,
    #[serde(default = "default_page_size")]
    page_size: i32,
    status: Option<i32>,
}

fn default_page() -> i32 {
    1
}

fn default_page_size() -> i32 {
    20
}

async fn list_applications(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Query(query): Query<ListSitesQuery>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_site_page(state.api.list_applications(&context, &query).await)
}

async fn create_application(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Json(request): Json<CreateSiteRequest>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    created_resource(state.api.create_application(&context, &request).await)
}

async fn retrieve_application(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(application_id): Path<String>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(
        state
            .api
            .retrieve_application(&context, &application_id)
            .await,
    )
}

async fn update_application(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(application_id): Path<String>,
    Json(request): Json<UpdateSiteRequest>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(
        state
            .api
            .update_application(&context, &application_id, &request)
            .await,
    )
}

async fn delete_application(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(application_id): Path<String>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    no_content(
        state
            .api
            .delete_application(&context, &application_id)
            .await,
    )
}

async fn activate_application(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(application_id): Path<String>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(
        state
            .api
            .activate_application(&context, &application_id)
            .await,
    )
}

async fn pause_application(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(application_id): Path<String>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(state.api.pause_application(&context, &application_id).await)
}

async fn list_application_domains(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(application_id): Path<String>,
    Query(query): Query<PageQuery>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_domain_page(
        state
            .api
            .list_application_domains(&context, &application_id, query.page, query.page_size)
            .await,
        query.page,
        query.page_size,
    )
}

async fn create_application_domain(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(application_id): Path<String>,
    Json(request): Json<CreateDomainRequest>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    created_resource(
        state
            .api
            .create_application_domain(&context, &application_id, &request)
            .await,
    )
}

async fn verify_application_domain(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path((application_id, domain_id)): Path<(String, String)>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(
        state
            .api
            .verify_application_domain(&context, &application_id, &domain_id)
            .await,
    )
}

async fn delete_application_domain(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path((application_id, domain_id)): Path<(String, String)>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    no_content(
        state
            .api
            .delete_application_domain(&context, &application_id, &domain_id)
            .await,
    )
}

async fn list_application_source_versions(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(application_id): Path<String>,
    Query(query): Query<PageQuery>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_source_version_page(
        state
            .api
            .list_application_source_versions(
                &context,
                &application_id,
                query.page,
                query.page_size,
            )
            .await,
    )
}

async fn create_application_source_version(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(application_id): Path<String>,
    Json(request): Json<CreateSourceVersionRequest>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    created_resource(
        state
            .api
            .create_application_source_version(&context, &application_id, &request)
            .await,
    )
}

async fn import_application_git_source_version(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(application_id): Path<String>,
    Json(request): Json<ImportGitSourceVersionRequest>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    created_resource(
        state
            .api
            .import_application_git_source_version(&context, &application_id, &request)
            .await,
    )
}

async fn retrieve_application_source_version(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path((application_id, source_version_id)): Path<(String, String)>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(
        state
            .api
            .retrieve_application_source_version(
                &context,
                &application_id,
                &source_version_id,
            )
            .await,
    )
}

async fn list_application_deployments(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(application_id): Path<String>,
    Query(query): Query<DeploymentPageQuery>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_deployment_page(
        state
            .api
            .list_application_deployments(
                &context,
                &application_id,
                query.page,
                query.page_size,
                query.status,
            )
            .await,
    )
}

async fn create_application_deployment(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(application_id): Path<String>,
    Json(request): Json<CreateDeploymentRequest>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    created_resource(
        state
            .api
            .create_application_deployment(&context, &application_id, &request)
            .await,
    )
}

async fn rollback_application_deployment(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path((application_id, deployment_id)): Path<(String, String)>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(
        state
            .api
            .rollback_application_deployment(&context, &application_id, &deployment_id)
            .await,
    )
}

async fn list_managed_certificates(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Query(query): Query<PageQuery>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_certificate_page(
        state
            .api
            .list_managed_certificates(&context, query.page, query.page_size)
            .await,
        query.page,
        query.page_size,
    )
}

async fn create_managed_certificate(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Json(request): Json<CreateCertificateRequest>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    created_resource(
        state
            .api
            .create_managed_certificate(&context, &request)
            .await,
    )
}

async fn update_managed_certificate(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(certificate_id): Path<String>,
    Json(request): Json<UpdateCertificateRequest>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(
        state
            .api
            .update_managed_certificate(&context, &certificate_id, &request)
            .await,
    )
}

async fn renew_managed_certificate(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(certificate_id): Path<String>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(
        state
            .api
            .renew_managed_certificate(&context, &certificate_id)
            .await,
    )
}

async fn list_certificate_distribution(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Query(query): Query<PageQuery>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_certificate_distribution_page(
        state
            .api
            .list_certificate_distribution(&context, query.page, query.page_size)
            .await,
    )
}

async fn list_nginx_configs(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Query(query): Query<ListNginxConfigsQuery>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_nginx_config_page(state.api.list_nginx_configs(&context, &query).await)
}

async fn create_nginx_config(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Json(request): Json<CreateNginxConfigRequest>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    created_resource(state.api.create_nginx_config(&context, &request).await)
}

async fn retrieve_nginx_config(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(config_id): Path<String>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(state.api.retrieve_nginx_config(&context, &config_id).await)
}

async fn update_nginx_config(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(config_id): Path<String>,
    Json(request): Json<UpdateNginxConfigRequest>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(
        state
            .api
            .update_nginx_config(&context, &config_id, &request)
            .await,
    )
}

async fn validate_nginx_config(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(config_id): Path<String>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(state.api.validate_nginx_config(&context, &config_id).await)
}

async fn deploy_nginx_config(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Path(config_id): Path<String>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(state.api.web_nginx_config(&context, &config_id).await)
}

async fn reload_nginx(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(state.api.reload_nginx(&context).await)
}

async fn retrieve_nginx_status(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_resource(state.api.retrieve_nginx_status(&context).await)
}

async fn list_servers(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Query(query): Query<PageQuery>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_server_page(
        state
            .api
            .list_servers(&context, query.page, query.page_size)
            .await,
        query.page,
        query.page_size,
    )
}

async fn create_server(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Json(request): Json<CreateServerRequest>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    created_resource(state.api.create_server(&context, &request).await)
}

async fn list_audit_logs(
    State(state): State<BackendState>,
    context: Option<Extension<WebBackendRequestContext>>,
    Query(query): Query<PageQuery>,
) -> Result<Response, WebApiError> {
    let context = require_backend_context(context)?;
    ok_audit_log_page(
        state
            .api
            .list_audit_logs(&context, query.page, query.page_size)
            .await,
    )
}

use async_trait::async_trait;
use sdkwork_webserver_contract::{SourceVersionConfigSnapshot, WebServiceError, WebServiceResult};

#[derive(Clone, Debug)]
pub struct GitSourceImportRequest {
    pub tenant_id: i64,
    pub organization_id: Option<i64>,
    pub actor_id: Option<i64>,
    pub application_id: String,
    pub version_tag: String,
    pub repository_url: String,
    pub git_ref: Option<String>,
}

#[derive(Clone, Debug)]
pub struct ImportedApplicationSource {
    pub artifact_drive_uri: String,
    pub artifact_size: i64,
    pub artifact_hash: String,
    pub commit_hash: String,
    pub config_snapshot: SourceVersionConfigSnapshot,
}

#[async_trait]
pub trait ApplicationSourceImporter: Send + Sync {
    async fn import_git(
        &self,
        request: &GitSourceImportRequest,
    ) -> WebServiceResult<ImportedApplicationSource>;
}

#[derive(Default)]
pub(crate) struct UnavailableApplicationSourceImporter;

#[async_trait]
impl ApplicationSourceImporter for UnavailableApplicationSourceImporter {
    async fn import_git(
        &self,
        _request: &GitSourceImportRequest,
    ) -> WebServiceResult<ImportedApplicationSource> {
        Err(WebServiceError::Internal(
            "Git source import is unavailable in this runtime".to_string(),
        ))
    }
}

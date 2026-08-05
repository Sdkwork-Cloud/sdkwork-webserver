use std::sync::Arc;

use async_trait::async_trait;
use sdkwork_drive_internal_sdk::{
    api::DriveInternalPublishingApi,
    http::BinaryResponseStream,
    models::{DriveResourceResolution, ResolveDriveResourceRequest, WebsiteRoot},
    SdkworkError,
};
use sdkwork_webserver_contract::provider::{
    WebsiteProviderError, WebsiteProviderErrorKind, WebsiteProviderResult,
};

/// Bounded chunk stream over immutable Drive content. Implementations must
/// yield one transport chunk at a time and never materialize the whole
/// object in memory.
#[async_trait]
pub trait DriveContentChunkStream: Send {
    async fn next_chunk(&mut self) -> Result<Option<Vec<u8>>, SdkworkError>;
}

/// Adapter that forwards the generated SDK's `BinaryResponseStream` chunk by
/// chunk, preserving its byte budget enforcement.
pub(crate) struct SdkBinaryChunkStream {
    source: Option<BinaryResponseStream>,
}

impl SdkBinaryChunkStream {
    pub(crate) fn new(source: BinaryResponseStream) -> Self {
        Self {
            source: Some(source),
        }
    }
}

#[async_trait]
impl DriveContentChunkStream for SdkBinaryChunkStream {
    async fn next_chunk(&mut self) -> Result<Option<Vec<u8>>, SdkworkError> {
        let Some(source) = self.source.as_mut() else {
            return Ok(None);
        };
        let chunk = source.next_chunk().await?;
        if chunk.is_none() {
            self.source = None;
        }
        Ok(chunk)
    }
}

#[async_trait]
pub trait DriveWebsiteSdkClient: Send + Sync {
    async fn retrieve_website_root(
        &self,
        website_root_uuid: &str,
    ) -> Result<WebsiteRoot, SdkworkError>;

    async fn resolve_resource(
        &self,
        request: &ResolveDriveResourceRequest,
    ) -> Result<DriveResourceResolution, SdkworkError>;

    #[allow(clippy::too_many_arguments)]
    async fn retrieve_content(
        &self,
        node_version_id: &str,
        scope_type: &str,
        scope_uuid: &str,
        relative_path: &str,
        pinned_generation: Option<&str>,
        range: Option<&str>,
        if_match: Option<&str>,
        if_none_match: Option<&str>,
        if_range: Option<&str>,
        if_modified_since: Option<&str>,
        if_unmodified_since: Option<&str>,
    ) -> Result<Vec<u8>, SdkworkError>;

    /// Streaming variant of [`DriveWebsiteSdkClient::retrieve_content`]:
    /// yields the immutable object in bounded transport chunks without
    /// materializing the whole payload in memory.
    #[allow(clippy::too_many_arguments)]
    async fn retrieve_content_stream(
        &self,
        node_version_id: &str,
        scope_type: &str,
        scope_uuid: &str,
        relative_path: &str,
        pinned_generation: Option<&str>,
        range: Option<&str>,
        if_match: Option<&str>,
        if_none_match: Option<&str>,
        if_range: Option<&str>,
        if_modified_since: Option<&str>,
        if_unmodified_since: Option<&str>,
    ) -> Result<Box<dyn DriveContentChunkStream>, SdkworkError>;
}

#[async_trait]
impl DriveWebsiteSdkClient for DriveInternalPublishingApi {
    async fn retrieve_website_root(
        &self,
        website_root_uuid: &str,
    ) -> Result<WebsiteRoot, SdkworkError> {
        self.website_roots_retrieve(website_root_uuid).await
    }

    async fn resolve_resource(
        &self,
        request: &ResolveDriveResourceRequest,
    ) -> Result<DriveResourceResolution, SdkworkError> {
        self.drive_resources_resolve(request).await
    }

    async fn retrieve_content(
        &self,
        node_version_id: &str,
        scope_type: &str,
        scope_uuid: &str,
        relative_path: &str,
        pinned_generation: Option<&str>,
        range: Option<&str>,
        if_match: Option<&str>,
        if_none_match: Option<&str>,
        if_range: Option<&str>,
        if_modified_since: Option<&str>,
        if_unmodified_since: Option<&str>,
    ) -> Result<Vec<u8>, SdkworkError> {
        self.drive_resource_content_retrieve(
            node_version_id,
            scope_type,
            scope_uuid,
            relative_path,
            pinned_generation,
            range,
            if_match,
            if_none_match,
            if_range,
            if_modified_since,
            if_unmodified_since,
        )
        .await
    }

    async fn retrieve_content_stream(
        &self,
        node_version_id: &str,
        scope_type: &str,
        scope_uuid: &str,
        relative_path: &str,
        pinned_generation: Option<&str>,
        range: Option<&str>,
        if_match: Option<&str>,
        if_none_match: Option<&str>,
        if_range: Option<&str>,
        if_modified_since: Option<&str>,
        if_unmodified_since: Option<&str>,
    ) -> Result<Box<dyn DriveContentChunkStream>, SdkworkError> {
        let stream = self
            .drive_resource_content_retrieve_stream(
                node_version_id,
                scope_type,
                scope_uuid,
                relative_path,
                pinned_generation,
                range,
                if_match,
                if_none_match,
                if_range,
                if_modified_since,
                if_unmodified_since,
            )
            .await?;
        Ok(Box::new(SdkBinaryChunkStream::new(stream)))
    }
}

pub trait DriveWebsiteSdkClientResolver: Send + Sync {
    fn resolve(
        &self,
        tenant_scope_hash: &str,
    ) -> WebsiteProviderResult<Arc<dyn DriveWebsiteSdkClient>>;
}

pub struct FixedDriveWebsiteSdkClientResolver {
    tenant_scope_hash: String,
    client: Arc<dyn DriveWebsiteSdkClient>,
}

impl FixedDriveWebsiteSdkClientResolver {
    pub fn new(
        tenant_scope_hash: impl Into<String>,
        client: Arc<dyn DriveWebsiteSdkClient>,
    ) -> Result<Self, String> {
        let tenant_scope_hash = tenant_scope_hash.into();
        if tenant_scope_hash.is_empty()
            || tenant_scope_hash.len() > 256
            || tenant_scope_hash
                .bytes()
                .any(|byte| byte.is_ascii_control())
        {
            return Err(
                "tenant scope hash must be non-empty, bounded, and control-free".to_string(),
            );
        }
        Ok(Self {
            tenant_scope_hash,
            client,
        })
    }
}

impl DriveWebsiteSdkClientResolver for FixedDriveWebsiteSdkClientResolver {
    fn resolve(
        &self,
        tenant_scope_hash: &str,
    ) -> WebsiteProviderResult<Arc<dyn DriveWebsiteSdkClient>> {
        if tenant_scope_hash != self.tenant_scope_hash {
            return Err(WebsiteProviderError::new(
                WebsiteProviderErrorKind::NotFound,
            ));
        }
        Ok(Arc::clone(&self.client))
    }
}

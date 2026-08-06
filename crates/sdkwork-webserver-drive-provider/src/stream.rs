use async_trait::async_trait;
use sdkwork_webserver_contract::provider::{
    WebsiteProviderContentStream, WebsiteProviderError, WebsiteProviderErrorKind,
    WebsiteProviderResult,
};

use crate::sdk::DriveContentChunkStream;

/// Forwards the SDK's bounded chunk stream while enforcing the expected
/// content length: the object must deliver exactly `expected_length` bytes,
/// otherwise the contract is violated (fail closed, no partial acceptance).
pub(crate) struct BoundedDriveContentStream {
    source: Option<Box<dyn DriveContentChunkStream>>,
    remaining: u64,
}

impl BoundedDriveContentStream {
    pub(crate) fn new(source: Box<dyn DriveContentChunkStream>, expected_length: u64) -> Self {
        Self {
            source: Some(source),
            remaining: expected_length,
        }
    }
}

#[async_trait]
impl WebsiteProviderContentStream for BoundedDriveContentStream {
    async fn next_chunk(&mut self) -> WebsiteProviderResult<Option<Vec<u8>>> {
        let Some(source) = self.source.as_mut() else {
            return Ok(None);
        };
        let chunk = source
            .next_chunk()
            .await
            .map_err(|_| WebsiteProviderError::new(WebsiteProviderErrorKind::ContractMismatch))?;
        match chunk {
            Some(bytes) => {
                let length = u64::try_from(bytes.len()).map_err(|_| {
                    WebsiteProviderError::new(WebsiteProviderErrorKind::ContractMismatch)
                })?;
                if length > self.remaining {
                    self.source = None;
                    return Err(WebsiteProviderError::new(
                        WebsiteProviderErrorKind::ContractMismatch,
                    ));
                }
                self.remaining -= length;
                Ok(Some(bytes))
            }
            None => {
                self.source = None;
                if self.remaining != 0 {
                    return Err(WebsiteProviderError::new(
                        WebsiteProviderErrorKind::ContractMismatch,
                    ));
                }
                Ok(None)
            }
        }
    }
}

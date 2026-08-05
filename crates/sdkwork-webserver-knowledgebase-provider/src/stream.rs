use async_trait::async_trait;
use sdkwork_webserver_contract::provider::{
    WebsiteProviderContentStream, WebsiteProviderError, WebsiteProviderErrorKind,
    WebsiteProviderResult,
};

use crate::sdk::WikiContentChunkStream;

/// Forwards the SDK's bounded chunk stream while enforcing the configured
/// byte ceiling: any chunk that would exceed the ceiling fails closed with a
/// contract mismatch instead of buffering the remainder.
pub(crate) struct BoundedWikiContentStream {
    source: Option<Box<dyn WikiContentChunkStream>>,
    remaining: u64,
}

impl BoundedWikiContentStream {
    pub(crate) fn new(source: Box<dyn WikiContentChunkStream>, maximum_bytes: u64) -> Self {
        Self {
            source: Some(source),
            remaining: maximum_bytes,
        }
    }
}

#[async_trait]
impl WebsiteProviderContentStream for BoundedWikiContentStream {
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
                Ok(None)
            }
        }
    }
}

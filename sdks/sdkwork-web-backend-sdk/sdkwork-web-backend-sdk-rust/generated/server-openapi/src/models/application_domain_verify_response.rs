use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ApplicationDomainVerifyResponse {
    pub verified: bool,

    #[serde(rename = "verifyToken")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub verify_token: Option<String>,
}

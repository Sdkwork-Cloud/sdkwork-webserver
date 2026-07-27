use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ApplicationDomainResponse {
    pub id: String,

    pub hostname: String,

    #[serde(rename = "isPrimary")]
    pub is_primary: bool,

    #[serde(rename = "isVerified")]
    pub is_verified: bool,

    #[serde(rename = "sslEnabled")]
    pub ssl_enabled: bool,

    #[serde(rename = "sslProvider")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ssl_provider: Option<String>,

    pub status: i64,

    #[serde(rename = "createdAt")]
    pub created_at: String,
}

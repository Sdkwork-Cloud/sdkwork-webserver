use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateCertificateRequest {
    #[serde(rename = "domainId")]
    pub domain_id: String,

    /// 1=Let's Encrypt, 3=self-signed. Custom import is a separate future workflow.
    #[serde(rename = "certType")]
    pub cert_type: i64,

    #[serde(rename = "autoRenew")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_renew: Option<bool>,
}

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct IssueCertificateRequest {
    /// Ordered exact or wildcard domain identifiers included in the certificate SAN extension.
    #[serde(rename = "domainIds")]
    pub domain_ids: Vec<String>,

    #[serde(rename = "certType")]
    pub cert_type: i64,

    #[serde(rename = "keyAlgorithm")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key_algorithm: Option<String>,

    #[serde(rename = "autoRenew")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_renew: Option<bool>,
}

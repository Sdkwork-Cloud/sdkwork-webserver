use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CertificateResponse {
    pub id: String,

    #[serde(rename = "certName")]
    pub cert_name: String,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub domain: Option<String>,

    #[serde(rename = "certType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cert_type: Option<i64>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub issuer: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fingerprint: Option<String>,

    #[serde(rename = "notBefore")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub not_before: Option<String>,

    #[serde(rename = "notAfter")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub not_after: Option<String>,

    #[serde(rename = "autoRenew")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_renew: Option<bool>,

    /// 0=idle, 1=renewing, 2=pending, 3=failed
    #[serde(rename = "renewalStatus")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub renewal_status: Option<i64>,

    /// 0=pending, 1=active, 2=expired, 3=revoked, 4=archived
    pub status: i64,

    #[serde(rename = "createdAt")]
    pub created_at: String,
}

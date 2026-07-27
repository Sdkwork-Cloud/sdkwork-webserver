use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateApplicationDeploymentRequest {
    #[serde(rename = "deployType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deploy_type: Option<i64>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub environment: Option<String>,

    #[serde(rename = "idempotencyKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub idempotency_key: Option<String>,
}

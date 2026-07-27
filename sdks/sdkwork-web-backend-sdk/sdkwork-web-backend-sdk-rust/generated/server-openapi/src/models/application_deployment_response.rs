use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ApplicationDeploymentResponse {
    pub id: String,

    #[serde(rename = "siteId")]
    pub site_id: String,

    pub status: i64,

    #[serde(rename = "deployType")]
    pub deploy_type: i64,

    #[serde(rename = "createdAt")]
    pub created_at: String,
}

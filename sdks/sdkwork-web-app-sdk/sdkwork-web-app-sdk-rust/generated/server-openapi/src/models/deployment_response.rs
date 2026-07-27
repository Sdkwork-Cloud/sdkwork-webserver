use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DeploymentResponse {
    pub id: String,

    #[serde(rename = "siteId")]
    pub site_id: String,

    #[serde(rename = "deployType")]
    pub deploy_type: i64,

    #[serde(rename = "versionTag")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version_tag: Option<String>,

    #[serde(rename = "commitHash")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub commit_hash: Option<String>,

    #[serde(rename = "sourceRef")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_ref: Option<String>,

    pub environment: String,

    #[serde(rename = "artifactDriveUri")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artifact_drive_uri: Option<String>,

    #[serde(rename = "artifactSize")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artifact_size: Option<String>,

    #[serde(rename = "artifactHash")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artifact_hash: Option<String>,

    pub status: i64,

    #[serde(rename = "startedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub started_at: Option<String>,

    #[serde(rename = "completedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<String>,

    /// Deployment duration in milliseconds as a string to avoid JavaScript precision loss.
    #[serde(rename = "durationMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<String>,

    #[serde(rename = "createdAt")]
    pub created_at: String,
}

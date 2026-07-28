use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateDeploymentRequest {
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

    /// Stable Drive resource identity. Signed delivery URLs are forbidden.
    #[serde(rename = "artifactDriveUri")]
    pub artifact_drive_uri: String,

    #[serde(rename = "artifactSize")]
    pub artifact_size: String,

    /// Lowercase SHA-256 hexadecimal digest of the uploaded package.
    #[serde(rename = "artifactHash")]
    pub artifact_hash: String,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub environment: Option<String>,
}

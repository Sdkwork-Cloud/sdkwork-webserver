use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateApplicationDeploymentRequest {
    #[serde(rename = "deployType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deploy_type: Option<i64>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub environment: Option<String>,

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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artifact_drive_uri: Option<String>,

    #[serde(rename = "artifactSize")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artifact_size: Option<String>,

    /// SHA-256 hexadecimal digest of the uploaded package.
    #[serde(rename = "artifactHash")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artifact_hash: Option<String>,
}

package types


type CreateApplicationDeploymentRequest struct {
	DeployType int `json:"deployType"`
	Environment string `json:"environment"`
	VersionTag string `json:"versionTag"`
	CommitHash string `json:"commitHash"`
	SourceRef string `json:"sourceRef"`
	ArtifactDriveUri string `json:"artifactDriveUri"`
	ArtifactSize string `json:"artifactSize"`
	ArtifactHash string `json:"artifactHash"`
}

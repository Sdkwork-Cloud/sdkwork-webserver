package types


type CreateDeploymentRequest struct {
	DeployType int `json:"deployType"`
	VersionTag string `json:"versionTag"`
	CommitHash string `json:"commitHash"`
	SourceRef string `json:"sourceRef"`
	ArtifactDriveUri string `json:"artifactDriveUri"`
	ArtifactSize string `json:"artifactSize"`
	ArtifactHash string `json:"artifactHash"`
	Environment string `json:"environment"`
}

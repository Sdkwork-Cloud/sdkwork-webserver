package types


type CreateApplicationDeploymentRequest struct {
	DeployType int `json:"deployType"`
	Environment string `json:"environment"`
	IdempotencyKey string `json:"idempotencyKey"`
}

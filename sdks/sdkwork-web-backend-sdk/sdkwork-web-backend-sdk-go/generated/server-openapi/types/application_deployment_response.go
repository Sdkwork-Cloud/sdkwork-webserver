package types


type ApplicationDeploymentResponse struct {
	Id string `json:"id"`
	SiteId string `json:"siteId"`
	Status int `json:"status"`
	DeployType int `json:"deployType"`
	CreatedAt string `json:"createdAt"`
}

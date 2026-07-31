package types


type CreateCertificateRequest struct {
	DomainIds []string `json:"domainIds"`
	CertType int `json:"certType"`
	KeyAlgorithm string `json:"keyAlgorithm"`
	AutoRenew bool `json:"autoRenew"`
}

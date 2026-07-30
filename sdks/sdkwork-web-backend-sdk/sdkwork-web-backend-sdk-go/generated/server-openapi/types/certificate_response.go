package types


type CertificateResponse struct {
	Id string `json:"id"`
	CertName string `json:"certName"`
	Domain string `json:"domain"`
	DomainId string `json:"domainId"`
	CertType int `json:"certType"`
	Issuer string `json:"issuer"`
	Fingerprint string `json:"fingerprint"`
	NotBefore string `json:"notBefore"`
	NotAfter string `json:"notAfter"`
	AutoRenew bool `json:"autoRenew"`
	RenewalStatus int `json:"renewalStatus"`
	Status int `json:"status"`
	CreatedAt string `json:"createdAt"`
}

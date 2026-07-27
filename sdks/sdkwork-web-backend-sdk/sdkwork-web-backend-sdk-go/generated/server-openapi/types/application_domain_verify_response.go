package types


type ApplicationDomainVerifyResponse struct {
	Verified bool `json:"verified"`
	VerifyToken string `json:"verifyToken"`
}

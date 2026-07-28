export interface CreateCertificateRequest {
  domainId: string;
  certType: 1 | 3;
  autoRenew?: boolean;
}

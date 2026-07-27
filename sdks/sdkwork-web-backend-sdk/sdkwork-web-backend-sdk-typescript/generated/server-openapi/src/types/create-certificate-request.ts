export interface CreateCertificateRequest {
  domainId: string;
  /** 1=Let's Encrypt, 3=self-signed. Custom import is a separate future workflow. */
  certType: 1 | 3;
  autoRenew?: boolean;
}

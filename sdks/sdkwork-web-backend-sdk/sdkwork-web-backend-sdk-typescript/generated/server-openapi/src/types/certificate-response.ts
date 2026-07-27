export interface CertificateResponse {
  id: string;
  certName: string;
  domain?: string;
  certType?: number;
  issuer?: string;
  fingerprint?: string;
  notBefore?: string;
  notAfter?: string;
  autoRenew?: boolean;
  /** 0=idle, 1=renewing, 2=pending, 3=failed */
  renewalStatus?: number;
  /** 0=pending, 1=active, 2=expired, 3=revoked, 4=archived */
  status: number;
  createdAt: string;
}

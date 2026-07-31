export interface CreateCertificateRequest {
  /** Ordered exact or wildcard domain identifiers included in the certificate SAN extension. */
  domainIds: string[];
  certType: 1 | 3;
  keyAlgorithm?: 'ECDSA' | 'RSA';
  autoRenew?: boolean;
}

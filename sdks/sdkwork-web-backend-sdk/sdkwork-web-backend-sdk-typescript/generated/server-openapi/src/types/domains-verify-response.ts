import type { ApplicationDomainVerifyResponse } from './application-domain-verify-response';

export interface DomainsVerifyResponse {
  code: 0;
  data: unknown & { item: ApplicationDomainVerifyResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}

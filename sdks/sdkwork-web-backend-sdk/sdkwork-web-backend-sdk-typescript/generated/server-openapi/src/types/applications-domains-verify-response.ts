import type { ApplicationDomainVerifyResponse } from './application-domain-verify-response';

export interface ApplicationsDomainsVerifyResponse {
  code: 0;
  data: unknown & { item: ApplicationDomainVerifyResponse; };
  /** Server-owned request correlation id. */
  traceId: string;
}

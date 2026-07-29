import type { PageInfo } from './page-info';
import type { SourceVersionResponse } from './source-version-response';

export interface SitesSourceVersionsListResponse {
  code: 0;
  data: unknown & { items: SourceVersionResponse[]; pageInfo: PageInfo; };
  /** Server-owned request correlation id. */
  traceId: string;
}

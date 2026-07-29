import type { ApplicationStoreListing } from './application-store-listing';

export interface UpdateSiteRequest {
  name?: string;
  description?: string;
  runtimeConfig?: Record<string, unknown>;
  storeListing?: ApplicationStoreListing;
}

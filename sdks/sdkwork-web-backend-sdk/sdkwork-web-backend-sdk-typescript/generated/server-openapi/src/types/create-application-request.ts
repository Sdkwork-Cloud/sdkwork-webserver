import type { ApplicationStoreListing } from './application-store-listing';

export interface CreateApplicationRequest {
  name: string;
  slug?: string;
  description?: string;
  applicationType: 'WEB' | 'API';
  siteType: number;
  runtimeConfig?: Record<string, unknown>;
  storeListing?: ApplicationStoreListing;
}

export interface CreateApplicationRequest {
  name: string;
  slug?: string;
  description?: string;
  applicationType: 'WEB' | 'API';
  siteType: number;
  runtimeConfig?: Record<string, unknown>;
}

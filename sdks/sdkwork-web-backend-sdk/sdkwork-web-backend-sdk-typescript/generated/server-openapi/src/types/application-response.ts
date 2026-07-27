export interface ApplicationResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  applicationType: 'WEB' | 'API';
  siteType: number;
  status: number;
  runtimeConfig?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

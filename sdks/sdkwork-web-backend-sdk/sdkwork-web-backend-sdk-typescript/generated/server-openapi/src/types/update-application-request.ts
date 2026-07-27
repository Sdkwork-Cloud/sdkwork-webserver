export interface UpdateApplicationRequest {
  name?: string;
  description?: string;
  runtimeConfig?: Record<string, unknown>;
}

export interface CreateApplicationDeploymentRequest {
  deployType?: 1 | 2 | 3 | 4;
  environment?: string;
  idempotencyKey?: string;
}

export interface DeploymentResponse {
  id: string;
  siteId: string;
  deployType: number;
  versionTag?: string;
  commitHash?: string;
  sourceRef?: string;
  environment: string;
  artifactDriveUri?: string;
  artifactSize?: string;
  artifactHash?: string;
  status: number;
  startedAt?: string;
  completedAt?: string;
  /** Deployment duration in milliseconds as a string to avoid JavaScript precision loss. */
  durationMs?: string;
  createdAt: string;
}

export interface ApplicationDeploymentResponse {
  id: string;
  siteId: string;
  status: number;
  deployType: number;
  environment: string;
  versionTag?: string;
  commitHash?: string;
  sourceRef?: string;
  artifactDriveUri?: string;
  artifactSize?: string;
  artifactHash?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: string;
  createdAt: string;
}

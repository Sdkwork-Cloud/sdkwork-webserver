export interface CreateApplicationDeploymentRequest {
  deployType?: 1 | 2 | 3 | 4;
  environment?: 'development' | 'test' | 'staging' | 'production';
  versionTag?: string;
  commitHash?: string;
  sourceRef?: string;
  /** Stable Drive resource identity. Signed delivery URLs are forbidden. */
  artifactDriveUri?: string;
  artifactSize?: string;
  /** Lowercase SHA-256 hexadecimal digest of the uploaded package. */
  artifactHash?: string;
}

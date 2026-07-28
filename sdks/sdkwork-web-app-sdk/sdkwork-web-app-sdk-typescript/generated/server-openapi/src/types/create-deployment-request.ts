export interface CreateDeploymentRequest {
  deployType: 1 | 2 | 3 | 4;
  versionTag?: string;
  commitHash?: string;
  sourceRef?: string;
  /** Stable Drive resource identity. Signed delivery URLs are forbidden. */
  artifactDriveUri?: string;
  artifactSize?: string;
  /** SHA-256 hexadecimal digest of the uploaded package. */
  artifactHash?: string;
  environment?: string;
}

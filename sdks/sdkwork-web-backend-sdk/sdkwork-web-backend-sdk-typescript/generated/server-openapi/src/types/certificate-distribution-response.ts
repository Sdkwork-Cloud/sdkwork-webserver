export interface CertificateDistributionResponse {
  serverId: string;
  serverName: string;
  host: string;
  desiredSyncVersion: string;
  appliedSyncVersion?: string;
  status: 'SYNCED' | 'PENDING' | 'OFFLINE';
  lastHeartbeatAt?: string;
}

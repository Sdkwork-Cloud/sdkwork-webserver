import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTopologyRuntime, loadTopologySpec } from '@sdkwork/app-topology';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const SPEC_PATH = path.join(REPO_ROOT, 'specs', 'topology.spec.json');
export const IAM_REPO_ROOT = path.resolve(REPO_ROOT, '..', 'sdkwork-iam');
export const DRIVE_REPO_ROOT = path.resolve(REPO_ROOT, '..', 'sdkwork-drive');

const spec = loadTopologySpec(SPEC_PATH);
const runtime = createTopologyRuntime(spec, REPO_ROOT);

export const IAM_APPLICATION_BOOTSTRAP_ENV = {
  SDKWORK_APP_ROOT: REPO_ROOT,
  SDKWORK_WEBSERVER_APP_ROOT: REPO_ROOT,
  SDKWORK_WEBSERVER_SERVER_APP_ROOT: REPO_ROOT,
  SDKWORK_IAM_APP_ROOT: IAM_REPO_ROOT,
  SDKWORK_DRIVE_APP_ROOT: DRIVE_REPO_ROOT,
};

export const VALID_DEPLOYMENT_PROFILES = runtime.deploymentProfileValues;
export const VALID_ENVIRONMENTS = runtime.environmentValues;
export const loadProfile = runtime.loadProfile;
export const mergeRuntimeEnv = runtime.mergeRuntimeEnv;
export const resolveIamDevEnv = runtime.resolveIamDevEnv;

export function canonicalizeWorkspaceDatabaseEnv(env) {
  const retiredKeys = Object.keys(env).filter((key) => {
    const retiredPrefixedKey = key.startsWith('SDKWORK_')
      && !key.startsWith('SDKWORK_DATABASE_')
      && key.includes('_DATABASE_');
    const retiredAlias = [
      'DATABASE_URL',
      'DATABASE_PROVIDER',
      'DATABASE_SSLMODE',
      'SDKWORK_DATABASE_PROVIDER',
      'SDKWORK_DATABASE_SSLMODE', // sdkwork-retired-database-key-rejection
    ].includes(key);
    return retiredPrefixedKey || retiredAlias;
  });
  if (retiredKeys.length > 0) {
    throw new Error(
      `retired database keys are not supported: ${retiredKeys.join(', ')}; use SDKWORK_DATABASE_*`,
    );
  }
  return { ...env };
}

export { runtime, spec };

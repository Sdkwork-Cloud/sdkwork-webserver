import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTopologyRuntime, loadTopologySpec } from '@sdkwork/app-topology';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const SPEC_PATH = path.join(REPO_ROOT, 'specs', 'topology.spec.json');
export const IAM_REPO_ROOT = path.resolve(REPO_ROOT, '..', 'sdkwork-iam');

const spec = loadTopologySpec(SPEC_PATH);
const runtime = createTopologyRuntime(spec, REPO_ROOT);

export const IAM_APPLICATION_BOOTSTRAP_ENV = {
  SDKWORK_APP_ROOT: REPO_ROOT,
  SDKWORK_WEB_APP_ROOT: REPO_ROOT,
  SDKWORK_WEB_SERVER_APP_ROOT: REPO_ROOT,
  SDKWORK_IAM_APP_ROOT: IAM_REPO_ROOT,
};

export const VALID_DEPLOYMENT_PROFILES = runtime.deploymentProfileValues;
export const VALID_ENVIRONMENTS = runtime.environmentValues;
export const loadProfile = runtime.loadProfile;
export const mergeRuntimeEnv = runtime.mergeRuntimeEnv;
export const resolveIamDevEnv = runtime.resolveIamDevEnv;

export { runtime, spec };
